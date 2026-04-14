#!/usr/bin/env node
/**
 * Generate domain model documentation from bundled OpenAPI specs.
 * Produces:
 *   1. Interactive HTML treeview (details/summary)
 *   2. Mermaid class diagram
 *
 * Usage: node scripts/generate-model-docs.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';

// ── Configuration ──────────────────────────────────────────────────
const APIS = [
  {
    name: 'Product',
    specPath: 'openapi/apis/product/generated/product-api.yaml',
    // Domain schemas to include (exclude Response envelopes/pagination/shared)
    domainFilter: name =>
      !name.endsWith('Response') &&
      !name.startsWith('Bulk') &&
      !['ProblemDetails', 'ValidationProblemDetails', 'TechnicalId',
        'CursorPaginationMetadata', 'Gln', 'Gtin', 'LanguageCode'].includes(name),
    // Single root: the full product as returned by GET /products/{gln}/{mpn}
    root: 'ProductResponseData',
    rootLabel: 'Product',
  },
  {
    name: 'TradeItem',
    specPath: 'openapi/apis/tradeitem/generated/tradeitem-api.yaml',
    domainFilter: name =>
      !name.endsWith('Response') &&
      !name.startsWith('Bulk') &&
      !['ProblemDetails', 'ValidationProblemDetails', 'TechnicalId',
        'CursorPaginationMetadata', 'Gln', 'Gtin', 'LanguageCode'].includes(name),
    // Single root: the full trade item as returned by GET /trade-items/{gln}/{itemNumber}
    root: 'TradeItemResponseData',
    rootLabel: 'Trade Item',
  },
];

const OUT_DIR = '_test-site';

// ── Helpers ────────────────────────────────────────────────────────

function resolveRef(ref) {
  return ref.replace('#/components/schemas/', '');
}

function typeLabel(prop) {
  if (prop.$ref) return resolveRef(prop.$ref);
  if (prop.anyOf || prop.oneOf) {
    const variants = (prop.anyOf || prop.oneOf)
      .map(v => v.$ref ? resolveRef(v.$ref) : v.type || '?')
      .flat();
    return variants.join(' | ');
  }
  const t = prop.type;
  if (Array.isArray(t)) return t.join(' | ');
  if (t === 'array') {
    if (prop.items?.$ref) return resolveRef(prop.items.$ref) + '[]';
    if (prop.items?.type) {
      const it = Array.isArray(prop.items.type)
        ? prop.items.type.join('|')
        : prop.items.type;
      return it + '[]';
    }
    return 'array';
  }
  return t || 'any';
}

function shortDesc(desc) {
  if (!desc) return '';
  // Take the first sentence, strip ETIM xChange path references
  const first = desc.split(/\n\n/)[0].replace(/\s+/g, ' ').trim();
  // Remove markdown bold and ETIM path references
  const clean = first
    .replace(/\*\*ETIM xChange\*\*:.*$/i, '')
    .replace(/\*\*Path\*\*:.*$/i, '')
    .replace(/\*\*/g, '')
    .trim();
  return clean.length > 120 ? clean.slice(0, 117) + '…' : clean;
}

function isRef(prop) {
  if (prop.$ref) return resolveRef(prop.$ref);
  const t = prop.type;
  const isArray = t === 'array' || (Array.isArray(t) && t.includes('array'));
  if (isArray && prop.items?.$ref) return resolveRef(prop.items.$ref);
  if (prop.anyOf) {
    const refs = prop.anyOf.filter(v => v.$ref).map(v => resolveRef(v.$ref));
    return refs[0] || null;
  }
  return null;
}

function isEnum(schema) {
  return schema?.enum || schema?.const !== undefined;
}

// ── Tree HTML generation ───────────────────────────────────────────

function renderPropertyHtml(name, prop, schemas, required, visited) {
  const tl = typeLabel(prop);
  const req = required ? '<span class="req">required</span>' : '';
  const desc = shortDesc(prop.description);
  const descHtml = desc ? `<span class="desc">${escHtml(desc)}</span>` : '';
  const refName = isRef(prop);

  // Format info
  const format = prop.format ? `<span class="fmt">${prop.format}</span>` : '';
  const constraints = [];
  if (prop.minLength !== undefined) constraints.push(`min: ${prop.minLength}`);
  if (prop.maxLength !== undefined) constraints.push(`max: ${prop.maxLength}`);
  if (prop.minimum !== undefined) constraints.push(`≥ ${prop.minimum}`);
  if (prop.maximum !== undefined) constraints.push(`≤ ${prop.maximum}`);
  if (prop.pattern) constraints.push(`pattern`);
  const constraintHtml = constraints.length
    ? `<span class="constraint">${constraints.join(', ')}</span>` : '';

  if (refName && schemas[refName] && !isEnum(schemas[refName]) && !visited.has(refName)) {
    // Expandable nested schema
    const nested = renderSchemaHtml(refName, schemas, new Set(visited));
    return `<details class="prop">
  <summary><span class="pname">${escHtml(name)}</span><span class="ptype ref-type">${escHtml(tl)}</span>${format}${req}${constraintHtml}${descHtml}</summary>
  ${nested}
</details>`;
  }

  // Enum values
  let enumHtml = '';
  if (refName && schemas[refName] && isEnum(schemas[refName])) {
    const vals = schemas[refName].enum || [schemas[refName].const];
    enumHtml = `<span class="enum-vals">${vals.map(v => escHtml(String(v))).join(' | ')}</span>`;
  }
  if (prop.enum) {
    enumHtml = `<span class="enum-vals">${prop.enum.map(v => escHtml(String(v))).join(' | ')}</span>`;
  }

  return `<div class="prop leaf">
  <span class="pname">${escHtml(name)}</span><span class="ptype">${escHtml(tl)}</span>${format}${req}${constraintHtml}${enumHtml}${descHtml}
</div>`;
}

function renderSchemaHtml(name, schemas, visited = new Set()) {
  const schema = schemas[name];
  if (!schema || visited.has(name)) return `<div class="circular">↻ ${escHtml(name)}</div>`;
  visited.add(name);

  const props = schema.properties || {};
  const requiredSet = new Set(schema.required || []);
  const desc = shortDesc(schema.description);

  let html = `<div class="schema-block">`;
  if (desc) html += `<div class="schema-desc">${escHtml(desc)}</div>`;

  const sortedProps = Object.keys(props).sort((a, b) => {
    // Required first, preserve YAML source order within each group
    const aReq = requiredSet.has(a) ? 0 : 1;
    const bReq = requiredSet.has(b) ? 0 : 1;
    return aReq - bReq;
  });

  for (const pName of sortedProps) {
    html += renderPropertyHtml(pName, props[pName], schemas, requiredSet.has(pName), visited);
  }
  html += `</div>`;
  return html;
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Mermaid generation ─────────────────────────────────────────────

function collectReachable(root, schemas, visited = new Set()) {
  if (visited.has(root) || !schemas[root]) return visited;
  const schema = schemas[root];
  // Skip leaf types (enums, simple string patterns, etc.) — they have no properties
  if (!schema.properties) return visited;
  visited.add(root);
  for (const pDef of Object.values(schema.properties)) {
    const ref = isRef(pDef);
    if (ref && schemas[ref]) collectReachable(ref, schemas, visited);
  }
  return visited;
}

function generateMermaid(apiName, schemas, root) {
  const reachable = collectReachable(root, schemas);
  let mmd = `classDiagram\n  direction TB\n`;

  for (const name of reachable) {
    const schema = schemas[name];
    if (!schema?.properties) continue;

    const props = schema.properties;
    const requiredSet = new Set(schema.required || []);

    mmd += `  class ${name} {\n`;
    for (const [pName, pDef] of Object.entries(props)) {
      const tl = typeLabel(pDef).replace(/[<>]/g, '');
      const req = requiredSet.has(pName) ? '\u2731' : '';
      mmd += `    ${tl} ${pName}${req}\n`;
    }
    mmd += `  }\n`;

    // Relationships
    for (const [pName, pDef] of Object.entries(props)) {
      const refName = isRef(pDef);
      if (refName && reachable.has(refName)) {
        const isArray = pDef.type === 'array' || (Array.isArray(pDef.type) && pDef.type.includes('array'));
        const card = isArray ? '"*"' : '"1"';
        mmd += `  ${name} --> ${card} ${refName} : ${pName}\n`;
      }
    }
  }
  return mmd;
}

// ── Page templates ─────────────────────────────────────────────────

function treePageHtml(apiName, apiKey, schemasHtml, rootNames) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${apiName} — Domain Model Tree</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --blue-900: #0a1628; --blue-800: #0f2440; --blue-700: #143a64; --blue-600: #1a5590;
  --blue-500: #2176cc; --blue-400: #4a9aea; --blue-300: #8ec4f6;
  --cyan-500: #00b4d8; --cyan-400: #48cae4; --cyan-100: #e0f7fa;
  --amber-500: #f59e0b; --amber-100: #fef3c7; --amber-600: #d97706;
  --green-500: #10b981; --green-100: #d1fae5; --green-700: #15803d;
  --red-500: #ef4444; --red-600: #dc2626;
  --gray-50: #f8fafc; --gray-100: #f1f5f9; --gray-200: #e2e8f0; --gray-300: #cbd5e1;
  --gray-400: #94a3b8; --gray-500: #64748b; --gray-600: #475569; --gray-700: #334155;
  --gray-800: #1e293b; --gray-900: #0f172a;
  --white: #ffffff; --radius: 10px;
  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'DM Sans', system-ui, sans-serif; color: var(--gray-800);
  line-height: 1.65; background: var(--gray-50); -webkit-font-smoothing: antialiased;
}

/* ── Nav (matches index.html) ── */
.nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--gray-200);
}
.nav-inner {
  max-width: 1060px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.65rem 1.5rem;
}
.nav-brand {
  font-family: 'Sora', sans-serif; font-weight: 700; font-size: 0.95rem;
  color: var(--blue-700); text-decoration: none;
}
.nav-links { display: flex; gap: 1.5rem; list-style: none; align-items: center; }
.nav-links a {
  font-size: 0.82rem; font-weight: 500; color: var(--gray-600);
  text-decoration: none; transition: color 0.15s;
}
.nav-links a:hover { color: var(--blue-500); }
.nav-links a.active { color: var(--blue-700); font-weight: 600; }
.nav-sep { color: var(--gray-300); font-weight: 300; font-size: 0.82rem; }

/* ── Content ── */
.container { max-width: 1060px; margin: 0 auto; padding: 1.5rem; }
h2.api-title {
  font-family: 'Sora', sans-serif; font-size: 1.3rem; font-weight: 700;
  color: var(--gray-900); margin-bottom: 0.25rem;
}
.api-subtitle { font-size: 0.85rem; color: var(--gray-500); margin-bottom: 1rem; }
.toolbar {
  display: flex; gap: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; align-items: center;
}
.toolbar button {
  font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 500;
  padding: 0.3rem 0.7rem; border: 1px solid var(--gray-300); border-radius: 7px;
  background: var(--white); color: var(--gray-600); cursor: pointer; transition: all 0.15s;
}
.toolbar button:hover { border-color: var(--blue-400); color: var(--blue-500); }
.legend {
  display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.72rem;
  margin-bottom: 1.25rem; color: var(--gray-500);
}
.legend span { display: inline-flex; align-items: center; gap: 0.3rem; }

/* ── Root sections ── */
.root-section { margin-bottom: 1.5rem; }
.root-section > details {
  border: 1px solid var(--gray-200); border-radius: var(--radius);
  background: var(--white); overflow: hidden;
}
.root-section > details > summary {
  font-family: 'Sora', sans-serif; font-size: 0.95rem; font-weight: 700;
  color: var(--gray-900); padding: 0.85rem 1rem; cursor: pointer; list-style: none;
  display: flex; align-items: center; gap: 0.5rem; background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200); user-select: none;
}
.root-section > details > summary::before {
  content: '▶'; font-size: 0.65rem; color: var(--gray-400);
  transition: transform 0.15s; display: inline-block; width: 1em;
}
.root-section > details[open] > summary::before { transform: rotate(90deg); }
.root-section > details > summary:hover { background: var(--gray-100); }
.root-section > details > .schema-block { padding: 0.5rem 0.75rem 0.75rem; }

/* ── Schema blocks ── */
.schema-block { padding-left: 0.5rem; }
.schema-desc {
  font-size: 0.78rem; color: var(--gray-500); margin-bottom: 0.5rem;
  padding: 0.4rem 0.6rem; background: var(--gray-50); border-radius: 6px;
  border: 1px solid var(--gray-100);
}

/* ── Properties ── */
.prop { border-left: 2px solid var(--gray-200); margin-left: 0.25rem; padding-left: 0.75rem; margin-top: 2px; }
.prop.leaf {
  padding: 0.3rem 0 0.3rem 0.75rem; font-size: 0.82rem;
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.35rem;
}
details.prop > summary {
  font-size: 0.82rem; padding: 0.35rem 0; cursor: pointer; list-style: none;
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.35rem; user-select: none;
}
details.prop > summary::before { content: '▸'; color: var(--gray-400); font-size: 0.7rem; margin-right: 0.15rem; display: inline-block; width: 0.7em; }
details.prop[open] > summary::before { content: '▾'; }
details.prop > .schema-block { margin-top: 0.15rem; margin-bottom: 0.35rem; }

.pname { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; font-weight: 500; color: var(--gray-900); }
.ptype { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--blue-500); background: var(--gray-100); padding: 0.1rem 0.4rem; border-radius: 4px; }
.ptype.ref-type { color: var(--cyan-500); background: var(--cyan-100); }
.req { font-size: 0.65rem; font-weight: 600; color: var(--red-600); text-transform: uppercase; letter-spacing: 0.04em; }
.fmt { font-size: 0.68rem; color: var(--amber-600); font-style: italic; }
.constraint { font-size: 0.68rem; color: var(--gray-400); }
.enum-vals { font-size: 0.7rem; color: var(--green-700); font-family: 'JetBrains Mono', monospace; }
.desc { font-size: 0.75rem; color: var(--gray-500); flex-basis: 100%; padding-left: 1rem; margin-top: 0.1rem; }
.circular { font-size: 0.78rem; color: var(--gray-400); font-style: italic; padding: 0.25rem 0 0.25rem 0.75rem; }

/* ── Footer ── */
.footer {
  border-top: 1px solid var(--gray-200); padding: 1.5rem;
  text-align: center; font-size: 0.78rem; color: var(--gray-400);
}
.footer a { color: var(--blue-500); text-decoration: none; }
.footer a:hover { text-decoration: underline; }

@media (max-width: 700px) { .nav-links { display: none; } .container { padding: 1rem; } }
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-inner">
    <a href="../" class="nav-brand">Product Data OpenAPI</a>
    <ul class="nav-links">
      <li><a href="${apiKey}-tree.html" class="active">Treeview</a></li>
      <li><a href="${apiKey}-diagram.html">Diagram</a></li>
      <li><span class="nav-sep">|</span></li>
      <li><a href="../">Home</a></li>
    </ul>
  </div>
</nav>
<div class="container">
  <h2 class="api-title">${apiName} Domain Model</h2>
  <p class="api-subtitle">Interactive treeview — generated from the OpenAPI specification.</p>
  <div class="toolbar">
    <button onclick="document.querySelectorAll('details').forEach(d=>d.open=true)">Expand All</button>
    <button onclick="document.querySelectorAll('details').forEach(d=>d.open=false)">Collapse All</button>
  </div>
  <div class="legend">
    <span><span class="ptype" style="font-size:.68rem">type</span> data type</span>
    <span><span class="ptype ref-type" style="font-size:.68rem">Schema</span> nested schema (click to expand)</span>
    <span><span class="req" style="font-size:.68rem">REQUIRED</span> required field</span>
    <span><span class="fmt" style="font-size:.68rem">format</span> format hint</span>
    <span><span class="enum-vals" style="font-size:.68rem">A | B</span> enum values</span>
  </div>
  ${schemasHtml}
</div>
<footer class="footer">
  <p>Product Data OpenAPI · <a href="https://github.com/2BABV/product-data-openapi">GitHub</a> · Maintained by <a href="https://www.2ba.nl">2BA</a></p>
</footer>
</body>
</html>`;
}

function mermaidPageHtml(apiName, apiKey, mermaidCode) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${apiName} — Domain Model Diagram</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --blue-900: #0a1628; --blue-800: #0f2440; --blue-700: #143a64; --blue-600: #1a5590;
  --blue-500: #2176cc; --blue-400: #4a9aea; --blue-300: #8ec4f6;
  --cyan-500: #00b4d8; --cyan-400: #48cae4; --cyan-100: #e0f7fa;
  --gray-50: #f8fafc; --gray-100: #f1f5f9; --gray-200: #e2e8f0; --gray-300: #cbd5e1;
  --gray-400: #94a3b8; --gray-500: #64748b; --gray-600: #475569; --gray-700: #334155;
  --gray-800: #1e293b; --gray-900: #0f172a;
  --white: #ffffff; --radius: 10px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'DM Sans', system-ui, sans-serif; color: var(--gray-800);
  line-height: 1.65; background: var(--gray-50); -webkit-font-smoothing: antialiased;
}

/* ── Nav (matches index.html) ── */
.nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--gray-200);
}
.nav-inner {
  max-width: 1060px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.65rem 1.5rem;
}
.nav-brand {
  font-family: 'Sora', sans-serif; font-weight: 700; font-size: 0.95rem;
  color: var(--blue-700); text-decoration: none;
}
.nav-links { display: flex; gap: 1.5rem; list-style: none; align-items: center; }
.nav-links a {
  font-size: 0.82rem; font-weight: 500; color: var(--gray-600);
  text-decoration: none; transition: color 0.15s;
}
.nav-links a:hover { color: var(--blue-500); }
.nav-links a.active { color: var(--blue-700); font-weight: 600; }
.nav-sep { color: var(--gray-300); font-weight: 300; font-size: 0.82rem; }

/* ── Content ── */
.diagram-header {
  max-width: 1060px; margin: 0 auto; padding: 1.5rem 1.5rem 0;
}
.diagram-header h2 {
  font-family: 'Sora', sans-serif; font-size: 1.3rem; font-weight: 700;
  color: var(--gray-900); margin-bottom: 0.25rem;
}
.subtitle { font-size: 0.85rem; color: var(--gray-500); margin-bottom: 0.75rem; }
.zoom-toolbar {
  display: flex; gap: 0.4rem; align-items: center; margin-bottom: 0.75rem;
}
.zoom-toolbar button {
  font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 500;
  padding: 0.3rem 0.6rem; border: 1px solid var(--gray-300); border-radius: 7px;
  background: var(--white); color: var(--gray-600); cursor: pointer; transition: all 0.15s;
}
.zoom-toolbar button:hover { border-color: var(--blue-400); color: var(--blue-500); }
.zoom-label { font-size: 0.75rem; color: var(--gray-400); margin-left: 0.25rem; }
.zoom-hint { font-size: 0.72rem; color: var(--gray-400); margin-left: 0.75rem; }

#viewport {
  position: relative; overflow: hidden; cursor: grab;
  background: var(--white); border: 1px solid var(--gray-200); border-radius: var(--radius);
  width: 100%; height: calc(100vh - 200px); min-height: 400px;
}
#diagram-wrapper {
  transform-origin: 0 0; position: absolute; top: 0; left: 0;
}

/* ── Footer ── */
.footer {
  border-top: 1px solid var(--gray-200); padding: 1.5rem;
  text-align: center; font-size: 0.78rem; color: var(--gray-400);
}
.footer a { color: var(--blue-500); text-decoration: none; }
.footer a:hover { text-decoration: underline; }

@media (max-width: 700px) { .nav-links { display: none; } }
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-inner">
    <a href="../" class="nav-brand">Product Data OpenAPI</a>
    <ul class="nav-links">
      <li><a href="${apiKey}-tree.html">Treeview</a></li>
      <li><a href="${apiKey}-diagram.html" class="active">Diagram</a></li>
      <li><span class="nav-sep">|</span></li>
      <li><a href="../">Home</a></li>
    </ul>
  </div>
</nav>
<div class="diagram-header">
  <h2>${apiName} Domain Model</h2>
  <p class="subtitle">Class diagram showing schema relationships — generated from the OpenAPI specification.</p>
  <div class="zoom-toolbar">
    <button id="btn-in">Zoom In</button>
    <button id="btn-out">Zoom Out</button>
    <button id="btn-reset">Reset</button>
    <span class="zoom-label" id="zoom-level">100%</span>
    <span class="zoom-hint">Scroll to zoom · Drag to pan</span>
  </div>
</div>
<div id="viewport">
  <div id="diagram-wrapper">
    <pre class="mermaid">
${mermaidCode}
    </pre>
  </div>
</div>
<footer class="footer">
  <p>Product Data OpenAPI · <a href="https://github.com/2BABV/product-data-openapi">GitHub</a> · Maintained by <a href="https://www.2ba.nl">2BA</a></p>
</footer>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: false, theme: 'default',
    themeVariables: { fontSize: '13px' },
    classDiagram: { useMaxWidth: false }
  });
  await mermaid.run();

  const vp = document.getElementById('viewport');
  const wrapper = document.getElementById('diagram-wrapper');
  const label = document.getElementById('zoom-level');

  // Center the diagram in the viewport
  var vpRect = vp.getBoundingClientRect();
  var wRect = wrapper.getBoundingClientRect();
  let panX = (vpRect.width - wRect.width) / 2;
  let panY = (vpRect.height - wRect.height) / 2;
  let scale = 1, dragging = false, startX, startY;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function apply() {
    wrapper.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + scale + ')';
    label.textContent = Math.round(scale * 100) + '%';
  }
  apply();

  vp.addEventListener('wheel', function(e) {
    e.preventDefault();
    var rect = vp.getBoundingClientRect();
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    var prev = scale;
    scale = clamp(scale * (e.deltaY > 0 ? 0.9 : 1.1), 0.1, 10);
    panX = mx - (mx - panX) * (scale / prev);
    panY = my - (my - panY) * (scale / prev);
    apply();
  }, { passive: false });

  vp.addEventListener('pointerdown', function(e) {
    if (e.button !== 0) return;
    dragging = true; startX = e.clientX - panX; startY = e.clientY - panY;
    vp.setPointerCapture(e.pointerId);
    vp.style.cursor = 'grabbing';
  });
  vp.addEventListener('pointermove', function(e) {
    if (!dragging) return;
    panX = e.clientX - startX; panY = e.clientY - startY;
    apply();
  });
  vp.addEventListener('pointerup', function() {
    dragging = false; vp.style.cursor = 'grab';
  });

  document.getElementById('btn-in').addEventListener('click', function() {
    scale = clamp(scale * 1.25, 0.1, 10); apply();
  });
  document.getElementById('btn-out').addEventListener('click', function() {
    scale = clamp(scale * 0.8, 0.1, 10); apply();
  });
  document.getElementById('btn-reset').addEventListener('click', function() {
    scale = 1;
    var r = vp.getBoundingClientRect(), w = wrapper.getBoundingClientRect();
    panX = (r.width - w.width / (w.width ? scale : 1)) / 2;
    panY = (r.height - w.height / (w.height ? scale : 1)) / 2;
    // Recalc from original size
    wrapper.style.transform = 'none';
    var orig = wrapper.getBoundingClientRect();
    panX = (r.width - orig.width) / 2;
    panY = (r.height - orig.height) / 2;
    apply();
  });
</script>
</body>
</html>`;
}

// ── Index page ─────────────────────────────────────────────────────

function indexPageHtml(apis) {
  const cards = apis.map(a => `
    <div class="card">
      <h3>${a.name}</h3>
      <p class="card-desc">Explore the ${a.name} domain model as an interactive tree or class diagram.</p>
      <div class="links">
        <a href="${a.name.toLowerCase()}-tree.html">Treeview</a>
        <a href="${a.name.toLowerCase()}-diagram.html">Diagram</a>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Domain Models — Product Data OpenAPI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --blue-700: #143a64; --blue-500: #2176cc; --blue-400: #4a9aea;
  --gray-50: #f8fafc; --gray-100: #f1f5f9; --gray-200: #e2e8f0; --gray-300: #cbd5e1;
  --gray-400: #94a3b8; --gray-500: #64748b; --gray-600: #475569;
  --gray-800: #1e293b; --gray-900: #0f172a;
  --white: #ffffff; --radius: 10px;
  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'DM Sans', system-ui, sans-serif; color: var(--gray-800);
  line-height: 1.65; background: var(--gray-50); -webkit-font-smoothing: antialiased;
}

/* ── Nav (matches index.html) ── */
.nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--gray-200);
}
.nav-inner {
  max-width: 1060px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.65rem 1.5rem;
}
.nav-brand {
  font-family: 'Sora', sans-serif; font-weight: 700; font-size: 0.95rem;
  color: var(--blue-700); text-decoration: none;
}
.nav-links { display: flex; gap: 1.5rem; list-style: none; align-items: center; }
.nav-links a {
  font-size: 0.82rem; font-weight: 500; color: var(--gray-600);
  text-decoration: none; transition: color 0.15s;
}
.nav-links a:hover { color: var(--blue-500); }
.nav-sep { color: var(--gray-300); font-weight: 300; font-size: 0.82rem; }

/* ── Content ── */
.container { max-width: 1060px; margin: 0 auto; padding: 2.5rem 1.5rem; }
.section-title {
  font-family: 'Sora', sans-serif; font-size: 1.35rem; font-weight: 700;
  color: var(--gray-900); margin-bottom: 0.5rem;
}
.section-desc { color: var(--gray-500); font-size: 0.92rem; margin-bottom: 1.5rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
.card {
  background: var(--white); border: 1px solid var(--gray-200); border-radius: var(--radius);
  padding: 1.5rem; box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s, border-color 0.2s;
}
.card:hover { box-shadow: var(--shadow-md); border-color: var(--blue-400); }
.card h3 {
  font-family: 'Sora', sans-serif; font-size: 1.1rem; font-weight: 700;
  color: var(--gray-900); margin-bottom: 0.35rem;
}
.card-desc { color: var(--gray-500); font-size: 0.85rem; margin-bottom: 1rem; }
.links { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.links a {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.4rem 0.9rem; border-radius: 7px;
  font-size: 0.82rem; font-weight: 500; text-decoration: none;
  transition: all 0.15s; cursor: pointer;
  border: 1px solid var(--gray-300); color: var(--gray-600); background: var(--white);
}
.links a:hover { border-color: var(--blue-400); color: var(--blue-500); }

/* ── Footer ── */
.footer {
  border-top: 1px solid var(--gray-200); padding: 1.5rem;
  text-align: center; font-size: 0.78rem; color: var(--gray-400);
}
.footer a { color: var(--blue-500); text-decoration: none; }
.footer a:hover { text-decoration: underline; }

@media (max-width: 700px) { .nav-links { display: none; } .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-inner">
    <a href="../" class="nav-brand">Product Data OpenAPI</a>
    <ul class="nav-links">
      <li><a href="../">Home</a></li>
    </ul>
  </div>
</nav>
<div class="container">
  <h1 class="section-title">Domain Models</h1>
  <p class="section-desc">Choose an API and visualization style.</p>
  <div class="grid">${cards}</div>
</div>
<footer class="footer">
  <p>Product Data OpenAPI · <a href="https://github.com/2BABV/product-data-openapi">GitHub</a> · Maintained by <a href="https://www.2ba.nl">2BA</a></p>
</footer>
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

for (const api of APIS) {
  console.log(`Processing ${api.name}...`);
  const raw = readFileSync(api.specPath, 'utf8');
  const spec = yaml.load(raw);
  const allSchemas = spec.components?.schemas || {};

  // Filter to domain schemas
  const domainNames = Object.keys(allSchemas).filter(api.domainFilter);
  const domainSchemas = {};
  for (const n of domainNames) domainSchemas[n] = allSchemas[n];

  // ── Tree HTML ──
  // Single root: the full model as returned by the API
  const rootSchema = domainSchemas[api.root] || allSchemas[api.root];
  let treeSections = '';
  if (rootSchema) {
    const inner = renderSchemaHtml(api.root, { ...domainSchemas, [api.root]: rootSchema });
    treeSections = `<div class="root-section"><details open>
  <summary>${api.rootLabel}</summary>
  ${inner}
</details></div>\n`;
  }

  const apiKey = api.name.toLowerCase();

  const treeHtml = treePageHtml(api.name, apiKey, treeSections, api.rootLabel);
  writeFileSync(`${OUT_DIR}/${apiKey}-tree.html`, treeHtml);
  console.log(`  → ${apiKey}-tree.html`);

  // ── Mermaid diagram ──
  const mermaid = generateMermaid(api.name, allSchemas, api.root);
  const diagramHtml = mermaidPageHtml(api.name, apiKey, mermaid);
  writeFileSync(`${OUT_DIR}/${apiKey}-diagram.html`, diagramHtml);
  console.log(`  → ${apiKey}-diagram.html`);
}

// Index page
writeFileSync(`${OUT_DIR}/index.html`, indexPageHtml(APIS));
console.log(`\nDone. Serve with: npx http-server ${OUT_DIR} -p 8765 -c-1`);
