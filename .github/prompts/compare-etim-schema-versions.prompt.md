---
name: Compare ETIM Schema Versions
description: "Compare two ETIM xChange JSON schema versions and produce a structured change report with API impact assessment. Use when a new ETIM schema version is released."
argument-hint: "Path to old schema, path to new schema (both in resources/etim-xchange/)"
agent: agent
---

Compare two ETIM xChange JSON schema versions and produce a structured change report.

Use the invocation arguments to determine:
- the old (current) schema file path
- the new (incoming) schema file path

If only one file is specified, assume the other is the current schema referenced in `resources/etim-xchange/.instructions.md`.

Before comparing, read:
- [Repository instructions](../copilot-instructions.md)
- [ETIM xChange context](../../resources/etim-xchange/.instructions.md)
- [Field mapping registry](../../resources/etim-xchange/etim-field-mapping-registry.md)

Then read both schema files completely and produce this report:

## Change Report Structure

### 1. Schema Metadata Changes
- Version number changes
- Copyright/license changes
- Root-level required field changes

### 2. Product-Level Changes
For each changed field in `Supplier[].Product[]` and all nested structures:

| Change Type | ETIM Path | Old Definition | New Definition | API Impact |
|---|---|---|---|---|
| ADDED | full.dot.path | — | [type, constraints] | [which API schema is affected, or "new field — needs mapping"] |
| REMOVED | full.dot.path | [type] | — | [which API schema needs update] |
| MODIFIED | full.dot.path | [old type/constraints] | [new type/constraints] | [breaking or non-breaking] |
| ENUM_CHANGED | full.dot.path | [old values] | [new values] | [added/removed values] |

### 3. TradeItem-Level Changes
Same format as Product-Level but for `Supplier[].Product[].TradeItem[]` and nested structures.

### 4. API Impact Summary

For each affected API:
- **Product API**: List schemas that need updating
- **TradeItem API**: List schemas that need updating
- **Shared schemas**: Any shared components affected
- **Breaking changes**: Fields removed or types changed in incompatible ways
- **Non-breaking additions**: New optional fields

### 5. Recommended Actions

Prioritized list of changes to implement:
1. Breaking changes (must fix)
2. New required fields (should add)
3. New optional fields (can add)
4. Enum updates (should update)
5. Constraint changes (review needed)

### 6. Mapping Registry Updates

List the specific rows in `resources/etim-xchange/etim-field-mapping-registry.md` that need updating.

## Comparison Method

1. Parse both JSON schemas
2. Recursively compare all `properties` objects
3. Track: additions, removals, type changes, constraint changes, enum changes, pattern changes
4. Cross-reference each change against the mapping registry to determine API impact
5. Classify each change as breaking or non-breaking

Focus on the Product and TradeItem sections. Catalog-level metadata changes should be noted but are lower priority.

Output the report in markdown format suitable for review.
