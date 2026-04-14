# CSV Output Support for Bulk APIs — Impact Analysis & Implementation Plan

## Problem Statement

Add `text/csv` as an alternative response format alongside `application/json` for bulk endpoints in the **Product API** (4 active endpoints) and **Trade Item API** (7 active endpoints). This enables ETL/data warehouse clients to consume bulk data directly in CSV without JSON parsing.

## Current State

- **11 active bulk endpoints** across 2 APIs (4 product, 7 trade-item)
- All respond exclusively with `application/json`
- All use the `data[]` + `meta` envelope pattern with cursor-based pagination
- Data schemas are **already flattened** (1 row per data point) — designed for ETL
- No existing content negotiation anywhere in the spec

---

## Standards & Best Practices Research

### OpenAPI 3.1 Specification

**Multiple media types per response are explicitly supported.** The spec (§4.8.17 Response Object) shows the `content` map keyed by media type, with examples including `application/json`, `application/xml`, `text/plain`, and wildcards in the same response. The spec states: *"For responses that match multiple keys, only the most specific key is applicable."*

**Response headers** are well-defined objects. The spec provides examples of custom headers (like `X-Rate-Limit-*`) alongside `text/plain` content — directly analogous to our pagination-in-headers approach.

**`text/csv` schema**: For non-JSON media types, the schema is typically `type: string` with a `description` explaining the format. This is the standard pattern — OpenAPI doesn't model CSV columns as individual typed fields.

**Verdict**: ✅ OpenAPI 3.1 fully supports this. No spec-level issues.

### Microsoft Azure REST API Guidelines (microsoft/api-guidelines)

**Key finding: Microsoft has NO established pattern for CSV in REST APIs.**

- The Azure guidelines are **strongly JSON-centric**: *"DO use GET for resource retrieval and return JSON in the response body"*.
- Content negotiation via `Accept` header is acknowledged as an HTTP standard (RFC 7231), and `accept` is listed as a standard request header services should support.
- **No mention of CSV, `text/csv`, or alternative data formats** anywhere in the Azure Data Plane guidelines, Azure Management Plane guidelines, or Microsoft Graph guidelines.
- **Pagination in Azure collections uses JSON body**: `DO return a nextLink field with an absolute URL` — this is fundamentally incompatible with CSV (no JSON envelope).
- **Custom header naming** (RFC 6648): Azure guidelines state *"DO NOT use 'x-' prefix for custom headers, unless the header already exists in production."* This affects our pagination header naming.

**Verdict**: ⚠️ No direct conflict, but we'd be defining a pattern Microsoft hasn't established. We're on our own for pagination-in-headers and CSV column conventions.

### Microsoft ASP.NET Core Content Negotiation

**Good news for server-side implementation:**
- Built-in content negotiation via `Accept` header using `ObjectResult`.
- Custom output formatters can be registered (e.g., `CsvOutputFormatter`).
- `[FormatFilter]` attribute enables URL-based format selection (`.json`, `.csv` extensions).
- `MvcOptions.ReturnHttpNotAcceptable = true` returns `406 Not Acceptable` for unsupported types.
- Default: JSON when no `Accept` header is present.

**Verdict**: ✅ Server implementation is well-supported in ASP.NET Core. Creating a custom `CsvOutputFormatter` per domain model is straightforward.

### RFC 4180 (CSV Format) & RFC 7231 (HTTP Content Negotiation)

- **RFC 4180** defines `text/csv` as the MIME type for CSV. It specifies: CRLF line endings, optional header row, comma delimiter, double-quote escaping.
- **RFC 7231** (HTTP/1.1 Semantics) defines content negotiation via `Accept` header as the standard mechanism. Servers SHOULD return `406 Not Acceptable` if they can't satisfy the `Accept` header.
- **RFC 8288** (Web Linking) defines the `Link` header for pagination relationships (`rel="next"`, `rel="prev"`).
- **RFC 6648** deprecates the `X-` prefix convention. New headers should not use it.

### Industry Precedent

Several major APIs offer CSV alongside JSON for bulk/export endpoints:
- **GitHub API**: Uses `Accept` header for versioned content negotiation (`application/vnd.github.v3+json`)
- **Stripe**: Export endpoints return CSV via explicit export actions
- **Google Analytics / BigQuery**: Export APIs use `?format=csv` query parameter
- **Shopify**: Bulk operations use NDJSON (`application/x-ndjson`) for streaming
- **Elasticsearch**: `_search` endpoint supports `?format=csv` alongside JSON
- **Common pattern for ETL/bulk**: `?format=` query parameter is widespread for projection/export endpoints, while `Accept` header is more common for domain resource endpoints

---

## Key Design Decisions Required

### Decision 1: Content Negotiation Mechanism

#### Why the bulk endpoints are different from standard REST

The bulk endpoints are **projection endpoints**, not domain endpoints. They already represent a specific, flattened representation optimized for ETL — not a canonical resource. When you're already choosing a representation:

- Classic content negotiation (`Accept: text/csv` vs `Accept: application/json`) implies "same resource, different format" — but these projections are already format-aware by design
- The `Accept` header hides behavior and makes the endpoint harder to reason about
- Explicit format selection is more transparent, testable, and cache-friendly

This is a significant architectural distinction. Traditional conneg works well for `GET /products/{id}` (same resource as JSON or XML), but less naturally for `/bulk/product-details` where the flattened shape IS the representation.

#### Options

| Approach | Pros | Cons |
|----------|------|------|
| **A. `Accept` header** (`Accept: text/csv`) | Standards-compliant (RFC 7231), no URL changes, ASP.NET Core MVC native support | Hides behavior, harder to test/debug, less explicit for projection endpoints, `Vary: Accept` complicates caching |
| **B. Query parameter** (`?format=csv`) | Explicit, testable, bookmark-friendly, CDN-cacheable per URL, natural for Minimal APIs | New query parameter per endpoint, not pure HTTP conneg |
| **C. Separate endpoints** (`/bulk/product-details.csv`) | Cleanest separation, independent caching/versioning, no ambiguity, easy to add `.ndjson` later | Doubles endpoint count in spec (11→22), duplicates parameter definitions |
| **D. ASP.NET `FormatFilter`** (`.csv` route suffix) | Combines A+C, natively supported | Requires route changes, confusing in OpenAPI docs |

**Updated Recommendation**: **Option B** (`?format=csv`) — for these projection/bulk endpoints, explicit format selection is more appropriate than traditional conneg.

Rationale:
- The bulk endpoints are already specialized projections — format is an explicit concern, not an implicit negotiation
- `?format=csv` is clearer for ETL clients: `GET /bulk/product-details?format=csv&cursor=...&limit=1000`
- Easy to test, debug, and cache (URL is the cache key)
- Natural fit for ASP.NET Core Minimal APIs (no formatter pipeline overhead)
- Leaves room to add `?format=ndjson` or `?format=parquet` later without ambiguity
- Default (no `format` param) remains JSON for backward compatibility

**OpenAPI modeling**: This uses an `enum` query parameter rather than multiple media types in the `content` map:

```yaml
parameters:
  - name: format
    in: query
    required: false
    description: |
      Response format. When omitted, defaults to JSON (`application/json`).
      Use `csv` for RFC 4180 CSV output suitable for ETL/data warehouse ingestion.
    schema:
      type: string
      enum: [json, csv]
      default: json
```

**Alternative to keep in mind**: Option C (separate endpoints) is the cleanest long-term if multiple streaming formats are added (CSV, NDJSON, Parquet). Can migrate from B→C later if needed.

#### Streaming Format Consideration (NDJSON)

For large bulk datasets, **NDJSON** (`application/x-ndjson`) is worth considering alongside CSV:

| Format | Use Case | Streaming | Typing | Tooling |
|--------|----------|-----------|--------|---------|
| JSON (current) | SDK consumers, typed clients | ❌ Full array in memory | ✅ Full schema | NSwag, OpenAPI Generator |
| CSV | ETL, Excel, data warehouses | ✅ Row-by-row | ❌ String only | SSIS, ADF, Spark, pandas |
| NDJSON | Streaming pipelines, large datasets | ✅ Line-by-line | ✅ JSON per line | jq, Kafka, custom parsers |

If NDJSON is added later, each line would be a single data item (no envelope):
```
{"manufacturerIdGln":"1234567890123","manufacturerProductNumber":"LED-12345","productStatus":"ACTIVE"}
{"manufacturerIdGln":"9876543210987","manufacturerProductNumber":"HUE-001","productStatus":"ACTIVE"}
```

The `?format=` pattern makes this trivially extensible: `?format=ndjson`.

### Decision 2: Pagination Metadata Delivery

The JSON envelope wraps data in `{ data: [...], meta: { cursor, hasNext, ... } }`. CSV has no envelope concept.

**Mental model**: Think of metadata delivery as format-dependent enveloping:
- **JSON** → envelope in the **response body** (`data` + `meta` wrapper)
- **CSV** → envelope in the **transport layer** (HTTP headers)

This keeps the API conceptually consistent: same information, different delivery mechanism.

#### The 3 practical patterns

| Approach | Description | Best For | Trade-offs |
|----------|-------------|----------|------------|
| **1. HTTP headers** (primary) | Pagination in response headers + `Link` header (RFC 8288). CSV body is pure data. | API consumers, ETL pipelines, streaming | ✅ Cleanest, standards-based, streaming-friendly. ❌ Not visible when someone downloads the file manually. |
| **2. Comment-line metadata** (optional) | Prepend `# key=value` lines before the header row. Common in data pipeline exports (Postgres, pandas). | File downloads, data pipelines that process files offline | ✅ Human-readable, travels with the file, self-contained. ❌ Some parsers (especially Excel) choke on `#` lines. |
| **3. Separate metadata endpoint** | Client calls `GET /bulk/products/meta` for pagination info. | REST purists | ✅ Very explicit. ❌ Requires 2 calls, harder with streaming, redundant. |

#### Anti-patterns to avoid

| ❌ Don't do this | Why |
|-----------------|-----|
| Embed metadata as columns (`cursor,productId,...`) | Breaks data consistency, streaming, and tooling expectations |
| Mimic JSON envelope in CSV (`type,data\nmeta,"{cursor:...}"`) | Worst of both worlds — JSON-in-CSV defeats the purpose |
| Trailing metadata row (last CSV row = metadata) | Non-standard, breaks streaming parsers, ambiguous for consumers |

#### Recommendation: Hybrid approach

**Primary**: HTTP headers (always present for both JSON and CSV responses).
**Optional fallback**: `?meta=inline` query parameter to prepend `#` comment lines to the CSV body for file-download scenarios.

```http
# Default: headers only
GET /bulk/product-details?format=csv

# With inline metadata for offline file consumers
GET /bulk/product-details?format=csv&meta=inline
```

**Header naming** — Per RFC 6648 and Azure guidelines ("DO NOT use x- prefix"), use **non-prefixed, descriptive header names**:

```http
Link: </bulk/product-details?cursor=eyJ...&format=csv>; rel="next"
Link: </bulk/product-details?cursor=eyK...&format=csv>; rel="prev"
Pagination-Cursor: eyJpZCI6MTIzfQ==
Pagination-Has-Next: true
Pagination-Has-Prev: false
Pagination-Limit: 100
Pagination-Estimated-Total: 15234
Content-Type: text/csv; charset=utf-8; header=present
```

> **Note on `X-` prefix**: Some examples in the wild still use `X-Cursor`, `X-Total-Count`, etc. Per RFC 6648 and Microsoft Azure REST API Guidelines, new custom headers SHOULD NOT use the `X-` prefix. Our `Pagination-*` naming is the correct modern convention.

**When `?meta=inline` is set**, the CSV body includes comment-line metadata before the header row:

```csv
# cursor=eyJpZCI6MTIzfQ==
# hasNext=true
# hasPrev=false
# limit=100
# estimatedTotal=15234
manufacturerIdGln,manufacturerProductNumber,productStatus,...
1234567890123,LED-12345-A,ACTIVE,...
```

**Note**: These headers MUST also be returned for JSON responses (they duplicate `meta` info) to provide a format-agnostic pagination mechanism. This follows the principle of least surprise — the same pagination headers work regardless of format.

**Alternative considered**: Use the `Content-Range` header (RFC 7233) — but it's designed for byte ranges, not cursor pagination. Not appropriate here.

### Decision 3: Array Field Handling

**The core challenge.** 5 of 11 bulk schemas have array properties. CSV is inherently flat.

**Affected endpoints and their array fields:**

| Endpoint | Array Field(s) | Item Type |
|----------|---------------|-----------|
| `/bulk/product-details` | `productGtins[]`, `countryOfOrigin[]`, `relatedManufacturerProductGroup[]` | string values |
| `/bulk/product-descriptions` | `productKeyword[]` | string values |
| `/bulk/product-etim-classification-features` | `etimValueDetails[]` | objects (`{language, etimValueDetails}`) |
| `/bulk/trade-item-details` | `itemGtins[]` | string values |
| `/bulk/trade-item-relations` | `relatedItemGtins[]` | string values |

**6 endpoints have NO arrays** (trivially CSV-compatible):
- `/bulk/product-lca-declarations` ✅
- `/bulk/trade-item-descriptions` ✅
- `/bulk/trade-item-orderings` ✅
- `/bulk/trade-item-pricings` ✅ (already flat: 1 row per price entry)
- `/bulk/trade-item-allowance-surcharges` ✅
- `/bulk/trade-item-logistics-details` ✅

**Options for array fields:**

| Strategy | Example (`productGtins: ["8718699673826", "8719514123456"]`) | Pros | Cons |
|----------|--------------------------------------------------------------|------|------|
| **Pipe-delimited** | `8718699673826\|8719514123456` | Compact, easy to split, no CSV escaping needed (pipe not in values) | Custom convention to document |
| **JSON-in-cell** | `["8718699673826","8719514123456"]` | Lossless, standard JSON | Clients must JSON-parse individual cells — defeats CSV purpose |
| **Repeated rows** | Two rows with same key, one GTIN each | Pure CSV, each cell is scalar | Explodes row count, ambiguous which fields "belong" together, breaks 1:1 row mapping |
| **Numbered columns** | `productGtin1`, `productGtin2`, ... `productGtinN` | Each cell scalar | Unknown max column count, sparse, breaks fixed-column parsers |

**Recommendation**: **Pipe-delimited** (`|`) for simple string arrays (GTINs, country codes, keywords). The pipe character does not appear in any of the value domains (GTINs are digits only, country codes are `[A-Z]{2}`, keywords are short text). Document this convention explicitly in the API spec and CSV guide.

For the `etimValueDetails[]` object array (language+description pairs): use **semicolon-delimited** key-value pairs: `en-GB:LED Bulb;nl-NL:LED Lamp`. The colon and semicolon are unambiguous given the `languageCode:text` structure.

**Alternative recommendation**: Skip CSV for the 5 endpoints with arrays (phase 1 = easy wins only), and add them later once the array serialization convention is validated with consumers. This reduces initial scope from 11 to 6 endpoints.

### Decision 4: CSV Dialect & Conventions

Following **RFC 4180** and **ETIM xChange domain constraints**:

| Setting | Value | Standards Basis |
|---------|-------|-----------------|
| MIME type | `text/csv; charset=utf-8; header=present` | RFC 4180, RFC 7111 |
| Delimiter | `,` (comma) | RFC 4180 §2.4 |
| Quoting | Double-quote (`"`) when field contains comma, newline, or quote | RFC 4180 §2.6-2.7 |
| Encoding | UTF-8 with BOM (`\xEF\xBB\xBF`) | W3C recommendation for Excel compatibility |
| Line ending | `\r\n` (CRLF) | RFC 4180 §2.1 |
| Header row | Always present (1st row = column names in camelCase) | RFC 4180 §2.3; matches JSON property names per Azure guidelines |
| Null values | Empty cell (no text between delimiters) | Industry convention, RFC 4180 allows |
| Boolean | `true` / `false` (lowercase strings) | Consistent with JSON and Azure guidelines |
| Dates | `YYYY-MM-DD` (ISO 8601) | RFC 3339, Azure guidelines |
| Decimals | Period separator, no thousands grouping | Locale-independent, Azure guidelines |
| Column order | Composite key fields first, then alphabetical | Predictable, deterministic |

### Decision 5: OpenAPI Specification Approach

With the `?format=csv` query parameter approach, the OpenAPI modeling differs from the Accept-header approach:

**Shared format parameter** (new file):
```yaml
# openapi/shared/parameters/query/format.yaml
name: format
in: query
required: false
description: |
  Response format. Defaults to JSON when omitted.
  - `json` — Standard JSON response with `data` array and `meta` pagination object
  - `csv` — RFC 4180 CSV with header row. UTF-8 with BOM. Column names match JSON property names.
    Pagination metadata is returned in response headers (`Link`, `Pagination-*`).
schema:
  type: string
  enum: [json, csv]
  default: json
example: csv
```

**Shared meta parameter** (new file):
```yaml
# openapi/shared/parameters/query/meta.yaml
name: meta
in: query
required: false
description: |
  Controls inline metadata in CSV responses. Ignored when `format=json`.
  - `inline` — Prepend `# key=value` comment lines before the CSV header row,
    containing cursor, hasNext, hasPrev, limit, and estimatedTotal.
    Useful for offline file consumers. Pagination headers are always present regardless.
schema:
  type: string
  enum: [inline]
example: inline
```

**Each bulk endpoint** adds the `format` parameter and response headers:

```yaml
# Example: paths/bulk/product-details.yaml
get:
  operationId: getBulkProductDetails
  parameters:
    - $ref: ../../../../shared/parameters/query/cursor.yaml
    - $ref: ../../../../shared/parameters/query/limit.yaml
    - $ref: ../../../../shared/parameters/query/format.yaml    # NEW
    - $ref: ../../../../shared/parameters/query/meta.yaml      # NEW
    # ... existing params
  responses:
    '200':
      description: Successfully retrieved product details
      headers:                                                  # NEW
        Link:
          $ref: ../../../../shared/headers/link.yaml
        Pagination-Cursor:
          $ref: ../../../../shared/headers/pagination-cursor.yaml
        Pagination-Has-Next:
          $ref: ../../../../shared/headers/pagination-has-next.yaml
        Pagination-Has-Prev:
          $ref: ../../../../shared/headers/pagination-has-prev.yaml
        Pagination-Limit:
          $ref: ../../../../shared/headers/pagination-limit.yaml
        Pagination-Estimated-Total:
          $ref: ../../../../shared/headers/pagination-estimated-total.yaml
      content:
        application/json:                                       # UNCHANGED
          schema:
            $ref: ../../schemas/responses/BulkProductDetailsResponse.yaml
        text/csv:                                               # NEW
          schema:
            type: string
            description: |
              RFC 4180 CSV. First row = camelCase column headers matching
              ProductDetailsSummary JSON properties. UTF-8 with BOM. CRLF.
              Array fields use pipe (`|`) delimiter within cells.
              Returned when `format=csv` query parameter is set.
          examples:
            two-products:
              summary: CSV with two products
              value: |
                manufacturerIdGln,manufacturerProductNumber,productStatus,...
                1234567890123,LED-12345-A,ACTIVE,...
```

**OpenAPI note**: Even though format selection uses a query parameter (not `Accept` header), we still document both media types in the `content` map — this tells API consumers and code generators what response shapes are possible. The `format` parameter description explains which media type is returned for each value.

**Error response for invalid format** — Return `400 Bad Request` (not `406 Not Acceptable`) since the client explicitly requested an unsupported format value:

```yaml
# Existing 400 response covers this — validation error on format parameter
```

---

## Impact Analysis by API

### Product API (4 bulk endpoints)

| Endpoint | CSV Complexity | Array Fields | Files Changed |
|----------|---------------|--------------|---------------|
| `GET /bulk/product-details` | 🟡 Medium | 3 arrays (GTINs, countries, product groups) | `paths/bulk/product-details.yaml` |
| `GET /bulk/product-descriptions` | 🟡 Medium | 1 array (keywords) | `paths/bulk/product-descriptions.yaml` |
| `GET /bulk/product-etim-classification-features` | 🔴 Hard | 1 array of objects (multilingual value details) | `paths/bulk/product-etim-classification-features.yaml` |
| `GET /bulk/product-lca-declarations` | 🟢 Easy | None | `paths/bulk/product-lca-declarations.yaml` |

### Trade Item API (7 bulk endpoints)

| Endpoint | CSV Complexity | Array Fields | Files Changed |
|----------|---------------|--------------|---------------|
| `GET /bulk/trade-item-details` | 🟡 Medium | 1 array (GTINs) | `paths/bulk/trade-item-details.yaml` |
| `GET /bulk/trade-item-descriptions` | 🟢 Easy | None | `paths/bulk/trade-item-descriptions.yaml` |
| `GET /bulk/trade-item-orderings` | 🟢 Easy | None | `paths/bulk/trade-item-orderings.yaml` |
| `GET /bulk/trade-item-pricings` | 🟢 Easy | None | `paths/bulk/trade-item-pricings.yaml` |
| `GET /bulk/trade-item-allowance-surcharges` | 🟢 Easy | None | `paths/bulk/trade-item-allowance-surcharges.yaml` |
| `GET /bulk/trade-item-relations` | 🟡 Medium | 1 array (GTINs) | `paths/bulk/trade-item-relations.yaml` |
| `GET /bulk/trade-item-logistics-details` | 🟢 Easy | None | `paths/bulk/trade-item-logistics-details.yaml` |

### Shared Components (new files)

| File | Purpose | Standards Basis |
|------|---------|-----------------|
| `openapi/shared/parameters/query/format.yaml` | `?format=` query parameter (json, csv) | Explicit format selection |
| `openapi/shared/parameters/query/meta.yaml` | `?meta=inline` for comment-line metadata in CSV | Optional file-friendly metadata |
| `openapi/shared/headers/link.yaml` | RFC 8288 Link header for `rel="next"` / `rel="prev"` | RFC 8288 |
| `openapi/shared/headers/pagination-cursor.yaml` | Current page cursor value | Custom (no x- prefix per RFC 6648) |
| `openapi/shared/headers/pagination-has-next.yaml` | Boolean: more pages available | Custom |
| `openapi/shared/headers/pagination-has-prev.yaml` | Boolean: previous page available | Custom |
| `openapi/shared/headers/pagination-limit.yaml` | Applied page size | Custom |
| `openapi/shared/headers/pagination-estimated-total.yaml` | Approximate total count | Custom |

**Note**: No `406 Not Acceptable` response needed. With `?format=csv`, an unsupported value (e.g., `?format=xml`) is a **400 Bad Request** (enum validation failure), which is already covered by existing error responses.

### Regenerated Bundles

Both `generated/product-api.yaml` and `generated/tradeitem-api.yaml` must be regenerated after changes.

### Documentation

- Create `docs/csv-output.md` documenting CSV dialect, array conventions, header-based pagination
- Update `README.md` with CSV support section
- Update copilot instructions with CSV conventions

---

## Code Generation Impact

**Critical consideration**: OpenAPI code generators (NSwag, OpenAPI Generator) will **NOT** generate CSV parsing code.

| Aspect | JSON Path | CSV Path |
|--------|-----------|----------|
| Schema | Typed DTOs generated automatically | `type: string` — raw body returned |
| Pagination | Deserialized from `meta` object | Must parse `Link` / `Pagination-*` headers |
| Array handling | Native JSON arrays | Must split pipe-delimited values |
| Null handling | JSON `null` | Empty cell — parser must infer |
| Type safety | Full compile-time types | No type safety — manual parsing |

**Assessment**: This is **acceptable** for the target audience (ETL/data warehouse clients) who:
1. Already have CSV ingestion pipelines (SSIS, Azure Data Factory, Spark, etc.)
2. Prefer CSV over JSON for tabular data loading
3. Don't use generated SDKs for bulk data pipelines

**For SDK consumers**, the JSON path remains the primary and fully-typed option. CSV is a supplementary format for data engineering use cases.

---

## Alternative Approach Considered: Async Data Export

Instead of inline CSV in the REST response, an alternative pattern used by enterprise APIs:

```
POST /bulk/product-details:export?format=csv  →  202 Accepted + Location header
GET  /exports/{id}                             →  200 { status: "complete", downloadUrl: "..." }
GET  {downloadUrl}                             →  200 (full CSV file)
```

**Pros**: No pagination needed (full dataset), can generate in background, signed URL for CDN delivery, Azure Blob Storage integration.
**Cons**: More complex, requires job management, not real-time, adds latency, different consumption pattern.

This may be worth considering as a **separate, complementary** feature for full-catalog exports, while inline CSV serves the paginated incremental sync use case.

---

## Phased Approach (Recommended)

### Phase 1: Foundation + Easy Wins (6 endpoints, no array fields)
- Shared: format + meta query parameters, pagination header components
- Product: `/bulk/product-lca-declarations`
- Trade Item: descriptions, orderings, pricings, allowance-surcharges, logistics-details
- Documentation: CSV guide, README

### Phase 2: String Arrays (4 endpoints)
- Product: details (GTINs, countries, groups), descriptions (keywords)
- Trade Item: details (GTINs), relations (GTINs)
- Requires: documented pipe-delimiter convention validated with consumers

### Phase 3: Object Arrays (1 endpoint)
- Product: etim-classification-features (`etimValueDetails[]`)
- Requires: validated multilingual serialization convention

## Implementation TODOs

1. **Confirm design decisions** — `?format=csv` query param, array handling, CSV dialect, header naming, NDJSON (future?)
2. **Create shared components** — format + meta query parameters + 6 pagination header YAML files
3. **Phase 1 — Add `text/csv` + format param to 6 easy endpoints** — path file changes + CSV examples
4. **Phase 2 — Add `text/csv` + format param to 4 medium endpoints** — with pipe-delimiter array convention
5. **Phase 3 — Add `text/csv` + format param to 1 hard endpoint** — multilingual object arrays
6. **Register new components** — in both product and tradeitem `openapi.yaml` files
7. **Regenerate bundles** — both APIs via Redocly
8. **Lint validation** — ensure Redocly passes for all APIs
9. **Documentation** — CSV guide, README update, copilot instructions update

## Estimated Scope

- **New files**: ~9 shared components (2 parameters + 6 headers + 1 documentation file)
- **Modified files**: 11 path files (one per endpoint) + 2 openapi.yaml (component registration) + 2 generated bundles
- **Risk**: 🟡 Public API surface change — adding a format parameter and CSV responses is additive (non-breaking) but establishes a long-term contract for CSV format, pagination headers, and array serialization conventions

---

## Server-Side Implementation Impact

> This repository is **spec-only** — it contains no server code. The following describes what changes would be required in the **downstream ASP.NET Core services** that implement these APIs.

### 1. Format-Aware Response Handling (Core Change — Minimal API Pattern)

With the `?format=csv` approach and Minimal APIs, the implementation is **explicit and transparent** rather than hidden behind MVC formatters:

```csharp
// Clean pattern for bulk endpoints with Minimal APIs
app.MapGet("/bulk/product-details", async (
    string? format,
    string? meta,
    string? cursor,
    int? limit,
    HttpResponse response,
    IProductBulkService service) =>
{
    var result = await service.GetBulkProductDetails(cursor, limit);
    
    // Set pagination headers (always, regardless of format)
    SetPaginationHeaders(response, result.Meta);
    
    return format switch
    {
        "csv" => Results.Text(
            ToCsv(result.Data, CsvProfile.ProductDetails, 
                   inlineMeta: meta == "inline" ? result.Meta : null), 
            "text/csv; charset=utf-8; header=present"),
        _ => Results.Json(result)  // default: JSON with envelope
    };
});
```

**Per-model CSV serialization** — A `CsvProfile` or similar abstraction per domain model:

```csharp
// Each Summary type has a CsvProfile defining column order, null handling, array serialization
public static class CsvProfile
{
    public static readonly CsvMapping<ProductDetailsSummary> ProductDetails = new()
    {
        Columns = [
            ("manufacturerIdGln", x => x.ManufacturerIdGln),
            ("manufacturerProductNumber", x => x.ManufacturerProductNumber),
            ("productStatus", x => x.ProductStatus?.ToString()),
            ("productGtins", x => PipeDelimited(x.ProductGtins)),  // array → pipe
            // ... all fields in deterministic order
        ]
    };
}
```

**Key advantages over MVC formatter approach:**
- No hidden behavior — the format switch is visible in the endpoint
- No formatter pipeline overhead for bulk data
- Easy to add streaming for CSV (write header, then stream rows)
- Each endpoint controls its own CSV shape explicitly
- Easy to add NDJSON later: `"ndjson" => StreamNdJson(response, result.Data)`

### 2. Pagination Headers (Shared Helper)

With the Minimal API pattern, pagination headers are set via a shared helper rather than an action filter:

```csharp
// Simple, explicit, testable
static void SetPaginationHeaders(HttpResponse response, CursorPaginationMetadata meta)
{
    response.Headers["Pagination-Cursor"] = meta.Cursor;
    response.Headers["Pagination-Has-Next"] = meta.HasNext.ToString().ToLower();
    response.Headers["Pagination-Has-Prev"] = meta.HasPrev.ToString().ToLower();
    response.Headers["Pagination-Limit"] = meta.Limit.ToString();
    if (meta.EstimatedTotal.HasValue)
        response.Headers["Pagination-Estimated-Total"] = meta.EstimatedTotal.ToString();
    
    // RFC 8288 Link header
    if (meta.HasNext && meta.Cursor != null)
        response.Headers.Append("Link", $"<{BuildNextUrl(meta.Cursor)}>; rel=\"next\"");
    if (meta.HasPrev && meta.PrevCursor != null)
        response.Headers.Append("Link", $"<{BuildPrevUrl(meta.PrevCursor)}>; rel=\"prev\"");
}
```

**Key design choice**: These headers are emitted for **both JSON and CSV** responses:
- JSON clients can **optionally** use headers instead of parsing `meta` from the body
- CSV clients **must** use headers (no body envelope)
- Format-agnostic pagination libraries work regardless of `?format=` value
- This is additive and non-breaking for existing JSON consumers

### 3. Impact on Existing NSwag-Generated Clients (Minimal)

With the `?format=csv` query parameter approach, NSwag-generated clients will:
- **Add an optional `format` parameter** to each bulk method (with `json` as default) — this is additive, not breaking
- **Continue to JSON-parse responses** when `format` is omitted or `"json"` — identical to current behavior
- **If `format=csv` is passed**: the generated client will still try to JSON-parse, which will fail — but this is by design; ETL clients use raw HTTP, not generated SDKs
- **Ignore unknown response headers** — new `Pagination-*` headers are invisible to existing clients

**Verdict**: ✅ **No breaking changes.** Existing consumers that don't pass `format` continue working identically. The new parameter has a default value that preserves current behavior.

### 4. Impact on Response DTOs / Domain Models

**No changes needed.** With the Minimal API pattern, there's no need for a shared `IBulkResponse` interface — each endpoint explicitly accesses `result.Data` and `result.Meta` at the call site. The existing `*Summary` domain models and `Bulk*Response` wrappers remain unchanged.

The CSV serialization reads the same properties the JSON serializer reads — it's just a different output pipeline.

### 5. Infrastructure Changes

| Area | Change Required | Impact |
|------|----------------|--------|
| **`Vary` header** | Not needed — format is determined by query param, not `Accept` | Cache key already includes query string |
| **CORS** | Expose new pagination headers in `Access-Control-Expose-Headers` | Required if browser-based clients exist (unlikely for M2M APIs) |
| **API Gateway** | Ensure query params are forwarded (standard behavior) | Most gateways do this by default |
| **Rate limiting** | Review per-request limits — CSV responses may differ in size from JSON | CSV is typically smaller (no JSON syntax overhead) so no tightening needed |
| **Monitoring** | Add `format` param value to request metrics | Track JSON vs CSV adoption |
| **Logging** | Log `format` param value for troubleshooting | Standard practice |

### 6. Testing Requirements

| Test Category | What to Verify |
|---------------|---------------|
| **Format parameter** | `?format=csv` → CSV, `?format=json` → JSON, no param → JSON, `?format=xml` → 400 Bad Request |
| **CSV format** | RFC 4180 compliance, UTF-8 BOM present, CRLF line endings, header row matches JSON properties |
| **Pagination headers** | `Link`, `Pagination-Cursor`, `Pagination-Has-Next` etc. match `meta` object values |
| **Column ordering** | Composite key columns first, remaining columns in deterministic order |
| **Null handling** | Null values → empty cells (not "null" string) |
| **Array serialization** | Pipe-delimited GTINs, country codes, keywords |
| **Decimal precision** | Same precision as JSON (`format: decimal`, up to 4 decimal places) |
| **Enum values** | String representation matches JSON (e.g., "ACTIVE", "C62") |
| **Regression** | Existing JSON responses unchanged, NSwag-generated clients still work |
| **Performance** | CSV response time comparable to JSON (CSV serialization is typically faster) |

### 7. Summary: Server-Side Effort Estimate

| Component | Estimated Effort | Risk |
|-----------|-----------------|------|
| Per-endpoint format switch (Minimal API) | Small–Medium | 🟢 Explicit, no hidden behavior |
| `CsvProfile` per Summary model | Medium (× 11 endpoints) | 🟡 Must match JSON property names exactly |
| `SetPaginationHeaders` helper | Small | 🟢 Straightforward shared function |
| Infrastructure (`Vary`, CORS, etc.) | Small | 🟢 Configuration only |
| Testing (format param + CSV format) | Medium | 🟡 Need comprehensive format validation |

**Total**: **Medium effort** — simpler than the MVC formatter approach. Each endpoint has an explicit format switch, and `CsvProfile` mappings are the main per-model work. No framework magic, no hidden content negotiation pipeline.

---

## Client-Side Impact Summary

| Consumer Type | Impact | Action Required |
|---------------|--------|----------------|
| **NSwag-generated C# SDKs** | ✅ None | No changes. Generated methods get an optional `format` parameter (defaults to json). |
| **OpenAPI Generator (Java/Python/etc.)** | ✅ None | Same — `format` param is optional with json default. |
| **ETL pipelines (SSIS, ADF, Spark)** | 🟢 New capability | Add `?format=csv` to URL. Parse `Pagination-*` headers for cursor-based pagination. |
| **Custom HTTP clients** | 🟢 Optional | Add `?format=csv` when CSV is preferred. No breaking change. |
| **API documentation (Redoc/Swagger UI)** | 🟢 Enhanced | Shows both media types; format enum visible in parameter docs. |

---

## Open Questions for Decision

1. ~~Should we use Accept header or query parameter?~~ → **Decided: `?format=csv` query parameter** (explicit, testable, natural for projection endpoints)
2. ~~Should pagination headers be returned for JSON responses too?~~ → **Decided: Both formats** (format-agnostic). Primary: HTTP headers (always). Optional: `?meta=inline` for `#` comment-line metadata in CSV body (file-download scenarios).
3. Phase 1 only (6 endpoints) or all 11 at once?
4. Pipe-delimited arrays or defer array endpoints entirely?
5. Is the async export pattern worth exploring in parallel for full-catalog exports?
6. Should NDJSON be included in the initial `format` enum, or added later?
7. ~~Generic reflection-based CSV formatter vs per-model?~~ → **Decided: Per-model CsvProfile with Minimal API pattern** (explicit, no hidden behavior)
