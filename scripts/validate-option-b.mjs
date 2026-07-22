#!/usr/bin/env node
/**
 * Option B contract validator.
 *
 * Enforces the "Option B" nullability contract described in the Option B
 * contract matrix. Runs entirely on the checked-in YAML sources (js-yaml) plus,
 * when present, the generated REST/domain bundles. It never mutates any file.
 *
 * What it asserts:
 *   1. Nullable schema locations are restricted to the explicit allowlist.
 *      A "nullable location" is any schema node that admits JSON `null`
 *      (`type: [..., "null"]`, a `type: "null"` composition branch, or the
 *      deprecated `nullable: true`). Only the exact file/component + top-level
 *      property pairs in NULLABLE_ALLOWLIST may be nullable.
 *   2. Ordinary enums must not include a literal `null` member.
 *   3. Ordinary optional examples must not emit `null`. Examples MAY emit `null`
 *      only for allowlisted aggregate/singular-response and pagination
 *      properties, resolved against the schema that owns the example.
 *   4. `TradeItemPricingSummary` declares the exact `dependentRequired` map, and
 *      its schema/wrapper/path examples follow the flattened LEFT JOIN contract:
 *      rows without an allowance/surcharge omit all seven allowance fields, and
 *      rows carrying an allowance/surcharge include indicator + type.
 *
 * Design notes:
 *   - Generated bundles are validated only when present (they are git-ignored and
 *     may be absent before `npm run bundle`). Their absence is reported, not
 *     failed.
 *   - Every finding carries the source file, a JSON path, and the offending
 *     property so the report is directly actionable.
 *   - Exit code is 1 when any contract finding is present, 0 otherwise. A missing
 *     required source file or a YAML parse error is a hard (blocking) error and
 *     also exits 1.
 *
 * Usage: node scripts/validate-option-b.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

// ── Contract data ──────────────────────────────────────────────────

/**
 * Explicit allowlist of nullable schema locations, keyed by schema base name
 * (source filename without extension, which is also the bundled component name).
 * The value is the set of top-level property names that may be nullable.
 */
const NULLABLE_ALLOWLIST = {
  ProductResponseData: ['descriptions', 'etimClassifications', 'attachments'],
  TradeItemResponseData: [
    'descriptions',
    'pricings',
    'relations',
    'logisticDetails',
    'attachments',
    'packagingUnits',
  ],
  ProductDetailsResponseData: ['details'],
  ProductLcaEnvironmentalResponseData: ['lcaEnvironmental'],
  TradeItemDetailsResponseData: ['details'],
  TradeItemOrderingResponseData: ['ordering'],
  CursorPaginationMetadata: ['cursor', 'prevCursor', 'estimatedTotal'],
};

/** Exact dependentRequired contract for the flattened pricing summary. */
const EXPECTED_DEPENDENT_REQUIRED = {
  allowanceSurchargeIndicator: ['allowanceSurchargeType'],
  allowanceSurchargeType: ['allowanceSurchargeIndicator'],
  allowanceSurchargeSequenceNumber: [
    'allowanceSurchargeIndicator',
    'allowanceSurchargeType',
  ],
  allowanceSurchargeValidityDate: [
    'allowanceSurchargeIndicator',
    'allowanceSurchargeType',
  ],
  allowanceSurchargeAmount: [
    'allowanceSurchargeIndicator',
    'allowanceSurchargeType',
  ],
  allowanceSurchargePercentage: [
    'allowanceSurchargeIndicator',
    'allowanceSurchargeType',
  ],
  allowanceSurchargeMinimumQuantity: [
    'allowanceSurchargeIndicator',
    'allowanceSurchargeType',
  ],
};

/** The seven flattened allowance/surcharge fields. */
const ALLOWANCE_FIELDS = Object.keys(EXPECTED_DEPENDENT_REQUIRED);

// Source roots scanned with the generic contract checks.
const SOURCE_SCHEMA_ROOTS = [
  'openapi/apis/product/schemas',
  'openapi/apis/tradeitem/schemas',
  'openapi/shared/schemas',
];

// Path roots scanned for example / enum / inline nullable violations.
const SOURCE_PATH_ROOTS = [
  'openapi/apis/product/paths',
  'openapi/apis/tradeitem/paths',
];

// Generated bundles validated only when present.
const GENERATED_BUNDLES = [
  'openapi/apis/product/generated/product-api.yaml',
  'openapi/apis/product/generated/product-domain-api.yaml',
  'openapi/apis/tradeitem/generated/tradeitem-api.yaml',
  'openapi/apis/tradeitem/generated/tradeitem-domain-api.yaml',
];

// Pricing contract source touchpoints (must exist).
const PRICING_SCHEMA_FILE =
  'openapi/apis/tradeitem/schemas/domain/TradeItemPricingSummary.yaml';
const PRICING_WRAPPER_FILE =
  'openapi/apis/tradeitem/schemas/responses/BulkTradeItemPricingsResponse.yaml';
const PRICING_PATH_FILE = 'openapi/apis/tradeitem/paths/bulk/pricings.yaml';

// ── Finding + reporting helpers ────────────────────────────────────

const findings = []; // contract findings (soft failures)
const blockers = []; // parse errors / missing required files (hard failures)

function addFinding(category, file, jsonPath, message) {
  findings.push({ category, file, jsonPath, message });
}

function addBlocker(file, message) {
  blockers.push({ file, message });
}

// ── Generic value helpers ──────────────────────────────────────────

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function toPosix(p) {
  return p.split(sep).join(posix.sep);
}

function getPath(obj, keys) {
  let cur = obj;
  for (const k of keys) {
    if (!isPlainObject(cur) && !Array.isArray(cur)) return undefined;
    cur = cur[k];
    if (cur === undefined) return undefined;
  }
  return cur;
}

function deepEqualDependentRequired(actual, expected) {
  if (!isPlainObject(actual)) return false;
  const aKeys = Object.keys(actual).sort();
  const eKeys = Object.keys(expected).sort();
  if (aKeys.length !== eKeys.length) return false;
  if (aKeys.join(',') !== eKeys.join(',')) return false;
  for (const k of eKeys) {
    const av = actual[k];
    const ev = expected[k];
    if (!Array.isArray(av)) return false;
    const as = [...av].sort();
    const es = [...ev].sort();
    if (as.length !== es.length) return false;
    for (let i = 0; i < es.length; i++) {
      if (as[i] !== es[i]) return false;
    }
  }
  return true;
}

// ── Nullability / enum / example detection ─────────────────────────

function nodeDeclaresNull(node) {
  if (Array.isArray(node.type) && node.type.includes('null')) return 'type-array';
  if (node.type === 'null') return 'type-null-branch';
  if (node.nullable === true) return 'nullable-flag';
  return null;
}

function schemaAdmitsNull(node) {
  if (!isPlainObject(node)) return false;
  if (nodeDeclaresNull(node)) return true;
  return ['anyOf', 'oneOf', 'allOf'].some(
    (keyword) =>
      Array.isArray(node[keyword]) &&
      node[keyword].some((branch) => schemaAdmitsNull(branch)),
  );
}

function nullableAllowed(baseName, propPath) {
  if (propPath.length !== 1) return false;
  const allowed = NULLABLE_ALLOWLIST[baseName];
  return Array.isArray(allowed) && allowed.includes(propPath[0]);
}

/**
 * Schema-aware scan of a SCHEMA/COMPONENT example value for `null` leaves.
 *
 * A `null` is permitted only when it sits at an allowlisted top-level property of
 * the component that OWNS it — i.e. `nullableAllowed(baseName, relPath)` where
 * `relPath` has length 1. To determine ownership across response wrappers, the
 * scanner follows the `$ref` on a property/items schema when descending into an
 * object/array: crossing a `$ref` switches `baseName` to the referenced
 * component and resets `relPath`. This means:
 *   - `ProductDetailsResponseData` example with `details: null` → allowed.
 *   - `ProductDetailsResponse` wrapper example with `data.details: null` →
 *     allowed (the `data` $ref resolves to `ProductDetailsResponseData`).
 *   - `details: null` inside any unrelated schema/nested object → rejected.
 *
 * `schema` is the JSON-Schema node describing `value` (may be undefined once the
 * scanner has crossed a `$ref` and no longer has the target body — deeper nulls
 * then correctly fail the length-1 allowlist check).
 */
function scanSchemaExampleForNull(value, schema, baseName, relPath, ctx, jsonPath) {
  if (value === null) {
    if (!nullableAllowed(baseName, relPath)) {
      const propDesc = relPath.length > 0 ? `'${relPath.join('.')}'` : '(root)';
      addFinding(
        'example-null',
        ctx.file,
        jsonPath,
        `Example emits null for ${propDesc} in '${baseName}', which is not an allowlisted nullable property. Remove the null example value.`,
      );
    }
    return;
  }

  // Descending into a non-null value: follow a $ref to switch component context.
  let sch = schema;
  if (isPlainObject(sch) && typeof sch.$ref === 'string') {
    const refBase = refBaseName(sch.$ref);
    if (refBase) {
      baseName = refBase;
      relPath = [];
      sch = undefined; // referenced body is not inlined here
    }
  }

  if (Array.isArray(value)) {
    const itemSchema = isPlainObject(sch) ? sch.items : undefined;
    value.forEach((v, i) =>
      scanSchemaExampleForNull(
        v,
        itemSchema,
        baseName,
        [...relPath, `[${i}]`],
        ctx,
        `${jsonPath}[${i}]`,
      ),
    );
    return;
  }

  if (isPlainObject(value)) {
    const props =
      isPlainObject(sch) && isPlainObject(sch.properties)
        ? sch.properties
        : undefined;
    for (const [k, v] of Object.entries(value)) {
      const childSchema = props ? props[k] : undefined;
      scanSchemaExampleForNull(
        v,
        childSchema,
        baseName,
        [...relPath, k],
        ctx,
        `${jsonPath}.${k}`,
      );
    }
  }
}

const schemaDocumentCache = new Map();

function resolveJsonPointer(doc, fragment) {
  if (!fragment || fragment === '#') return doc;
  if (!fragment.startsWith('#/')) return undefined;
  return fragment
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce(
      (current, segment) =>
        isPlainObject(current) || Array.isArray(current)
          ? current[segment]
          : undefined,
      doc,
    );
}

function loadSchemaDocument(absPath) {
  if (schemaDocumentCache.has(absPath)) {
    return schemaDocumentCache.get(absPath);
  }
  const loaded = loadYaml(absPath);
  const doc = loaded && isPlainObject(loaded.doc) ? loaded.doc : undefined;
  schemaDocumentCache.set(absPath, doc);
  return doc;
}

function resolveSchema(schema, schemaFile, baseName, relPath) {
  let current = schema;
  let currentFile = schemaFile;
  let currentBaseName = baseName;
  let currentRelPath = relPath;
  const visited = new Set();

  while (isPlainObject(current) && typeof current.$ref === 'string') {
    const ref = current.$ref;
    const visitKey = `${currentFile}::${ref}`;
    if (visited.has(visitKey)) break;
    visited.add(visitKey);

    const hashAt = ref.indexOf('#');
    const filePart = hashAt >= 0 ? ref.slice(0, hashAt) : ref;
    const fragment = hashAt >= 0 ? ref.slice(hashAt) : '';
    const targetFile = filePart
      ? join(currentFile, '..', filePart)
      : currentFile;
    const targetDoc = loadSchemaDocument(targetFile);
    current = resolveJsonPointer(targetDoc, fragment);
    currentFile = targetFile;
    if (filePart) {
      currentBaseName = baseNameOf(targetFile);
      currentRelPath = [];
    }
  }

  return {
    schema: current,
    schemaFile: currentFile,
    baseName: currentBaseName,
    relPath: currentRelPath,
  };
}

/**
 * Scans a PATH example against its response schema, resolving file `$ref`s so
 * each `null` is checked against the exact owning component + property.
 */
function scanPathExampleForNull(
  value,
  schema,
  schemaFile,
  baseName,
  relPath,
  file,
  jsonPath,
) {
  const locationBaseName = relPath.length > 0 ? baseName : undefined;
  const locationRelPath = relPath.length > 0 ? relPath : undefined;
  const resolved = resolveSchema(schema, schemaFile, baseName, relPath);
  const sch = resolved.schema;

  if (value === null) {
    const ownerBaseName = locationBaseName ?? resolved.baseName;
    const ownerRelPath = locationRelPath ?? resolved.relPath;
    if (
      !schemaAdmitsNull(sch) ||
      !nullableAllowed(ownerBaseName, ownerRelPath)
    ) {
      const propDesc =
        ownerRelPath.length > 0
          ? `'${ownerRelPath.join('.')}'`
          : '(unresolved root)';
      addFinding(
        'example-null',
        file,
        jsonPath,
        `Path example emits null for ${propDesc} in '${ownerBaseName}', which is not an exact allowlisted nullable property. Remove the null example value or correct the response schema.`,
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    const itemSchema = isPlainObject(sch) ? sch.items : undefined;
    value.forEach((v, i) =>
      scanPathExampleForNull(
        v,
        itemSchema,
        resolved.schemaFile,
        resolved.baseName,
        resolved.relPath,
        file,
        `${jsonPath}[${i}]`,
      ),
    );
    return;
  }

  if (isPlainObject(value)) {
    const props =
      isPlainObject(sch) && isPlainObject(sch.properties)
        ? sch.properties
        : undefined;
    for (const [k, v] of Object.entries(value)) {
      scanPathExampleForNull(
        v,
        props ? props[k] : undefined,
        resolved.schemaFile,
        resolved.baseName,
        [...resolved.relPath, k],
        file,
        `${jsonPath}.${k}`,
      );
    }
  }
}

/**
 * Dispatches a single example value to the schema-aware scanner or the
 * leaf-name path scanner, based on `ctx.mode`. `schema` is the JSON-Schema node
 * whose `examples`/`example` produced this value (used to follow `$ref`s in
 * schema mode).
 */
function scanExampleValue(value, schema, ctx, jsonPath) {
  if (ctx.mode === 'path') {
    scanPathExampleForNull(
      value,
      isPlainObject(schema) ? schema.schema : undefined,
      ctx.absPath,
      baseNameOf(ctx.absPath),
      [],
      ctx.file,
      jsonPath,
    );
  } else {
    scanSchemaExampleForNull(value, schema, ctx.baseName, ctx.propPath, ctx, jsonPath);
  }
}

/**
 * Generic recursive walk of an OpenAPI/JSON-Schema fragment.
 * ctx: { baseName, file, jsonPath, propPath, mode }
 *   mode: 'schema' — examples checked strictly against baseName + top-level prop.
 *         'path'   — examples checked against known leaf names (component context
 *                    cannot be inferred).
 */
function walk(node, ctx) {
  if (Array.isArray(node)) {
    node.forEach((v, i) =>
      walk(v, { ...ctx, jsonPath: `${ctx.jsonPath}[${i}]` }),
    );
    return;
  }
  if (!isPlainObject(node)) return;

  // 1. Nullable schema locations.
  const nullKind = nodeDeclaresNull(node);
  if (nullKind && !nullableAllowed(ctx.baseName, ctx.propPath)) {
    const propDesc =
      ctx.propPath.length > 0 ? `'${ctx.propPath.join('.')}'` : '(root)';
    addFinding(
      'nullable-location',
      ctx.file,
      ctx.jsonPath,
      `Property ${propDesc} in '${ctx.baseName}' declares a nullable schema (${nullKind}) but is not in the Option B allowlist.`,
    );
  }

  // 2. Enum must not carry a literal null.
  if (Array.isArray(node.enum) && node.enum.includes(null)) {
    const propDesc =
      ctx.propPath.length > 0 ? `'${ctx.propPath.join('.')}'` : '(root)';
    addFinding(
      'enum-null',
      ctx.file,
      `${ctx.jsonPath}.enum`,
      `Enum for ${propDesc} in '${ctx.baseName}' includes a literal null member. Remove it.`,
    );
  }

  // 3. Examples must not emit null (schema mode: schema-aware, $ref-following
  //    baseName + top-level property; path mode: known response leaf names +
  //    pagination).
  if (node.examples !== undefined) {
    const ex = node.examples;
    if (Array.isArray(ex)) {
      // Schema-style examples: array of example values described by `node`.
      ex.forEach((item, i) =>
        scanExampleValue(item, node, ctx, `${ctx.jsonPath}.examples[${i}]`),
      );
    } else if (isPlainObject(ex)) {
      // OpenAPI named-examples map: { name: { value } }.
      for (const [name, exObj] of Object.entries(ex)) {
        if (isPlainObject(exObj) && 'value' in exObj) {
          scanExampleValue(
            exObj.value,
            node,
            ctx,
            `${ctx.jsonPath}.examples.${name}.value`,
          );
        } else {
          scanExampleValue(exObj, node, ctx, `${ctx.jsonPath}.examples.${name}`);
        }
      }
    }
  }
  if (node.example !== undefined) {
    scanExampleValue(node.example, node, ctx, `${ctx.jsonPath}.example`);
  }

  // Recurse into children.
  for (const [k, v] of Object.entries(node)) {
    if (k === 'examples' || k === 'example') continue; // already scanned as data
    if (k === 'properties' && isPlainObject(v)) {
      for (const [pk, pv] of Object.entries(v)) {
        walk(pv, {
          ...ctx,
          jsonPath: `${ctx.jsonPath}.properties.${pk}`,
          propPath: [...ctx.propPath, pk],
        });
      }
    } else {
      walk(v, { ...ctx, jsonPath: `${ctx.jsonPath}.${k}` });
    }
  }
}

// ── Pricing contract checks ────────────────────────────────────────

function checkDependentRequired(doc, file) {
  const dr = doc && doc.dependentRequired;
  if (!dr) {
    addFinding(
      'pricing-dependent-required',
      file,
      'dependentRequired',
      "TradeItemPricingSummary is missing the required 'dependentRequired' map. Add the exact Option B allowance/surcharge dependency map.",
    );
    return;
  }
  if (!deepEqualDependentRequired(dr, EXPECTED_DEPENDENT_REQUIRED)) {
    addFinding(
      'pricing-dependent-required',
      file,
      'dependentRequired',
      `TradeItemPricingSummary 'dependentRequired' does not match the Option B contract.\n    expected: ${JSON.stringify(
        EXPECTED_DEPENDENT_REQUIRED,
      )}\n    actual:   ${JSON.stringify(dr)}`,
    );
  }
}

function checkPricingRow(row, file, jsonPath) {
  if (!isPlainObject(row)) return;
  const present = ALLOWANCE_FIELDS.filter((f) =>
    Object.prototype.hasOwnProperty.call(row, f),
  );
  const indicator = row.allowanceSurchargeIndicator;
  const isAllowanceBearing =
    Object.prototype.hasOwnProperty.call(row, 'allowanceSurchargeIndicator') &&
    indicator !== null &&
    indicator !== undefined;

  if (isAllowanceBearing) {
    const type = row.allowanceSurchargeType;
    const hasType =
      Object.prototype.hasOwnProperty.call(row, 'allowanceSurchargeType') &&
      type !== null &&
      type !== undefined;
    if (!hasType) {
      addFinding(
        'pricing-example-row',
        file,
        jsonPath,
        `Allowance/surcharge row (indicator='${indicator}') must include a non-null 'allowanceSurchargeType'.`,
      );
    }
  } else if (present.length > 0) {
    addFinding(
      'pricing-example-row',
      file,
      jsonPath,
      `No-allowance row must omit all seven allowance/surcharge fields, but found: ${present.join(
        ', ',
      )}. Omit these fields entirely (do not emit null).`,
    );
  }
}

function checkPricingRows(rows, file, jsonPath) {
  if (!Array.isArray(rows)) return;
  rows.forEach((row, i) => checkPricingRow(row, file, `${jsonPath}[${i}]`));
}

/** Extract flattened pricing row groups from an arbitrary parsed document. */
function collectPricingRowGroups(doc, file) {
  const groups = []; // { rows, jsonPath }

  // Schema-style top-level examples: array of rows.
  if (Array.isArray(doc?.examples)) {
    groups.push({ rows: doc.examples, jsonPath: 'examples' });
  }

  // Wrapper-style top-level examples: array of { data: [rows] }.
  if (Array.isArray(doc?.examples)) {
    doc.examples.forEach((ex, i) => {
      if (Array.isArray(ex?.data)) {
        groups.push({ rows: ex.data, jsonPath: `examples[${i}].data` });
      }
    });
  }

  // Path-style: any operation's 200 response media-type named examples.
  if (isPlainObject(doc)) {
    for (const [method, op] of Object.entries(doc)) {
      const responses = op?.responses;
      if (!isPlainObject(responses)) continue;
      const ok = responses['200'] || responses[200];
      const content = ok?.content;
      if (!isPlainObject(content)) continue;
      for (const [mime, media] of Object.entries(content)) {
        const named = media?.examples;
        if (isPlainObject(named)) {
          for (const [name, exObj] of Object.entries(named)) {
            const data = exObj?.value?.data;
            if (Array.isArray(data)) {
              groups.push({
                rows: data,
                jsonPath: `${method}.responses.200.content.${mime}.examples.${name}.value.data`,
              });
            }
          }
        }
      }
    }
  }

  return groups;
}

// ── File discovery ─────────────────────────────────────────────────

function listYamlFiles(rootRel) {
  const abs = join(REPO_ROOT, rootRel);
  if (!existsSync(abs)) return [];
  const out = [];
  const stack = [abs];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) out.push(full);
    }
  }
  return out.sort();
}

function loadYaml(absPath) {
  const rel = toPosix(relative(REPO_ROOT, absPath));
  let doc;
  try {
    doc = yaml.load(readFileSync(absPath, 'utf8'));
  } catch (err) {
    addBlocker(rel, `YAML parse error: ${err.message}`);
    return null;
  }
  return { doc, rel };
}

function baseNameOf(absPath) {
  const name = absPath.split(sep).pop();
  return name.replace(/\.ya?ml$/i, '');
}

/**
 * Resolve a `$ref` to the base name of the referenced schema/component. Handles
 * both file refs (`../domain/Foo.yaml`) and internal refs
 * (`#/components/schemas/Foo`). Returns undefined for sub-path pointers we
 * cannot map to a component (e.g. `Foo.yaml#/properties/bar`).
 */
function refBaseName(ref) {
  if (typeof ref !== 'string' || ref.length === 0) return undefined;
  let target = ref;
  const hashAt = target.indexOf('#');
  if (hashAt === 0) {
    // Internal pointer: take the last path segment.
    const seg = target.split('/').pop();
    return seg || undefined;
  }
  if (hashAt > 0) {
    // File ref with a fragment pointer — component identity is ambiguous.
    target = target.slice(0, hashAt);
  }
  const file = target.split(/[\\/]/).pop();
  if (!file) return undefined;
  return file.replace(/\.ya?ml$/i, '');
}

// ── Scans ──────────────────────────────────────────────────────────

function scanSourceSchemaFile(absPath) {
  const loaded = loadYaml(absPath);
  if (!loaded || !isPlainObject(loaded.doc)) return;
  walk(loaded.doc, {
    baseName: baseNameOf(absPath),
    file: loaded.rel,
    jsonPath: '$',
    propPath: [],
    mode: 'schema',
  });
}

function scanSourcePathFile(absPath) {
  const loaded = loadYaml(absPath);
  if (!loaded || !isPlainObject(loaded.doc)) return;
  // Path files have no allowlistable root schema; baseName is the filename so
  // any inline nullable is (correctly) not allowlisted. Enum-null and
  // example-null checks apply throughout, with example nulls checked against the
  // path leaf-name fallback set (exact component context cannot be inferred).
  walk(loaded.doc, {
    baseName: baseNameOf(absPath),
    file: loaded.rel,
    absPath,
    jsonPath: '$',
    propPath: [],
    mode: 'path',
  });
}

function scanBundle(relPath) {
  const abs = join(REPO_ROOT, relPath);
  if (!existsSync(abs)) {
    return { present: false };
  }
  const loaded = loadYaml(abs);
  if (!loaded || !isPlainObject(loaded.doc)) return { present: true };
  const doc = loaded.doc;

  const schemas = getPath(doc, ['components', 'schemas']);
  if (isPlainObject(schemas)) {
    for (const [name, schema] of Object.entries(schemas)) {
      if (!isPlainObject(schema)) continue;
      walk(schema, {
        baseName: name,
        file: loaded.rel,
        jsonPath: `$.components.schemas.${name}`,
        propPath: [],
        mode: 'schema',
      });
    }
  }

  // Pricing contract inside the bundle (when the pricing schema is present).
  const pricing = isPlainObject(schemas)
    ? schemas.TradeItemPricingSummary
    : undefined;
  if (isPlainObject(pricing)) {
    checkDependentRequired(pricing, loaded.rel);
    if (Array.isArray(pricing.examples)) {
      checkPricingRows(
        pricing.examples,
        loaded.rel,
        '$.components.schemas.TradeItemPricingSummary.examples',
      );
    }
    const wrapper = schemas.BulkTradeItemPricingsResponse;
    if (isPlainObject(wrapper) && Array.isArray(wrapper.examples)) {
      wrapper.examples.forEach((ex, i) => {
        if (Array.isArray(ex?.data)) {
          checkPricingRows(
            ex.data,
            loaded.rel,
            `$.components.schemas.BulkTradeItemPricingsResponse.examples[${i}].data`,
          );
        }
      });
    }
    // Bundled path examples for the pricing operation.
    const paths = getPath(doc, ['paths']);
    if (isPlainObject(paths)) {
      for (const [p, item] of Object.entries(paths)) {
        if (!isPlainObject(item)) continue;
        for (const group of collectPricingRowGroups(item, loaded.rel)) {
          // Only treat as pricing rows if they look like pricing rows.
          if (looksLikePricingRows(group.rows)) {
            checkPricingRows(
              group.rows,
              loaded.rel,
              `$.paths['${p}'].${group.jsonPath}`,
            );
          }
        }
      }
    }
  }

  return { present: true };
}

function looksLikePricingRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.some(
    (r) =>
      isPlainObject(r) &&
      Object.prototype.hasOwnProperty.call(r, 'supplierItemNumber') &&
      ALLOWANCE_FIELDS.some((f) =>
        Object.prototype.hasOwnProperty.call(r, f),
      ),
  );
}

function scanPricingSource() {
  // Schema file: dependentRequired + row examples.
  const schemaAbs = join(REPO_ROOT, PRICING_SCHEMA_FILE);
  if (!existsSync(schemaAbs)) {
    addBlocker(PRICING_SCHEMA_FILE, 'Required pricing schema file is missing.');
  } else {
    const loaded = loadYaml(schemaAbs);
    if (loaded && isPlainObject(loaded.doc)) {
      checkDependentRequired(loaded.doc, loaded.rel);
      checkPricingRows(loaded.doc.examples, loaded.rel, 'examples');
    }
  }

  // Wrapper file: examples[].data rows.
  const wrapperAbs = join(REPO_ROOT, PRICING_WRAPPER_FILE);
  if (!existsSync(wrapperAbs)) {
    addBlocker(PRICING_WRAPPER_FILE, 'Required pricing wrapper file is missing.');
  } else {
    const loaded = loadYaml(wrapperAbs);
    if (loaded && isPlainObject(loaded.doc)) {
      const examples = loaded.doc.examples;
      if (Array.isArray(examples)) {
        examples.forEach((ex, i) => {
          if (Array.isArray(ex?.data)) {
            checkPricingRows(ex.data, loaded.rel, `examples[${i}].data`);
          }
        });
      }
    }
  }

  // Path file: operation 200 example rows.
  const pathAbs = join(REPO_ROOT, PRICING_PATH_FILE);
  if (!existsSync(pathAbs)) {
    addBlocker(PRICING_PATH_FILE, 'Required pricing path file is missing.');
  } else {
    const loaded = loadYaml(pathAbs);
    if (loaded && isPlainObject(loaded.doc)) {
      for (const group of collectPricingRowGroups(loaded.doc, loaded.rel)) {
        checkPricingRows(group.rows, loaded.rel, group.jsonPath);
      }
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────

function main() {
  // 1. Source schemas.
  for (const root of SOURCE_SCHEMA_ROOTS) {
    for (const abs of listYamlFiles(root)) scanSourceSchemaFile(abs);
  }

  // 2. Source path files.
  for (const root of SOURCE_PATH_ROOTS) {
    for (const abs of listYamlFiles(root)) scanSourcePathFile(abs);
  }

  // 3. Pricing contract (source).
  scanPricingSource();

  // 4. Generated bundles (only when present).
  const bundleStatus = [];
  for (const rel of GENERATED_BUNDLES) {
    const { present } = scanBundle(rel);
    bundleStatus.push({ rel, present });
  }

  report(bundleStatus);
}

function report(bundleStatus) {
  const line = '─'.repeat(72);
  console.log(line);
  console.log('Option B contract validation');
  console.log(line);

  console.log('\nGenerated bundles:');
  for (const { rel, present } of bundleStatus) {
    console.log(`  ${present ? '✓ present ' : '· absent  '} ${rel}`);
  }

  if (blockers.length > 0) {
    console.log(`\n${blockers.length} blocking error(s):`);
    for (const b of blockers) {
      console.log(`  ✗ ${b.file}: ${b.message}`);
    }
  }

  // Group findings by category.
  const byCategory = new Map();
  for (const f of findings) {
    if (!byCategory.has(f.category)) byCategory.set(f.category, []);
    byCategory.get(f.category).push(f);
  }

  const categoryTitles = {
    'nullable-location': 'Disallowed nullable schema locations',
    'enum-null': 'Enums containing a literal null',
    'example-null': 'Examples emitting null for non-allowlisted properties',
    'pricing-dependent-required': 'Pricing dependentRequired contract',
    'pricing-example-row': 'Pricing example row contract',
  };

  if (findings.length === 0) {
    console.log('\nNo contract findings. ✓');
  } else {
    console.log(`\n${findings.length} contract finding(s):`);
    for (const [category, list] of byCategory) {
      const title = categoryTitles[category] || category;
      console.log(`\n  ${title} (${list.length}):`);
      for (const f of list) {
        console.log(`    ✗ ${f.file}`);
        console.log(`        at ${f.jsonPath}`);
        console.log(`        ${f.message}`);
      }
    }
  }

  console.log(`\n${line}`);
  const total = findings.length + blockers.length;
  if (total === 0) {
    console.log('Result: PASS — Option B contract satisfied.');
    console.log(line);
    process.exit(0);
  } else {
    console.log(
      `Result: FAIL — ${blockers.length} blocking error(s), ${findings.length} contract finding(s).`,
    );
    console.log(line);
    process.exit(1);
  }
}

main();
