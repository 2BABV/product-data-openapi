# GitHub Copilot Instructions for 2BA OpenAPI Specification

## Copilot Behavior Instructions

When working with this repository:

1. **Always follow the established naming conventions**:
   
   **File Naming (for organization)**:
   - **PascalCase** for schema files: `ErrorResponse.yaml`, `Price.yaml`, `NetPriceResponse.yaml`
   - **kebab-case** for parameter/response files: `page-number.yaml`, `400-bad-request.yaml`
   
   **Component Names (for $ref references)**:
   - **PascalCase** for ALL component references: `Price`, `PageNumber`, `BadRequest`, `NotFound`
   - Component keys must match regex: `^[a-zA-Z0-9\.\-_]+$`
   - References always use component names, not filenames
   
   **Schema Properties & Parameters**:
   - **camelCase** for properties: `netPrice`, `errorCode`, `pageNumber`
   - **camelCase** for parameter names: `supplierGln`, `tradeItemId`, `quantity`
   - **camelCase** for operationIds: `getTradeItemNetPrice`, `getProducts`
   
   **API Paths**:
   - **kebab-case** for path segments: `/netprices`, `/trade-items`
   
  **Response Envelope Pattern (Single-Item and Bulk)**:
  - All responses wrap content in a `data` property — never return domain objects directly
  - The `data` property **must always use a named `$ref`** — NEVER define `data` as an inline anonymous `type: object`
  - Inline anonymous objects cause code generators (NSwag) to produce ambiguous types (`Data`, `Data2`, `Data3`)
  - For single-item responses: `data: { $ref: ./XxxResponseData.yaml }` where the `*ResponseData` schema contains composite key + domain data
  - For bulk responses: `data: { type: array, items: { $ref: ... } }` with `meta: { $ref: CursorPaginationMetadata }`
  - Naming: `{Entity}{Aspect}ResponseData.yaml` (e.g., `ProductDetailsResponseData`, `TradeItemPricingsResponseData`)
  - `*ResponseData` files go in `schemas/responses/` and must be registered in `openapi.yaml` under `components/schemas`
  - Use `meta` for cursor pagination information (reuse `CursorPaginationMetadata` with `cursor`, `prevCursor`, `hasNext`, `hasPrev`, `limit`, `estimatedTotal`)

2. **OpenAPI 3.1 / JSON Schema 2020-12 Requirements**:
   - Use `type: ["string", "null"]` for nullable fields (NOT `nullable: true`)
   - Use `anyOf`, `oneOf`, `allOf` for composition (avoid deprecated patterns)
  - Allow `additionalProperties` throughout the object model, including nested models, to preserve backward compatibility when optional fields are added
   - Use `examples` array (plural) in schemas, not `example` (singular, deprecated)
   - Include `format` for type hints: `uri`, `email`, `date-time`, `uuid`, etc.
   - Use `format: decimal` on all ETIM-converted number fields (code-gen hint for NSwag/.NET `decimal`; see [design decisions](../docs/product-data-openapi-design-decisions.md#format-decimal--code-generator-hint))
   - Use `minLength`, `maxLength`, `minimum`, `maximum` for validation
   - Prefer `const` over single-value `enum` for literal values

3. **Maintain the directory structure** - Place schemas in appropriate domain folders
4. **Use $ref extensively** - Don't repeat schema definitions; create reusable components
5. **Create separate files** for reusable enumerations and shared types
6. **Follow the DTO pattern** - Keep response schemas separate from domain schemas
7. **Include comprehensive examples** - Every schema should have realistic examples
8. **Document business context** - Add descriptions explaining purpose and constraints
9. **Support flexible identifiers** - Use `anyOf`/`oneOf` patterns for GLN/DUNS/alternative IDs
10. **Maintain consistent error responses** - Use RFC 7807 Problem Details format

11. **Security scheme convention**:
   - All APIs use **OAuth 2.0 Client Credentials** (`clientCredentials` flow)
   - Token URL: `https://identity.2ba.nl/connect/token` (production)
   - Scope naming: `read:{resource}` (e.g., `read:products`, `read:tradeitems`, `read:netprices`, `read:stock`)
   - Support **RFC 7523 client assertion** (`client_assertion` + `client_assertion_type`) as an alternative to `client_secret`
   - Do NOT use `bearerAuth` (HTTP Bearer) or `apiKeyAuth` — all auth goes through OAuth2

12. **Tag and grouping conventions**:
   - Each API defines exactly 2 tags: `{Resource} single` and `{Resource} bulk`
   - Use `x-tagGroups` with a single group named after the resource (e.g., `Products`, `Trade Items`)
   - Every endpoint must have exactly one tag assigned

13. **Component registration**:
   - ALL shared parameters, schemas, and responses used by an API MUST be registered in that API's `components/` section
   - This includes shared parameters like `Language`, `Cursor`, `Limit` — not just `ResponseData` schemas
   - Component names use **PascalCase** regardless of the file's kebab-case name

14. **YAML `$ref` style**:
   - Use **unquoted** file-path `$ref` values: `$ref: ../../shared/schemas/common/ProblemDetails.yaml`
   - Single quotes are only needed for internal refs starting with `#`: `$ref: '#/components/schemas/Pet'`
   - Per OpenAPI 3.1.0 spec examples and YAML 1.2.2 plain scalar convention

15. **Generated bundles**:
   - Each API has a `generated/` folder with a bundled `{api}-api.yaml` file (git-tracked)
   - Regenerate after ANY source spec change: `npx @redocly/cli bundle --config openapi/redocly.yaml {api}@v1 -o openapi/apis/{api}/generated/{api}-api.yaml`
   - Always commit regenerated bundles alongside the source changes that triggered them

## Naming Convention Details

### Schema Components (PascalCase)
- File: `ErrorResponse.yaml` → Component: `#/components/schemas/ErrorResponse`
- File: `Price.yaml` → Component: `#/components/schemas/Price`
- File: `NetPriceResponse.yaml` → Component: `#/components/schemas/NetPriceResponse`

### Parameter Components (PascalCase)
- File: `cursor.yaml` → Component: `#/components/parameters/Cursor`
- File: `limit.yaml` → Component: `#/components/parameters/Limit`
- File: `sort-order.yaml` → Component: `#/components/parameters/SortOrder`

### Response Components (PascalCase)
- File: `400-bad-request.yaml` → Component: `#/components/responses/BadRequest`
- File: `404-not-found.yaml` → Component: `#/components/responses/NotFound`
- File: `500-internal-server-error.yaml` → Component: `#/components/responses/InternalServerError`

## JSON Schema Best Practices

### Nullable Fields (OpenAPI 3.1 / JSON Schema 2020-12)
```yaml
# ✅ CORRECT - Use type array
propertyName:
  type: ["string", "null"]
  description: Optional field that can be null

# ❌ INCORRECT - Don't use nullable keyword (OpenAPI 3.0 only)
propertyName:
  type: string
  nullable: true
```

### Examples (OpenAPI 3.1+)

**For Schemas** - Use `examples` array (plural):
```yaml
# ✅ CORRECT - Schema examples array (plural)
type: object
properties:
  name:
    type: string
examples:
  - name: "Example 1"
  - name: "Example 2"

# ❌ DEPRECATED - Avoid example (singular) for schemas
example:
  name: "Example"
```

**For Parameters** - Use `example` (singular) OR `examples` (plural object):
```yaml
# ✅ CORRECT - Parameter example (simple, singular)
name: cursor
in: query
schema:
  type: string
example: "eyJpZCI6MTIzfQ=="

# ✅ ALSO CORRECT - Parameter examples (named examples object)
name: status
in: query
schema:
  type: string
examples:
  active:
    value: "active"
    summary: Active status
  pending:
    value: "pending"
    summary: Pending status
```

### Type Validation
```yaml
# ✅ CORRECT - Include validation constraints
productId:
  type: string
  minLength: 1
  maxLength: 35
  pattern: "^[A-Z0-9-]+$"
  examples:
    - "PROD-12345"

# ETIM-converted number field: use format: decimal and multipleOf: 0.0001
price:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999999999.9999
  examples:
    - 19.99
```

### Extensible Object Models
```yaml
# ✅ CORRECT - Keep objects open for additive evolution
type: object
required:
  - id
  - name
properties:
  id:
    type: string
  name:
    type: string

# Clients must accept and ignore unknown properties.
```

### Response Envelope — Named `$ref` for `data` (Code Generation)

The `data` property in response envelopes **must** use a named `$ref` — never an inline anonymous object. This is critical for code generators like NSwag.

```yaml
# ❌ INCORRECT — inline object → NSwag generates "Data", "Data2", "Data3"
type: object
properties:
  data:
    type: object
    properties:
      manufacturerIdGln: ...
      details:
        $ref: ../domain/ProductDetails.yaml

# ✅ CORRECT — named $ref → NSwag generates "ProductDetailsResponseData"
type: object
properties:
  data:
    $ref: ./ProductDetailsResponseData.yaml
```

**Single-item response** — `data` references a `*ResponseData` schema:
```yaml
# ProductDetailsResponse.yaml
type: object
required:
  - data
properties:
  data:
    $ref: ./ProductDetailsResponseData.yaml
```

**Bulk response** — `data` is an array with named `items`, plus `meta`:
```yaml
# BulkProductDetailsResponse.yaml
type: object
required:
  - data
  - meta
properties:
  data:
    type: array
    items:
      $ref: ../domain/ProductDetailsSummary.yaml
  meta:
    $ref: ../../../../shared/schemas/common/CursorPaginationMetadata.yaml
```

Always prioritize clarity, reusability, and adherence to OpenAPI 3.1+ and JSON Schema 2020-12 standards while respecting the established project patterns and business domain requirements.
