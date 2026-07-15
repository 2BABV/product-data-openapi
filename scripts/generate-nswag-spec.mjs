#!/usr/bin/env node
/**
 * Generate NSwag-compatible OpenAPI spec from bundled canonical spec.
 *
 * Transforms `anyOf: [$ref enum, type: "null"]` patterns into inline
 * nullable enums that NSwag correctly interprets as `EnumType?` in C#.
 *
 * NSwag (as of v14.x) doesn't support OpenAPI 3.1's anyOf nullable enum
 * pattern. This script produces a compatibility artifact without degrading
 * the canonical spec.
 *
 * Usage:
 *   node scripts/generate-nswag-spec.mjs
 *
 * Outputs:
 *   openapi/apis/product/generated/product-api-nswag.yaml
 *   openapi/apis/tradeitem/generated/tradeitem-api-nswag.yaml
 */
import { readFileSync, writeFileSync } from 'fs';
import yaml from 'js-yaml';

const SPECS = [
  {
    input: 'openapi/apis/product/generated/product-api.yaml',
    output: 'openapi/apis/product/generated/product-api-nswag.yaml',
  },
  {
    input: 'openapi/apis/tradeitem/generated/tradeitem-api.yaml',
    output: 'openapi/apis/tradeitem/generated/tradeitem-api-nswag.yaml',
  },
];

/**
 * Resolve a JSON pointer (e.g., "#/components/schemas/ItemStatus") to
 * the schema object within the document.
 */
function resolveRef(doc, ref) {
  if (!ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let current = doc;
  for (const part of parts) {
    current = current?.[part];
    if (current === undefined) return null;
  }
  return current;
}

/**
 * Check if a schema is a string enum (type: string + enum array).
 */
function isStringEnum(schema) {
  return schema?.type === 'string' && Array.isArray(schema?.enum);
}

/**
 * Transform an anyOf nullable enum pattern into an inline nullable enum.
 *
 * Input pattern:
 *   anyOf:
 *     - $ref: '#/components/schemas/SomeEnum'
 *     - type: 'null'
 *
 * Output pattern:
 *   type:
 *     - string
 *     - 'null'
 *   enum: [...enumValues, null]
 *   description: (preserved from ref target if available)
 */
function transformAnyOfNullableEnum(node, doc) {
  if (!node?.anyOf || !Array.isArray(node.anyOf) || node.anyOf.length !== 2) {
    return false;
  }

  const refEntry = node.anyOf.find((item) => item.$ref);
  const nullEntry = node.anyOf.find(
    (item) => item.type === 'null' || item.type === "'null'"
  );

  if (!refEntry || !nullEntry) return false;

  const resolved = resolveRef(doc, refEntry.$ref);
  if (!isStringEnum(resolved)) return false;

  // Transform in place: replace anyOf with inline nullable enum
  delete node.anyOf;
  node.type = ['string', 'null'];
  node.enum = [...resolved.enum, null];

  // Preserve description from the enum schema if not already set
  if (!node.description && resolved.description) {
    node.description = resolved.description;
  }

  return true;
}

/**
 * Transform anyOf nullable object/non-enum refs to oneOf.
 *
 * NSwag checks oneOf for nullability but ignores anyOf.
 * This rewrites:
 *   anyOf: [$ref, type: "null"]
 * to:
 *   oneOf: [$ref, type: "null"]
 *
 * Only applies when the $ref does NOT resolve to a string enum
 * (those are handled by transformAnyOfNullableEnum above).
 */
function transformAnyOfToOneOf(node, doc) {
  if (!node?.anyOf || !Array.isArray(node.anyOf) || node.anyOf.length !== 2) {
    return false;
  }

  const refEntry = node.anyOf.find((item) => item.$ref);
  const nullEntry = node.anyOf.find(
    (item) => item.type === 'null' || item.type === "'null'"
  );

  if (!refEntry || !nullEntry) return false;

  const resolved = resolveRef(doc, refEntry.$ref);
  // Skip string enums (handled by the other transform)
  if (isStringEnum(resolved)) return false;

  // Rewrite anyOf → oneOf
  node.oneOf = node.anyOf;
  delete node.anyOf;

  return true;
}

/**
 * Recursively walk the document and transform all nullable patterns.
 */
function walkAndTransform(node, doc, stats) {
  if (node === null || node === undefined || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) {
      walkAndTransform(item, doc, stats);
    }
    return;
  }

  // Try to transform this node (enum inlining takes priority)
  if (transformAnyOfNullableEnum(node, doc)) {
    stats.transformed++;
  } else if (transformAnyOfToOneOf(node, doc)) {
    stats.anyOfToOneOf++;
  }

  // Recurse into all properties
  for (const value of Object.values(node)) {
    walkAndTransform(value, doc, stats);
  }
}

// Main
for (const spec of SPECS) {
  const content = readFileSync(spec.input, 'utf8');
  const doc = yaml.load(content);
  const stats = { transformed: 0, anyOfToOneOf: 0 };

  walkAndTransform(doc, doc, stats);

  const output = yaml.dump(doc, {
    lineWidth: -1,
    noRefs: true,
    quotingType: "'",
    forceQuotes: false,
  });

  writeFileSync(spec.output, output, 'utf8');
  console.log(
    `✅ ${spec.output} — ${stats.transformed} nullable enum(s) inlined, ${stats.anyOfToOneOf} anyOf→oneOf`
  );
}
