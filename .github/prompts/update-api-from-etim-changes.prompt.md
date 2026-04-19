---
name: Update API from ETIM Changes
description: "Apply ETIM xChange schema changes to the Product API and/or TradeItem API. Use after running the schema comparison prompt, or with a manual list of changes to apply."
argument-hint: "Changes to apply: new fields, modified fields, enum updates, or a reference to a comparison report"
agent: agent
---

Apply ETIM xChange schema changes to the OpenAPI API specifications.

Use the invocation arguments to determine:
- which changes to apply (from a comparison report or manual list)
- which API(s) to update (Product, TradeItem, or both)
- scope of changes (specific fields, entire sections, or full update)

Before making changes, read and follow:
- [Repository instructions](../copilot-instructions.md)
- [OpenAPI best practices](../../docs/best-practices.md)
- [Envelope pattern](../../docs/envelope-pattern.md)
- [Design decisions](../../docs/product-data-openapi-design-decisions.md)
- [ETIM xChange context](../../resources/etim-xchange/.instructions.md)
- [Field mapping registry](../../resources/etim-xchange/etim-field-mapping-registry.md)

Then inspect the target API's `.instructions.md` and current schemas before making changes.

## Change Application Rules

### Adding New Fields

1. Determine the correct domain schema file for the new field
2. Add the property with proper camelCase naming
3. Include ETIM traceability in the description:
   ```yaml
   description: |
     [Business meaning]

     **ETIM xChange**: `FieldName`
     **Path**: `Supplier[].Product[].Section.FieldName`
   ```
4. Apply correct type conversion (string patterns → number with format: decimal, etc.)
5. Set appropriate constraints (minLength, maxLength, minimum, maximum, pattern)
6. Use `type: ["...", "null"]` for optional/nullable fields
7. Add realistic examples
8. If the field is required in ETIM and the API section, add to `required` array
9. Update the response data schemas if the field should appear in single-item and/or bulk responses
10. Register any new schemas in `openapi.yaml` components

### Modifying Existing Fields

1. Update type, constraints, or enum values as needed
2. Assess backward compatibility:
   - Adding enum values: non-breaking
   - Removing enum values: breaking — document and flag
   - Widening constraints (larger maxLength): non-breaking
   - Narrowing constraints: potentially breaking
3. Update examples to reflect new constraints
4. Update ETIM traceability if the path changed

### Adding New Enum Values

1. Locate the enum schema file (in `schemas/enums/` or inline)
2. Add the new value(s) maintaining alphabetical or logical order
3. Add descriptions for new values if the enum uses `oneOf` pattern with descriptions

### Handling New Sections/Structures

For entirely new ETIM sections that need new endpoints:
1. Use the `generate-etim-openapi-endpoints` prompt instead — it's designed for creating new endpoint sets
2. This prompt focuses on updating existing schemas and adding fields to existing structures

## Deliverables

After applying changes:

1. **Updated domain schema files** — with new/modified properties
2. **Updated response schemas** — if data shape changed
3. **Updated enum files** — if enum values changed
4. **Updated `openapi.yaml`** — if new components were added
5. **Regenerated bundle** — run `npx @redocly/cli bundle --config openapi/redocly.yaml {api}@v1 -o openapi/apis/{api}/generated/{api}-api.yaml`
6. **Updated mapping registry** — update `resources/etim-xchange/etim-field-mapping-registry.md` with new/changed mappings
7. **Updated `.instructions.md`** — update the target API's `.instructions.md` if mapping status changed
8. **Validation** — run `npx @redocly/cli lint --config openapi/redocly.yaml` to verify no errors

## Summary Output

At the end, provide:
- List of files changed
- List of new fields/properties added
- List of modified fields
- Breaking changes (if any)
- Updated mapping registry row count
- Validation status
