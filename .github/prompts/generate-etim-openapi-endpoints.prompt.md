---
name: ETIM OpenAPI Endpoint Generator
description: "Generate or extend ETIM xChange OpenAPI endpoints, schemas, and bundles in this repository. Use when adding a new ETIM resource, subresource, or bulk endpoint set that must follow the repo's OpenAPI 3.1 conventions."
argument-hint: "Resource name, ETIM source schema section, target API folder, and desired endpoints or aspects"
agent: agent
---

Generate or extend API endpoints in this repository based on the ETIM xChange standard.

Use the invocation arguments to determine:
- the business resource or aspect to model
- the ETIM xChange source schema file and section
- the target API folder under `openapi/apis/`
- whether the work includes single-item endpoints, bulk endpoints, or both
- any resource-specific constraints, field mappings, or output files requested by the user

Before making changes, read and follow these references:
- [Repository instructions](../copilot-instructions.md)
- [OpenAPI best practices](../../docs/best-practices.md)
- [Envelope pattern](../../docs/envelope-pattern.md)
- [Trade item generator example](../../openapi/apis/tradeitem/etim-tradeitem-openapi-generation-prompt.md)

Then inspect the target API and at least one existing API implementation in `openapi/apis/` to reuse established patterns instead of inventing new ones.

Apply these rules unless the user explicitly overrides them:

1. Use OpenAPI 3.1 and JSON Schema 2020-12 conventions throughout.
2. Follow repository naming conventions exactly:
   - PascalCase schema files and component names
   - kebab-case parameter and response filenames
   - camelCase properties, parameters, and operationIds
   - kebab-case path segments
3. Keep response envelopes consistent:
   - all responses wrap payloads in `data`
   - single-item responses use a named `$ref` for `data` via `*ResponseData.yaml`
   - bulk responses use `data` arrays plus `meta: CursorPaginationMetadata`
   - never use inline anonymous objects for `data`
4. Reuse shared schemas, parameters, and error responses from `openapi/shared/` wherever possible.
5. Register every used shared parameter, schema, and response in the API's `components` section using PascalCase component names.
6. Keep object models open for additive evolution.
7. Use `type: ["...", "null"]` for nullable fields instead of `nullable: true`.
8. Use `examples` for schema examples, and add realistic examples for all new schemas.
9. Add business descriptions and ETIM traceability for every mapped field using this pattern:

```yaml
description: |
  [Business meaning]

  **ETIM xChange**: `FieldName`
  **Path**: `Supplier[].Product[]....FieldName`
```

10. Convert ETIM numeric strings to OpenAPI numeric types where appropriate, including `format: decimal` and matching constraints.

Use these conversion defaults when the ETIM schema encodes decimal numbers as patterned strings:

| ETIM pattern | OpenAPI type | Constraints |
|---|---|---|
| `^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 99999999999.9999` |
| `^[0-9]{1,5}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 99999.9999` |
| `^[0-9]{1,12}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 999999999999.9999` |
| `^[-]{0,1}[0-9]{1,12}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: -999999999999.9999`, `maximum: 999999999999.9999`, `multipleOf: 0.0001` |

Keep true integer fields as `integer`.

Preserve multi-state string enums as strings. Do not collapse values such as `"true"`, `"false"`, `"exempt"`, or `"no data"` into booleans.

Enhance date fields with explicit `format: date` or `format: date-time` as appropriate, realistic examples, and ISO 8601 wording in descriptions.

Denormalize ETIM catalog-level fields when required by the repository pattern:
- `CurrencyCode` becomes required, non-nullable `currencyCode` on pricing records
- `Language` becomes required, non-nullable language fields on description and multilingual records

When designing endpoints and files:
- preserve the API's existing folder structure and README style
- keep single-item and bulk contracts aligned with sibling APIs
- use `/{resource}/bulk/{aspect}` for bulk endpoint paths when bulk retrieval is part of the design
- use short Get/List summaries and camelCase operationIds
- use exactly two tags for each API: `{Resource} single` and `{Resource} bulk`, unless the target API already follows a different established convention that the user explicitly wants preserved

Expected working method:

1. Infer the requested resource design from the user arguments and ETIM source section.
2. Inspect adjacent APIs to find the closest implementation pattern.
3. Create or update only the files needed for the requested resource or aspect.
4. Reuse shared components instead of duplicating schemas or parameters.
5. Regenerate the bundled `generated/{api}-api.yaml` file after source spec changes.
6. Validate the result and fix any spec or reference errors introduced by the change.

Expected deliverables when the user asks for full implementation:
- updated `openapi.yaml`
- any required path files under `paths/`
- domain schemas under `schemas/domain/`
- response envelope schemas under `schemas/responses/`
- enum schemas when needed
- `openapi-domain.yaml` if the API documents domain models separately
- regenerated bundled spec in `generated/`
- README or changelog updates when the surrounding API uses them

If the user asks for only part of the work, keep the implementation scoped to that request while preserving repository consistency.

If critical input is missing, ask only the minimum necessary clarification. Otherwise proceed.

At the end:
- summarize the implemented API surface
- list key assumptions
- call out any ETIM fields intentionally deferred or left unmapped
- mention validation or bundle generation status