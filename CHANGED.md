# What Changed

All changes on the `tradeitem` branch since diverging from `main`.

---

## New Trade Item Endpoints

Two new endpoint pairs (single + bulk) added to the Trade Item API:

| Endpoint | Single path | Bulk path |
|----------|-------------|-----------|
| **Relations** | `/trade-items/{gln}/{itemNumber}/relations` | `/trade-items/bulk/relations` |
| **Logistics Details** | `/trade-items/{gln}/{itemNumber}/logistics-details` | `/trade-items/bulk/logistics-details` |

New domain schemas: `ItemRelationSummary`, `ItemLogisticsSummary`.

New response schemas: `TradeItemRelationsResponse(Data)`, `TradeItemLogisticsDetailsResponse(Data)`, and their bulk counterparts.

Removed unused schemas: `ItemIdentification`, `TradeItem`, `TradeItemDetails`, `TradeItemDetailsSummary`.

---

## Description Field Relocation

Moved `discountGroupDescription` and `bonusGroupDescription` from the **details** schemas to the **descriptions** schemas. These are multilanguage fields that belong with the other per-language descriptions, not in the language-independent details.

- **Removed from**: `TradeItemDetails`, `TradeItemDetailsSummary`, details path examples
- **Added to**: `ItemDescription`, `ItemDescriptionsSummary`, descriptions path examples (single + bulk)

---

## LCA Schema Completion

- Removed `epdRegistrationNumber` and `epdUri` from `LcaEnvironmental` (API extension fields not in ETIM xChange V2.0 source)
- Added 10 ETIM EPD metadata fields to `ProductLcaDeclarationSummary`: `epdValidityStartDate` (required), `epdValidityExpiryDate`, `epdOperatorName`, `epdOperatorUri`, `operatorEpdId`, `manufacturerEpdId`, `productCategoryRulesDescription`, `productCategoryRulesUri`, `productSpecificRulesDescription`, `productSpecificRulesUri`
- Updated bulk endpoint and response schema descriptions for parent context
- Updated examples to consistently repeat EPD parent context per product

---

## API Consistency Fixes

### OAuth2 Standardization

All four APIs now use OAuth 2.0 Client Credentials with a consistent configuration:

| API | Before | After |
|-----|--------|-------|
| Product | `bearerAuth` (HTTP Bearer) | `oauth2` (`read:products`) |
| Trade Item | OAuth2 with `authorize.2ba.nl` tokenUrl | OAuth2 with standardized tokenUrl |
| Net Price | `apiKeyAuth` | `oauth2` (`read:netprices`) |
| Stock | `apiKeyAuth` with `auth.2ba.nl` tokenUrl | `oauth2` (`read:stock`) |

All descriptions now document both `client_secret` and `client_assertion` (RFC 7523).

### Component Naming & Registration

- **ErrorResponse → ProblemDetails**: Trade Item and Net Price APIs registered the shared `ProblemDetails.yaml` as `ErrorResponse`. Renamed to `ProblemDetails` to match Product API and prevent NSwag from generating two incompatible types.
- **TradeItemResponseData wrapper**: Added `TradeItemResponseData.yaml` with composite keys + domain sub-schema refs, following the `*ResponseData` pattern used by all other responses. Prevents NSwag from generating an anonymous inline type.
- **Language parameter**: Registered in Trade Item API `components/parameters`, matching Product API.
- **Unused Products tag**: Removed from Product API (only `Products single` and `Products bulk` are used).

### $ref Quoting

Removed unnecessary single quotes from 166 file-path `$ref` values across 24 source files. Unquoted style matches OpenAPI 3.1.0 spec examples, YAML 1.2.2 plain scalar convention, and the Product API's existing style. No semantic change.

---

## Implementer-Agnostic Refactor

### Server URLs

**Before**: Hardcoded 2BA-specific server URLs per API.

```yaml
servers:
  - url: https://rest.2ba.nl/v1/products
  - url: https://rest.accept.2ba.nl/v1/products
```

**After**: Parameterized server URL with implementer variables.

```yaml
servers:
  - url: https://{host}{basePath}/v1
    variables:
      host:
        default: api.example.com
      basePath:
        default: ''
```

Each implementer substitutes their own `host` and optional `basePath` (e.g. `/api`).

### Path Keys

Resource names moved from `servers.url` into `paths`, making the full URL contract visible in the spec.

| API | Before | After |
|-----|--------|-------|
| Product | `/{gln}/{productNumber}/details` | `/products/{gln}/{productNumber}/details` |
| Trade Item | `/{gln}/{itemNumber}/details` | `/trade-items/{gln}/{itemNumber}/details` |
| Net Price | `/{gln}/item-number/{itemNumber}` | `/netprices/{gln}/item-number/{itemNumber}` |
| Stock | `/{gln}/{itemNumber}` | `/stock/{gln}/{itemNumber}` |

### Bulk Path Naming

Dropped redundant resource prefix from bulk paths and aligned aspect names to match single-item endpoints.

#### Product API

| Before | After |
|--------|-------|
| `/bulk/product-details` | `/products/bulk/details` |
| `/bulk/product-descriptions` | `/products/bulk/descriptions` |
| `/bulk/product-etim-classification-features` | `/products/bulk/etim-classifications` |
| `/bulk/product-lca-declarations` | `/products/bulk/lca-environmental` |

#### Trade Item API

| Before | After |
|--------|-------|
| `/bulk/trade-item-details` | `/trade-items/bulk/details` |
| `/bulk/trade-item-descriptions` | `/trade-items/bulk/descriptions` |
| `/bulk/trade-item-orderings` | `/trade-items/bulk/orderings` |
| `/bulk/trade-item-pricings` | `/trade-items/bulk/pricings` |
| `/bulk/trade-item-allowance-surcharges` | `/trade-items/bulk/allowance-surcharges` |
| `/bulk/trade-item-relations` | `/trade-items/bulk/relations` |
| `/bulk/trade-item-logistics-details` | `/trade-items/bulk/logistics-details` |

### OAuth Token URL

**Before**: Hardcoded 2BA identity server.

```yaml
tokenUrl: https://identity.2ba.nl/connect/token
```

**After**: Implementer-agnostic placeholder with description.

```yaml
tokenUrl: https://auth.example.com/connect/token
```

Each implementer provides their own OAuth 2.0 authorization server.

### ProblemDetails Examples

**Before**: 2BA-specific type URIs and instance fields.

```yaml
type: "https://api.product.2ba.nl/problems/not-found"
title: "Product Not Found"
status: 404
detail: "No product found with manufacturer GLN '1234567890123' and product number '929002376910'"
instance: "https://api.product.2ba.nl/v1/products/1234567890123/929002376910/details"
```

**After**: RFC 7807 `about:blank` default, no instance field.

```yaml
type: about:blank
title: Not Found
status: 404
detail: "No product found with manufacturer GLN '1234567890123' and product number '929002376910'"
```

### Redocly Config

- `no-server-example.com` rule set to `off` (deliberate use of `api.example.com` placeholder)

---

## Documentation

- **copilot-instructions.md**: Added conventions for security scheme, tag naming, component registration, `$ref` quoting, generated bundle lifecycle (items 11–15)
- **design-decisions.md**: Added Security & Authentication section, Server URL Pattern section; updated bulk path examples, ProblemDetails convention
- **initial-setup.md**: Split bundle commands into `dist/` (gitignored) vs `generated/` (git-tracked); added regeneration guidance
- **GOVERNANCE.md**: Fixed `/api/v1/` → `/v1/` versioning example
- **best-practices.md**: Fixed `/api/v1/user-profiles` → `/v1/user-profiles`
- **implementer-guide.md**: New file — URL contract, OAuth setup, scope naming, pagination, error responses

---

## Regenerated Bundles

- `openapi/apis/product/generated/product-api.yaml`
- `openapi/apis/tradeitem/generated/tradeitem-api.yaml`
- `openapi/apis/product/generated/product.html`
- `openapi/apis/tradeitem/generated/tradeitem.html`
