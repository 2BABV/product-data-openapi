Updated todo list

# Optional (absent) vs Nullable (null) — Design Decision

## 1. What ETIM xChange Does

The ETIM xChange V2.0 XML/JSON schema uses **optional presence** (Option B): properties that have no value are simply absent from the payload. They are not listed in the JSON Schema `required` array.

The canonical `ETIM xChange_Schema_V2.0-2025-11-27.json` contains 404 properties:
- 89 required properties
- 315 optional properties
- 0 schemas that allow JSON `null`

Optional ETIM scalars, objects, and collections are therefore omitted when unavailable. If an optional property is present, its value must satisfy its non-null schema. Required child properties remain required whenever their containing optional object or array item is present.

Examples of optional-absent fields in xChange:
- `SupplierAltItemNumber` — absent when supplier has no alternative number
- `ManufacturerItemNumber` — absent when unknown
- `ItemGtin` — absent when no GTIN assigned
- `ReplacedByTradeItemNumber` — absent when item is not replaced

This is standard JSON Schema behavior: if a property is not in `required`, it may be omitted from the JSON object entirely.

## 2. What the OpenAPI Spec Currently Does

The current API spec is in a **mixed optional + nullable state**, not a uniform implementation of Option A:

- Many optional ETIM properties are already omitted from `required`, but their schemas still allow `null` with `type: ["string", "null"]` or `anyOf: [$ref, type: "null"]`.
- Truly required ETIM fields and API key fields are generally required and non-null.
- Aggregate root response schemas use required nullable collections for API field-selection semantics.
- Some flattened bulk schemas allow optional properties to be either omitted or explicitly `null`.

For most optional scalars and objects, adopting Option B therefore means narrowing the value schema so a present property cannot be `null`; it does **not** necessarily require changing the containing object's `required` array.

Additionally, for aggregate root response schemas (`ProductResponseData`, `TradeItemResponseData`), collection properties use three-state semantics:
- `[...]` — requested, has data
- `[]` — requested, but empty
- `null` — not included in this response (not requested via field selection)

Several bulk/summary schemas contain a contradictory exception note:
> "Optional properties with null values **may be omitted** from the response to minimize payload size."

This means the schema declares properties as `required` but the implementation may omit them — clients must handle both absent AND null, undermining the primary benefit of Option A.

### Intentional API Differences from Canonical ETIM

The REST API is not a byte-for-byte projection of the catalogue interchange document:

- Composite API keys such as manufacturer GLN + product number and supplier GLN + item number may be required even where the canonical catalogue schema permits an identifier to be absent.
- Catalogue-level values such as currency and validity dates may be inherited or materialized into API response records.
- Sub-resource responses guarantee required arrays with `[]` for no results.
- Aggregate response DTOs may use `null` to mean a component was not included.
- Bulk summary schemas may flatten nested ETIM structures.

These API-specific decisions must be reviewed separately from ETIM optionality. Option B must not mechanically remove fields from `required` or weaken API key constraints.

---

## 3. Trade-off Analysis

| Concern | Option A: Required-Nullable | Option B: Optional-Absent |
|---|---|---|
| **Response shape predictability** | ✅ Always the same keys — consumers never check key existence | ❌ Shape varies per response; consumers may see different keys |
| **Payload size** | ❌ Larger — every null field transmitted (30+ `"field": null` entries per product) | ✅ Smaller — absent fields not transmitted |
| **Consumer logic (JavaScript/TypeScript)** | ✅ Only null-check: `if (x === null)` | ❌ Must check presence + value: `if ("x" in obj && obj.x !== undefined)` |
| **Consumer logic (C#/.NET)** | ⚠️ Identical — both produce `T?`, null-check either way | ⚠️ Identical — missing JSON key deserializes to `null` on the C# property |
| **NSwag code generation** | ⚠️ Produces `string?` with `[JsonProperty(Required.AllowNull)]` | ⚠️ Produces `string?` with `[JsonProperty(Required.Default)]` — same property type |
| **TypeScript code generation** | ✅ Clean `field: string \| null` — must handle null | ⚠️ `field?: string` — must handle undefined |
| **Industry alignment** | ❌ Against Microsoft, Google, Zalando guidelines | ✅ Matches Microsoft, Google, Zalando, JSON:API |
| **Semantic clarity (scalars)** | ⚠️ `null` means "no value" — same as absence | ✅ Absence means "no value" — simple |
| **Three-state semantics (collections)** | ✅ Enables null/empty/data distinction for field selection | ❌ Cannot distinguish "not requested" from "empty" without envelope metadata |
| **Backward compatibility** | ✅ New required-nullable fields don't break clients that ignore null | ✅ New optional fields don't break clients (absent = ignored) |
| **Schema/implementation consistency** | ❌ If implementation omits nulls for bandwidth, schema contract is violated | ✅ Schema matches wire format — absent means absent |
| **JSON Merge Patch (PATCH)** | ❌ Cannot use absent-vs-null to mean "don't change" vs "clear" | ✅ Natural fit: absent = don't change, null = clear the value |

---

## 4. Industry Standards and Best Practices

### Microsoft Azure REST API Guidelines

> ⛔ "DO NOT send JSON fields with a null value from the service to the client. Instead, the service should just not send this field at all (this reduces payload size). Semantically, Azure services treat a missing field and a field with a value of null as **identical**."

> ✅ "DO accept JSON fields with a null value only for a PATCH operation with a JSON Merge Patch payload. A field with a value of null instructs the service to delete the field."

**Position: Option B. Null reserved exclusively for PATCH (clear-the-field) semantics.**

### Google API Design Guide (AIPs)

Google follows Protocol Buffers conventions for their REST APIs:
- Optional fields absent from responses when not set
- `null` and omitted fields treated as identical (proto3/REST transcoding)
- Required fields must be present AND non-empty — "required but null" does not exist at Google

**Position: Option B. No concept of required-nullable in responses.**

### Zalando RESTful API Guidelines

> "While API designers may be tempted to assign different semantics to both cases [null vs. absent], we explicitly decide **against** that option, because we think that **any gain in expressiveness is far outweighed by the risk of clients not understanding and implementing the subtle differences incorrectly**."

> "Many major libraries have somewhere between little to no support for a null/absent pattern (see Gson, Moshi, Jackson, JSON-B). Especially **strongly-typed languages suffer** from this since a new composite type is required to express the third state."

**Position: Option B. Explicitly argues against distinguishing null from absent.**

### OpenAPI 3.1 / JSON Schema 2020-12

The specification supports both patterns equally. Neither is prescribed or discouraged. Both are valid schema constructs:

```yaml
# Option A: required + nullable
required: [email]
properties:
  email:
    type: ["string", "null"]

# Option B: optional (not in required)
properties:
  email:
    type: string
```

**Position: Neutral — design choice left to API authors.**

### Stripe API (the notable exception)

Stripe deliberately uses required-nullable across all product/customer objects. Their reasoning:
1. Predictable response shape — consumers never check key existence
2. SDK ergonomics — generated code always expects certain keys
3. Forward compatibility — new nullable fields don't change the shape

Stripe is widely regarded as having one of the best-designed commercial APIs. Many fintech/SaaS teams adopt this pattern explicitly because Stripe uses it.

**Position: Option A. Prioritizes predictable response shapes for SDK consumers.**

### Speakeasy (OpenAPI Tooling Authority)

> "Only mark a field as both optional and nullable when the API genuinely treats null and omitted differently. If you can't describe a scenario where sending `{ 'field': null }` and `{ }` should produce different outcomes, the field should be optional but not nullable."

**Position: Option B unless PATCH/three-state semantics are genuinely needed.**

### JSON:API Specification

> "If an attribute is not present in an attributes object, it is undefined. Otherwise, its value is present, and may be null."

**Position: Option B. Absent = undefined/not-provided. Null = explicit semantic intent.**

### Summary Table

| Authority | Position | Strength |
|---|---|---|
| Microsoft Azure REST API Guidelines | **Option B** (⛔ ban null in responses) | Very Strong |
| Google API Design Guide / AIPs | **Option B** (omit unset fields) | Strong |
| Zalando RESTful API Guidelines | **Option B** (explicitly against null/absent distinction) | Strong |
| JSON:API Specification | **Option B** (absent = undefined) | Moderate |
| Speakeasy (OpenAPI tooling) | **Option B** (unless PATCH semantics) | Moderate |
| OpenAPI 3.1 / JSON Schema 2020-12 | **Neutral** (both valid) | — |
| Stripe API | **Option A** (predictable shape) | Strong (by example) |

**Industry consensus: Option B (optional-absent) is the majority best practice for response payloads.** Option A is a legitimate minority choice with Stripe as its strongest proponent.

---

## 5. Additional Considerations

### Code Generation Reality for .NET

The primary argument for Option A was "better code generation." In practice:

- **NSwag**: Both patterns produce `public string? Email { get; set; }`. The difference is only in the `[JsonProperty(Required = ...)]` attribute — `Required.AllowNull` vs `Required.Default`. The property type is identical.
- **Kiota**: Similar behavior. Both patterns generate nullable properties.
- **System.Text.Json**: A missing JSON key deserializes to `null` (or `default`) on the C# object. Consumers null-check either way.

The code generation argument is valid **only for TypeScript/JavaScript** consumers, where `field: string | null` (Option A) vs `field?: string` (Option B) are meaningfully different types.

### Three-State Semantics: Where Required-Nullable IS Justified

The three-state pattern (`null` = not requested, `[]` = empty, `[...]` = data) is a legitimate need for **aggregate root responses with field selection** (e.g., `?include=descriptions,attachments`). This is the one scenario where required-nullable for collections is genuinely necessary.

However, this justification does **not** extend to scalar properties. For `supplierAltItemNumber: type: ["string", "null"]`, there is no three-state distinction — `null` simply means "no value," which is semantically identical to absence.

### Flattened and Denormalized Projections

Flattened bulk rows are API projections rather than canonical ETIM objects. For example, `TradeItemPricingSummary` represents a pricing entry LEFT JOINed with its allowance/surcharge entries. Canonical ETIM requires both `AllowanceSurchargeIndicator` and `AllowanceSurchargeType` whenever an allowance/surcharge object exists, while the flattened row also needs to represent a pricing entry with no allowance/surcharge.

The flattened schema must therefore define a coherent row shape:

- no allowance/surcharge properties when the related object does not exist; or
- allowance/surcharge properties present with the canonical required pair enforced.

Making every flattened allowance/surcharge property independently optional would permit invalid partial combinations. Literal `null` values in enum arrays must also be removed when a property becomes optional and non-null.

### JSON Merge Patch Compatibility

If the API ever supports PATCH operations (RFC 7396 JSON Merge Patch), Option B naturally supports the semantics:
- **Absent** = don't change this field
- **`null`** = clear/delete this field
- **Value** = update to this value

With Option A (all fields always required), JSON Merge Patch becomes impossible without breaking the response contract — the server cannot distinguish "client wants to clear this field" from "client is echoing back the current null value."

### Payload Size Impact

For a product entity with ~40 optional attributes where ~25 are typically null, Option A adds approximately 25 × ~30 bytes = 750 bytes per item. In bulk responses (100+ items), this adds 75KB+ of null values per page. For a high-traffic product data API, this is non-trivial.

---

## 6. Recommendation: Adopt Option B (Optional-Absent)

Given that:
1. **Industry consensus** (Microsoft, Google, Zalando) clearly favors Option B
2. **C# code generation** produces identical types for both patterns (the primary stated benefit doesn't exist)
3. **Three-state semantics** are only needed for aggregate root collections, not scalars
4. **Payload optimization** exceptions already exist (schemas that say "may be omitted"), creating inconsistency
5. **JSON Merge Patch** compatibility is preserved with Option B
6. **No backward compatibility constraint** — the API is not yet in production

The recommended approach is:

### Pattern for Scalar Properties

```yaml
# Optional scalar — omit from required, simple type
type: object
required:
  - tradeItemNumber    # truly required, never absent
  - supplierGln        # truly required, never absent
properties:
  tradeItemNumber:
    type: string
  supplierGln:
    type: string
    format: gln
  supplierAltItemNumber:       # optional — absent when no value
    type: string
  manufacturerItemNumber:      # optional — absent when no value
    type: string
```

### Pattern for Optional Objects

```yaml
# Optional object — omit from required
properties:
  ordering:
    $ref: '#/components/schemas/TradeItemOrdering'
  # Absent from JSON when not available
```

### Pattern for Sub-Resource Collections

```yaml
# Sub-resource collections — required, never nullable, empty = []
type: object
required:
  - descriptions
properties:
  descriptions:
    type: array
    items:
      $ref: '#/components/schemas/ProductDescription'
```

### Pattern for Aggregate Root Collections (field selection)

```yaml
# ONLY in ProductResponseData / TradeItemResponseData
# Three-state: null = not requested, [] = empty, [...] = data
type: object
required:
  - descriptions
properties:
  descriptions:
    type: ["array", "null"]
    items:
      $ref: '#/components/schemas/ProductDescription'
```

### Summary of Rules

| Context | Pattern | Meaning |
|---|---|---|
| Always-present scalars (IDs, keys) | `required` + simple type | Must be present, never null |
| Optional scalars (descriptions, alt numbers) | NOT in `required`, simple type | Absent = no value |
| Sub-resource collections | `required` + `type: array` | Always present, empty = `[]` |
| Aggregate root collections (field selection) | `required` + `type: ["array", "null"]` | Three-state: null/empty/data |
| Optional objects | NOT in `required`, `$ref` only | Absent = not available |

---

## 7. Impact: What Should Change

### Schema Changes Required

1. **Inventory every nullable property before editing** — classify it as canonical ETIM optional data, a canonical required field, an API-required key/defaulted field, an API response projection, or a flattened projection field.

2. **Narrow optional scalar schemas** — change `type: ["string", "null"]` to `type: string` (and equivalent number, integer, boolean, and enum patterns). Remove the property from `required` only if it is currently required but is optional in the approved API contract.

3. **Use direct optional references** — replace `anyOf: [$ref, type: "null"]` with a direct `$ref` for optional objects and enum values that do not assign distinct semantics to `null`.

4. **Preserve canonical required fields** — required ETIM fields remain required and non-null whenever their containing structure exists. Preserve independently justified API composite keys and materialized default fields.

5. **Keep aggregate response three-state semantics unchanged** — `type: ["array", "null"]` in `ProductResponseData` and `TradeItemResponseData` remains correct for field selection semantics.

6. **Keep sub-resource collection semantics unchanged** — required `type: array` remains correct; no results use `[]`.

7. **Domain aggregate collection semantics (resolved)** — `Product.yaml` and `TradeItem.yaml` model canonical ETIM: optional, **non-null** collections and objects, omitted when unavailable. The API-specific `null`/`[]`/`[...]` field-selection semantics live **only** in `ProductResponseData.yaml` and `TradeItemResponseData.yaml`.

8. **Flattened pricing semantics (resolved)** — `TradeItemPricingSummary` uses **conditional absence**: rows without an allowance/surcharge omit all seven `allowanceSurcharge*` fields; all are non-null when present. `dependentRequired` enforces that `allowanceSurchargeIndicator` and `allowanceSurchargeType` occur together and that any other allowance/surcharge field requires both. No literal `null` enum values remain.

9. **Remove obsolete payload exception notes** — under Option B, omission is contractual rather than an exception.

10. **Update examples** — omit unavailable optional properties instead of assigning `null`. Retain `null` examples only where the API intentionally defines distinct null semantics.

### Documentation Changes

11. **Update all authoritative guidance**:
    - `.github/copilot-instructions.md`
    - `docs/best-practices.md`
    - `docs/product-data-openapi-design-decisions.md`
    - this decision document

12. **NSwag compatibility tooling removed** — the `scripts/generate-nswag-spec.mjs` transform, the `bundle:nswag` npm script, and the generated `*-api-nswag.yaml` outputs have been removed. Optional ETIM enums now use a direct `$ref`, so no nullable-enum rewrite is needed; generate clients directly from the canonical `*-api.yaml` bundles.

13. **Document release impact** — changing required-nullable properties to optional non-null properties changes generated client contracts. This migration is permitted during the current v1 Preview phase; compatibility becomes binding at stable `1.0.0`. Release notes must identify the breaking contract change and migration impact.

### No Changes Needed

- Aggregate root three-state collection semantics (already correct)
- Sub-resource collection semantics (already correct)
- Error response patterns (RFC 9457 ProblemDetails — unrelated)
- Security scheme, tags, paths (unrelated)

### Estimated Scope

The change affects primarily:
- Domain schemas in `schemas/domain/` — narrow optional values while preserving canonical required children and API-specific constraints
- Summary and bulk projection schemas — narrow optional values and enforce correlated flattened fields
- Response schemas in `schemas/responses/` — preserve intentional collection semantics and remove unintended nullable scalar/object patterns
- Generated bundles — must be regenerated after changes
- HTML and domain model documentation — regenerate after source schema changes
- Authoritative guidance — update all documents listed above

### Approved Decisions

1. **Domain aggregates follow canonical ETIM**: `Product.yaml` and `TradeItem.yaml`
   use optional, non-null collections and objects. Unavailable values are omitted.
   The API-specific `null`/`[]`/`[...]` field-selection semantics remain only in
   `ProductResponseData.yaml` and `TradeItemResponseData.yaml`.

2. **Flattened pricing uses conditional absence**: Rows without an
   allowance/surcharge omit every `allowanceSurcharge*` property. All such properties
   are non-null when present. `dependentRequired` enforces that
   `allowanceSurchargeIndicator` and `allowanceSurchargeType` occur together,
   and that any additional allowance/surcharge property requires both canonical fields.
   This preserves one flat bulk DTO while rejecting partial allowance/surcharge rows.

### Intentional `null` Allowlist (exact)

JSON `null` appears in **exactly** these places and nowhere else. Everything else is
optional-absent. `scripts/validate-option-b.mjs` enforces this list.

| Category | Schema | Members |
|---|---|---|
| Aggregate response arrays (`type: ["array","null"]`) | `ProductResponseData.yaml` | `descriptions`, `etimClassifications`, `attachments` |
| Aggregate response arrays (`type: ["array","null"]`) | `TradeItemResponseData.yaml` | `descriptions`, `pricings`, `relations`, `logisticDetails`, `attachments`, `packagingUnits` |
| Required-nullable singular sub-resource `data` (`anyOf: [$ref, null]`) | `ProductDetailsResponseData.yaml` | `details` |
| Required-nullable singular sub-resource `data` | `ProductLcaEnvironmentalResponseData.yaml` | `lcaEnvironmental` |
| Required-nullable singular sub-resource `data` | `TradeItemDetailsResponseData.yaml` | `details` |
| Required-nullable singular sub-resource `data` | `TradeItemOrderingResponseData.yaml` | `ordering` |
| Pagination metadata (`type: ["string"/"integer","null"]`) | `CursorPaginationMetadata.yaml` | `cursor`, `prevCursor`, `estimatedTotal` |

The four singular `data` properties use `null` to mean "the singular resource is
unavailable" — the parent entity was not found (`details`, `ordering`) or no data of that
kind exists (`lcaEnvironmental`); the endpoint returns `200` with `null`, never `404`.
Aggregate arrays use `null` to mean "not included in this response" (three-state field
selection).