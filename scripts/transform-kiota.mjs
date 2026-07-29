/**
 * transform-kiota.mjs
 *
 * Transforms bundled OpenAPI 3.1 YAML specs into Kiota-compatible OpenAPI 3.0.3 format.
 *
 * Kiota (microsoft/kiota#6776) generates union/wrapper types for OpenAPI 3.1 nullable
 * patterns like `oneOf: [$ref, type: "null"]`. This script rewrites those to the
 * OpenAPI 3.0 `nullable: true` idiom which Kiota maps to simple `T?` in C#.
 *
 * Transformations:
 *   1. `anyOf/oneOf: [$ref, type: 'null']` → `allOf: [$ref]` + `nullable: true`
 *   2. `type: [<type>, 'null']`            → `type: <type>` + `nullable: true`
 *   3. `exclusiveMaximum: N`               → `maximum: N, exclusiveMaximum: true` (3.0 boolean form)
 *   4. `exclusiveMinimum: N`               → `minimum: N, exclusiveMinimum: true` (3.0 boolean form)
 *   5. `openapi: 3.1.0`                    → `openapi: 3.0.3`
 *   6. Schema `examples: [...]` (plural)   → `example: <first>` (singular)
 *
 * Usage:
 *   node scripts/transform-kiota.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

/** API specs to transform: [inputPath, outputPath] */
const SPECS = [
  [
    'openapi/apis/product/generated/product-api.yaml',
    'openapi/apis/product/generated/kiota/product-api.yaml',
  ],
  [
    'openapi/apis/tradeitem/generated/tradeitem-api.yaml',
    'openapi/apis/tradeitem/generated/kiota/tradeitem-api.yaml',
  ],
];

/**
 * Checks if a schema node is `{ type: 'null' }` (the OpenAPI 3.1 null type).
 */
function isNullType(node) {
  return (
    node &&
    typeof node === 'object' &&
    Object.keys(node).length === 1 &&
    node.type === 'null'
  );
}

/**
 * Checks if a schema list is exactly [$ref-object, null-type] or [null-type, $ref-object].
 * Returns the $ref object if matched, otherwise null.
 */
function extractNullableRef(items) {
  if (!Array.isArray(items) || items.length !== 2) return null;

  const [a, b] = items;
  if (isNullType(b) && a && a.$ref) return a;
  if (isNullType(a) && b && b.$ref) return b;
  return null;
}

/**
 * Recursively transforms a parsed YAML node in-place.
 */
function transformNode(node) {
  if (node === null || node === undefined || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) {
      transformNode(item);
    }
    return;
  }

  // Transform `type: [<type>, 'null']` → `type: <type>` + `nullable: true`
  if (Array.isArray(node.type)) {
    const types = node.type.filter((t) => t !== 'null');
    const hasNull = node.type.includes('null');
    if (hasNull && types.length === 1) {
      node.type = types[0];
      node.nullable = true;
    } else if (hasNull && types.length > 1) {
      // Multiple non-null types — unlikely in this spec but preserve as-is
      node.type = types;
      node.nullable = true;
    }
  }

  // Transform `anyOf/oneOf: [$ref, type: 'null']` → `allOf: [$ref]` + `nullable: true`
  for (const keyword of ['anyOf', 'oneOf']) {
    if (Array.isArray(node[keyword])) {
      const ref = extractNullableRef(node[keyword]);
      if (ref) {
        delete node[keyword];
        node.allOf = [ref];
        node.nullable = true;
      }
    }
  }

  // Transform JSON Schema 2020-12 `exclusiveMaximum: N` → OpenAPI 3.0 `maximum: N, exclusiveMaximum: true`
  if (typeof node.exclusiveMaximum === 'number') {
    node.maximum = node.exclusiveMaximum;
    node.exclusiveMaximum = true;
  }

  // Transform JSON Schema 2020-12 `exclusiveMinimum: N` → OpenAPI 3.0 `minimum: N, exclusiveMinimum: true`
  if (typeof node.exclusiveMinimum === 'number') {
    node.minimum = node.exclusiveMinimum;
    node.exclusiveMinimum = true;
  }

  // Remove JSON Schema 2020-12 keywords not supported in OpenAPI 3.0
  delete node.dependentRequired;

  // Transform schema-level `examples: [...]` → `example: <first>`
  // (OpenAPI 3.0 uses singular `example` in Schema Object)
  // Only transform if it's a schema context (has `type`, `allOf`, `$ref`, `properties`, etc.)
  if (
    Array.isArray(node.examples) &&
    !node.in && // Not a parameter (parameters keep examples as named map)
    (node.type || node.allOf || node.oneOf || node.anyOf || node.properties || node.$ref)
  ) {
    const first = node.examples.find((e) => e !== null && e !== undefined);
    if (first !== undefined) {
      node.example = first;
    }
    delete node.examples;
  }

  // Recurse into child properties
  for (const key of Object.keys(node)) {
    if (key === 'example') continue; // Don't recurse into example values
    transformNode(node[key]);
  }
}

/**
 * Downgrade OpenAPI version from 3.1.0 to 3.0.3.
 */
function downgradeVersion(doc) {
  if (doc.openapi === '3.1.0') {
    doc.openapi = '3.0.3';
  }
}

/**
 * Transforms a single spec file.
 */
function transformSpec(inputPath, outputPath) {
  const content = readFileSync(inputPath, 'utf8');
  const doc = yaml.load(content);

  downgradeVersion(doc);
  transformNode(doc);

  // Ensure output directory exists
  mkdirSync(dirname(outputPath), { recursive: true });

  const output = yaml.dump(doc, {
    lineWidth: 120,
    noRefs: true,
    quotingType: "'",
    forceQuotes: false,
    sortKeys: false,
  });

  writeFileSync(outputPath, output, 'utf8');
  console.log(`  ✓ ${inputPath} → ${outputPath}`);
}

// Main
console.log('Transforming OpenAPI specs for Kiota compatibility...\n');

for (const [input, output] of SPECS) {
  transformSpec(input, output);
}

console.log('\nDone. Kiota-compatible specs generated.');
