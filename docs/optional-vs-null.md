Updated todo list

# Optional (absent) vs Nullable (null) — Design Decision

## 1. What ETIM xChange Does

The ETIM xChange V2.0 XML/JSON schema uses **optional presence** (Option B): properties that have no value are simply absent from the payload. They are not listed in the JSON Schema `required` array.

Examples of optional-absent fields in xChange:
- `SupplierAltItemNumber` — absent when supplier has no alternative number
- `ManufacturerItemNumber` — absent when unknown
- `ItemGtin` — absent when no GTIN assigned
- `ReplacedByTradeItemNumber` — absent when item is not replaced

This is standard JSON Schema behavior: if a property is not in `required`, it may be omitted from the JSON object entirely.

## 2. What the OpenAPI Spec Currently Does

The current API spec converts all optional xChange fields to **required + nullable** (Option A): every property is listed in `required` and uses `type: ["string", "null"]` (or `anyOf: [$ref, type: "null"]` for objects). The response always includes every field, with `null` meaning "no value."

Additionally, for aggregate root response schemas (`ProductResponseData`, `TradeItemResponseData`), collection properties use three-state semantics:
- `[...]` — requested, has data
- `[]` — requested, but empty
- `null` — not included in this response (not requested via field selection)

Several bulk/summary schemas contain a contradictory exception note:
> "Optional properties with null values **may be omitted** from the response to minimize payload size."

This means the schema declares properties as `required` but the implementation may omit them — clients must handle both absent AND null, undermining the primary benefit of Option A.

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

1. **Remove scalar properties from `required` arrays** where they represent optional data (e.g., `supplierAltItemNumber`, `manufacturerItemNumber`, `itemGtin`, `replacedByTradeItemNumber`, etc.)

2. **Change `type: ["string", "null"]` to `type: string`** for optional scalars (the nullability is no longer needed — absence conveys "no value")

3. **Remove `anyOf: [$ref, type: "null"]` for optional objects** — replace with a simple `$ref` not listed in `required`

4. **Keep aggregate root collection three-state pattern unchanged** — `type: ["array", "null"]` in `ProductResponseData` and `TradeItemResponseData` remains correct for field selection semantics

5. **Keep sub-resource collection pattern unchanged** — `type: array` (required, never nullable) remains correct

6. **Remove "may be omitted" exception notes** from summary schemas — with Option B, absence is the natural state for unset fields, not an exception that needs documenting

### Documentation Changes

7. **Update copilot instructions** — replace the "Objects null when absent" rule with the new patterns above

8. **Update this document** — replace the "Verdict" with the new recommendation (done)

### No Changes Needed

- Aggregate root three-state collection semantics (already correct)
- Sub-resource collection semantics (already correct)
- Error response patterns (RFC 9457 ProblemDetails — unrelated)
- Security scheme, tags, paths (unrelated)

### Estimated Scope

The change affects primarily:
- Domain schemas in `schemas/domain/` — remove nullable scalars, remove from required
- Response schemas in `schemas/responses/` — adjust required arrays
- Generated bundles — must be regenerated after changes
- Copilot instructions in `.github/copilot-instructions.md` — update nullability rules