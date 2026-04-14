# ETIM xChange TradeItem OpenAPI 3.1 Generation Prompt

## Objective
Generate a comprehensive OpenAPI 3.1 specification for the **TradeItem** part of the ETIM xChange V2.0 schema, creating bulk services with cursor-based pagination and minimal nesting.

## Context Files
- **Source Schema**: `resources/etim-xchange/ETIM xChange_Schema_V2-0_beta_2025-10-13.json` (TradeItem section starting at line 1690)
- **Project Standards**: `.github/copilot-instructions.md`
- **Best Practices**: `docs/best-practices.md`
- **Envelope Pattern**: `docs/envelope-pattern.md`

## Requirements

### 1. OpenAPI 3.1 / JSON Schema 2020-12 Standards
- Use `type: ["string", "null"]` for nullable fields (NOT `nullable: true`)
- Use `examples` array (plural) in schemas, not `example` (singular)
- Include `format` for type hints: `uri`, `email`, `date`, `uuid`, etc.
- Use `minLength`, `maxLength`, `minimum`, `maximum` for validation
- Allow `additionalProperties` throughout the object model, including nested models, so optional fields can be added without breaking clients
- Use `anyOf`, `oneOf`, `allOf` for composition patterns
- Prefer `const` over single-value `enum` for literal values
- **Convert ETIM xChange string-based numeric fields to proper `number` type** (see section 2.1)

#### 2.1. Numeric Field Conversion

**CRITICAL**: ETIM xChange schema stores all numeric values as strings with patterns (e.g., `"pattern": "^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$"`). 
The OpenAPI specification MUST convert these to proper `number` type with appropriate constraints.

**Conversion Rules**:

| ETIM xChange Pattern | OpenAPI Type | Constraints | Example Fields |
|---------------------|--------------|-------------|----------------|
| `^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 99999999999.9999` | Price, weight, dimensions, quantities |
| `^[0-9]{1,5}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 99999.9999` | PriceQuantity, factors |
| `^[0-9]{1,12}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 999999999999.9999` | Large measurements |
| `^[-]{0,1}[0-9]{1,12}[.]{0,1}[0-9]{0,4}$` | `number` | `multipleOf: 0.0001`, `minimum: -999999999999.9999`, `maximum: 999999999999.9999` | Signed values |

**Example Conversions**:

```yaml
# ETIM xChange (string) ❌
NetPrice:
  type: "string"
  pattern: "^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$"

# OpenAPI (number) ✅ CORRECT
netPrice:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999999999.9999
  description: |
    Net price of the trade item. Supports up to 4 decimal places for precise pricing.
    
    **ETIM xChange**: `NetPrice` (string with pattern)  
    **Path**: `Supplier[].Product[].TradeItem[].Pricing[].NetPrice`
  examples:
    - 12345.67
    - 99.99
    - 0.01

# ETIM xChange (string) ❌
PriceQuantity:
  type: "string"
  pattern: "^[0-9]{1,5}[.]{0,1}[0-9]{0,4}$"

# OpenAPI (number) ✅ CORRECT
priceQuantity:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999.9999
  description: |
    Quantity for which the price applies.
    
    **ETIM xChange**: `PriceQuantity` (string with pattern)  
    **Path**: `Supplier[].Product[].TradeItem[].Pricing[].PriceQuantity`
  examples:
    - 1
    - 10.5
    - 100

# ETIM xChange (string) ❌
MinimumOrderQuantity:
  type: "string"
  pattern: "^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$"

# OpenAPI (number) ✅ CORRECT
minimumOrderQuantity:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999999999.9999
  description: |
    Minimum quantity that must be ordered.
    
    **ETIM xChange**: `MinimumOrderQuantity` (string with pattern)  
    **Path**: `Supplier[].Product[].TradeItem[].Ordering.MinimumOrderQuantity`
  examples:
    - 1
    - 10.5
    - 500

# ETIM xChange (string) ❌
BaseItemNetWeight:
  type: "string"
  pattern: "^[0-9]{1,12}[.]{0,1}[0-9]{0,4}$"

# OpenAPI (number) ✅ CORRECT
baseItemNetWeight:
  type: ["number", "null"]
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 999999999999.9999
  description: |
    Net weight of the base item in specified unit.
    
    **ETIM xChange**: `BaseItemNetWeight` (string with pattern)  
    **Path**: `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetWeight`
  examples:
    - 1.5
    - 0.025
    - 1250.75
```

**Fields to Convert** (non-exhaustive list):
- **All pricing fields**: `NetPrice`, `GrossListPrice`, `RecommendedRetailPrice`, `PriceQuantity`, `PriceUnitFactor`
- **All ordering quantities**: `MinimumOrderQuantity`, `OrderStepSize`, `MaximumOrderQuantity`
- **All measurements**: `BaseItemNetLength`, `BaseItemNetWidth`, `BaseItemNetHeight`, `BaseItemNetDiameter`, `BaseItemNetWeight`
- **Packaging dimensions**: `GrossLength`, `GrossWidth`, `GrossHeight`, `GrossDiameter`, `GrossWeight`
- **All factors and multipliers**: `FactorCustomsCommodityCode`, `ContentQuantity`
- **Related item quantities**: `RelatedItemQuantity`, `QuantityInParent`

**Integer-Only Fields**: Keep as `integer` type for true integers (e.g., `ShelfLifePeriod`, `WarrantyConsumer`, `PackagingUnitLevel`)

#### 2.2. Nullable Fields

**CRITICAL**: ETIM xChange schema doesn't explicitly distinguish between nullable and optional fields. For OpenAPI 3.1, use proper nullable types.

**Pattern for Nullable Fields**:
```yaml
# Required field (not nullable)
minimalItemDescription:
  type: string
  minLength: 1
  maxLength: 80
  description: |
    Minimal description of the trade item.
    
    **ETIM xChange**: `MinimalItemDescription`
    **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemDescriptions[].MinimalItemDescription`

# Optional field that can be null
supplierAltItemNumber:
  type: ["string", "null"]
  minLength: 1
  maxLength: 35
  description: |
    Alternative supplier item number. Optional field that may be omitted or explicitly null.
    
    **ETIM xChange**: `SupplierAltItemNumber`
    **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierAltItemNumber`
  examples:
    - "ALT-SKU-001"
    - null

# Nullable numeric field
baseItemNetWeight:
  type: ["number", "null"]
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 999999999999.9999
  description: |
    Net weight of the base item. Can be null if weight is not applicable.
    
    **ETIM xChange**: `BaseItemNetWeight` (string with pattern)
    **Path**: `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetWeight`
  examples:
    - 1.5
    - 0.025
    - null
```

**Guidelines**:
- Use `type: ["string", "null"]` for optional string fields
- Use `type: ["number", "null"]` for optional numeric fields
- Use `type: ["boolean", "null"]` for optional boolean fields
- Use `type: ["array", "null"]` for optional arrays
- Do NOT add field to `required` array if it can be null/omitted
- Always include `null` in examples when field is nullable

#### 2.3. String Boolean Enums

**ETIM xChange Issue**: Some fields use string enums for boolean-like values (e.g., `"true"`, `"false"`, `"exempt"`).

**ETIM Pattern**:
```json
"RohsIndicator": {
  "type": "string",
  "enum": ["true", "false", "exempt"]
}
```

**OpenAPI 3.1 Pattern - Keep as String Enum**:
```yaml
rohsIndicator:
  type: ["string", "null"]
  enum: ["true", "false", "exempt", null]
  description: |
    RoHS (Restriction of Hazardous Substances) compliance indicator.
    - "true": RoHS compliant
    - "false": Not RoHS compliant
    - "exempt": RoHS exempt under specific exemption
    
    **ETIM xChange**: `RohsIndicator`
    **Path**: `Supplier[].Product[].TradeItem[].Legislation.RohsIndicator`
  examples:
    - "true"
    - "exempt"

reachIndicator:
  type: ["string", "null"]
  enum: ["true", "false", "no data", null]
  description: |
    REACH (Registration, Evaluation, Authorisation of Chemicals) indicator.
    - "true": Contains SVHC substances
    - "false": Does not contain SVHC substances
    - "no data": REACH status unknown
    
    **ETIM xChange**: `ReachIndicator`
    **Path**: `Supplier[].Product[].TradeItem[].Legislation.ReachIndicator`
  examples:
    - "false"
    - "no data"
```

**Do NOT convert these to boolean** - keep as string enums because they have more than two states.

#### 2.4. Date Format Enhancement

**ETIM xChange Pattern**:
```json
"ItemValidityDate": {
  "type": "string",
  "format": "date"
}
```

**OpenAPI 3.1 Enhanced Pattern**:
```yaml
itemValidityDate:
  type: ["string", "null"]
  format: date
  description: |
    Date from which the trade item is valid for ordering. ISO 8601 date format (YYYY-MM-DD).
    
    **ETIM xChange**: `ItemValidityDate`
    **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemValidityDate`
  examples:
    - "2025-01-15"
    - "2024-06-01"

itemObsolescenceDate:
  type: ["string", "null"]
  format: date
  description: |
    Date when the trade item becomes obsolete and is no longer available for ordering.
    ISO 8601 date format (YYYY-MM-DD).
    
    **ETIM xChange**: `ItemObsolescenceDate`
    **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemObsolescenceDate`
  examples:
    - "2026-12-31"
    - null
```

**Date Field Guidelines**:
- Always use `format: date` for date-only fields (not datetime)
- Include explicit description: "ISO 8601 date format (YYYY-MM-DD)"
- Provide realistic examples in YYYY-MM-DD format
- Make nullable with `type: ["string", "null"]` if date is optional
- Common date fields: `itemValidityDate`, `itemObsolescenceDate`, `catalogueValidityStart`, `catalogueValidityEnd`, `generationDate`

#### 2.5. Catalog-Level Field Denormalization (`CurrencyCode` and `Language`)

**CRITICAL**: In the ETIM xChange schema, `CurrencyCode` and `Language` are defined **once at the catalogue root level** and apply to all records in the catalogue. In the OpenAPI specification, these fields are **denormalized** (copied) into each record that uses them, making them **required and non-nullable**.

**ETIM xChange Catalogue Root**:
```json
"CurrencyCode": {"type": "string", "pattern": "^[A-Z]{3}$"},
"Language": {"type": "array", "uniqueItems": true, "items": {"type": "string", "pattern": "^[a-z]{2}[-][A-Z]{2}$"}}
```

**Denormalization Rules**:

| Catalog-Level Field | Denormalized Into | OpenAPI Property | Required | Nullable | $ref |
|--------------------|--------------------|------------------|----------|----------|------|
| `CurrencyCode` | Every pricing record | `currencyCode` | ✅ | ❌ | `CurrencyCode.yaml` |
| `Language` | Every description record (`ItemDescriptions[]`) | `descriptionLanguage` | ✅ | ❌ | `LanguageCode.yaml` |
| `Language` | Every multilingual sub-array item (e.g., `AllowanceSurchargeDescription[]`, `EtimValueDetails[]`, `AttachmentDescription[]`, `DiscountGroupDescription[]`, `BonusGroupDescription[]`) | `language` | ✅ | ❌ | `LanguageCode.yaml` |

**Implementation Pattern**:

```yaml
# ✅ CORRECT — Required, non-nullable, plain $ref
currencyCode:
  description: |
    Currency code for all monetary values in this pricing entry.
    Sourced from ETIM xChange `CurrencyCode` at catalog level.
  $ref: ../../../../shared/schemas/common/CurrencyCode.yaml
  examples:
    - EUR

descriptionLanguage:
  description: |
    Language code for the description in ISO 639-1 and ISO 3166-1 format (e.g., "en-GB", "de-DE").
    Sourced from ETIM xChange `Language` at catalog level, denormalized into each description record.
    **ETIM xChange**: `DescriptionLanguage`
    **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemDescriptions[].DescriptionLanguage`
  $ref: ../../../../shared/schemas/common/LanguageCode.yaml
  examples:
    - "en-GB"
    - "de-DE"
    - "nl-NL"

# For multilingual sub-array items (e.g., inside AllowanceSurchargeDescription[]):
language:
  description: |
    Language code for the description.
    Sourced from ETIM xChange `Language` at catalog level, denormalized into each description record.
  $ref: ../../../../shared/schemas/common/LanguageCode.yaml
```

```yaml
# ❌ INCORRECT — Do NOT use anyOf with null for denormalized catalog-level fields
descriptionLanguage:
  anyOf:
    - $ref: ../../../../shared/schemas/common/LanguageCode.yaml
    - type: "null"
```

**Key Points**:
- These fields MUST be in the `required` array of their parent object
- Use plain `$ref` — NOT `anyOf: [$ref, type: "null"]`
- Description should note: "Sourced from ETIM xChange `CurrencyCode`/`Language` at catalog level"
- The `LanguageCode` format is locale-based: `^[a-z]{2}[-][A-Z]{2}$` (e.g., `"en-GB"`, `"nl-NL"`, `"de-DE"`)
- Apply consistently to ALL schemas that contain language or currency properties

### 2. Naming Conventions

#### File Naming
- **PascalCase** for schema files: `TradeItem.yaml`, `ItemIdentification.yaml`, `ItemPricing.yaml`
- **kebab-case** for parameter/response files: `selection-id.yaml`, `mutation-date.yaml`

#### Component Names (for $ref)
- **PascalCase** for ALL component references: `TradeItem`, `ItemIdentification`, `SelectionId`
- Component keys must match regex: `^[a-zA-Z0-9\.\-_]+$`

#### Schema Properties & Parameters
- **camelCase** for properties: `supplierItemNumber`, `itemGtin`, `mutationDateTime`
- **camelCase** for parameter names: `supplierIdGln`, `selectionId`, `mutationDateTime`
- **camelCase** for operationIds: `getBulkTradeItemDetails`, `getTradeItemDetails`

#### API Paths
- **kebab-case** for path segments: `/trade-items/bulk/details`, `/trade-items/bulk/orderings`
- Bulk endpoints follow the `/{resource}/bulk/{aspect}` pattern (e.g., `/trade-items/bulk/pricings`)
- No resource-name prefix in aspect (just `details`, not `trade-item-details`)

### 3. Architecture & Structure

#### Directory Structure
```
openapi/apis/tradeitem/
├── openapi.yaml                          # Main API spec (includes single + bulk)
├── openapi-domain.yaml                   # Domain model documentation API (tradeitem-domain@v1)
├── README.md
├── paths/
│   ├── bulk/                             # Bulk endpoints (under /trade-items/bulk/{aspect})
│   │   ├── details.yaml                  # GET /trade-items/bulk/details
│   │   ├── descriptions.yaml             # GET /trade-items/bulk/descriptions
│   │   ├── orderings.yaml                # GET /trade-items/bulk/orderings
│   │   ├── pricings.yaml                 # GET /trade-items/bulk/pricings
│   │   ├── allowance-surcharges.yaml     # GET /trade-items/bulk/allowance-surcharges
│   │   ├── relations.yaml                # GET /trade-items/bulk/relations
│   │   └── logistics-details.yaml        # GET /trade-items/bulk/logistics-details
│   ├── trade-items.yaml                  # GET /trade-items/{supplierIdGln}/{supplierItemNumber}
│   ├── trade-item-details.yaml           # GET /trade-items/{key}/details
│   ├── trade-item-descriptions.yaml      # GET /trade-items/{key}/descriptions
│   ├── trade-item-orderings.yaml         # GET /trade-items/{key}/orderings
│   ├── trade-item-pricings.yaml          # GET /trade-items/{key}/pricings
│   ├── trade-item-allowance-surcharges.yaml # GET /trade-items/{key}/allowance-surcharges
│   ├── trade-item-relations.yaml         # GET /trade-items/{key}/relations
│   └── trade-item-logistics-details.yaml # GET /trade-items/{key}/logistics-details
└── schemas/
    ├── domain/                           # Domain models
    │   ├── TradeItemDetails.yaml         # Without key (for nested single-item)
    │   ├── TradeItemDetailsSummary.yaml  # WITH key (for bulk retrieval)
    │   ├── ItemDescription.yaml          # Single description record
    │   ├── ItemDescriptionsSummary.yaml  # WITH key (for bulk descriptions)
    │   ├── TradeItemOrdering.yaml        # Without key (for nested single-item)
    │   ├── TradeItemOrderingsSummary.yaml # WITH key (for bulk retrieval)
    │   ├── TradeItemPricing.yaml         # Without key (for nested single-item, includes pricingRef)
    │   ├── TradeItemPricingsSummary.yaml  # WITH key (for bulk retrieval, 1 row per price)
    │   ├── AllowanceSurcharge.yaml       # Without key (single-item)
    │   ├── AllowanceSurchargeSummary.yaml # WITH key (for bulk, join via pricingRef)
    │   ├── ItemRelation.yaml             # Without key (single-item)
    │   ├── ItemRelationSummary.yaml      # WITH key (for bulk retrieval)
    │   ├── ItemLogistics.yaml            # Without key (single-item)
    │   ├── ItemLogisticsSummary.yaml     # WITH key (for bulk retrieval)
    │   ├── PackagingUnit.yaml
    │   ├── ItemCountrySpecificField.yaml
    │   ├── ItemDetails.yaml              # Detailed item details (sub-component)
    │   ├── ItemIdentification.yaml       # Item identification fields
    │   └── ItemAttachment.yaml           # Item attachment references
    ├── responses/
    │   ├── TradeItemResponse.yaml                     # Single-item full response envelope
    │   ├── TradeItemResponseData.yaml                 # Named $ref for data (composite key + nested components)
    │   ├── TradeItemDetailsResponse.yaml              # Single-item details response envelope
    │   ├── TradeItemDetailsResponseData.yaml          # Named $ref for data (key + details)
    │   ├── TradeItemDescriptionsResponse.yaml         # Single-item descriptions response envelope
    │   ├── TradeItemDescriptionsResponseData.yaml     # Named $ref for data (key + descriptions)
    │   ├── TradeItemOrderingsResponse.yaml            # Single-item orderings response envelope
    │   ├── TradeItemOrderingsResponseData.yaml        # Named $ref for data (key + orderings)
    │   ├── TradeItemPricingsResponse.yaml             # Single-item pricings response envelope
    │   ├── TradeItemPricingsResponseData.yaml         # Named $ref for data (key + pricings)
    │   ├── TradeItemAllowanceSurchargesResponse.yaml  # Single-item allowance-surcharges envelope
    │   ├── TradeItemAllowanceSurchargesResponseData.yaml # Named $ref for data
    │   ├── TradeItemAllowanceSurchargeItem.yaml       # Surcharge with pricingRef correlation
    │   ├── TradeItemRelationsResponse.yaml            # Single-item relations response envelope
    │   ├── TradeItemRelationsResponseData.yaml        # Named $ref for data (key + relations)
    │   ├── TradeItemLogisticsDetailsResponse.yaml     # Single-item logistics response envelope
    │   ├── TradeItemLogisticsDetailsResponseData.yaml # Named $ref for data (key + logistics)
    │   ├── BulkTradeItemDetailsResponse.yaml          # Bulk details
    │   ├── BulkTradeItemDescriptionsResponse.yaml     # Bulk descriptions
    │   ├── BulkTradeItemOrderingsResponse.yaml        # Bulk orderings
    │   ├── BulkTradeItemPricingsResponse.yaml         # Bulk pricings
    │   ├── BulkAllowanceSurchargesResponse.yaml       # Bulk allowance-surcharges
    │   ├── BulkTradeItemRelationsResponse.yaml        # Bulk relations
    │   └── BulkTradeItemLogisticsDetailsResponse.yaml # Bulk logistics details
    └── enums/
        ├── ItemStatus.yaml
        ├── ItemCondition.yaml
        └── RelationType.yaml
```

**Schema Naming Convention** (following Product API pattern):
- `*Details.yaml` / `*Ordering.yaml` → WITHOUT key fields (for nested single-item responses)
- `*Summary.yaml` → WITH key fields embedded (for bulk flat retrieval)
- `*Response.yaml` → Response envelope with `data: $ref: ./*ResponseData.yaml`
- `*ResponseData.yaml` → Named schema for the `data` property (composite key + domain data)

#### Shared Parameters (use existing)
```
openapi/shared/parameters/query/
├── selection-id.yaml                     # EXISTS - reuse
├── mutation-date-time.yaml               # EXISTS - reuse (datetime format, NOT date)
├── cursor.yaml                           # EXISTS - reuse
└── limit.yaml                            # EXISTS - reuse
```

**Note**: All required query parameters already exist. Do NOT create new parameter files.

### 4. Key Identifiers

The **primary composite key** for TradeItem:
- `supplierIdGln` (string, pattern: `^[0-9]{13}$`)
- `supplierItemNumber` (string, minLength: 1, maxLength: 35)

### 4.1. Server URLs

Following the Product API pattern, use parameterized server URLs that support multiple implementers:
```yaml
servers:
  - url: https://{host}{basePath}/v1
    description: Product Data OpenAPI - Trade Item API v1
    variables:
      host:
        default: api.example.com
        description: >-
          Implementer-specific API hostname.
          Examples: rest.2ba.nl, selectprerelease.artikelbeheer.nl,
          acceptation-service-api-dsgo.etimix.com
      basePath:
        default: ''
        description: >-
          Optional path prefix (e.g. /api). Leave empty if the API
          is served directly under the domain root.
```

**Important**: Do NOT hardcode 2BA-specific URLs. The specification supports multiple implementers, each with their own hostname.

### 4.2. Pricing Reference Key (`pricingRef`)

In ETIM xChange, `AllowanceSurcharge[]` is nested inside `Pricing[]`. When the API flattens this into separate endpoints (pricings vs. allowance-surcharges), a correlation key is needed to link surcharges back to their parent pricing entry.

`pricingRef` is a **server-generated opaque reference key** (typed as `TechnicalId`) that uniquely identifies a pricing entry within the scope of a trade item (scoped by `supplierIdGln` + `supplierItemNumber`).

**Key characteristics**:
- **NOT present in the ETIM xChange domain model** — this is a technical addition for the API
- Typed as `TechnicalId` (string, 1-50 chars): `$ref: ../../../../shared/schemas/identifiers/TechnicalId.yaml`
- Opaque to clients — format may vary (human-readable slug or UUID)
- Required field on all pricing and allowance/surcharge schemas
- Used as the join key between `/pricings` and `/allowance-surcharges` endpoints (both single-item and bulk)

**Join pattern**:
- **Single-item**: Use `pricingRef` to correlate entries from `/trade-items/{key}/pricings` with `/trade-items/{key}/allowance-surcharges`
- **Bulk**: Use `supplierIdGln` + `supplierItemNumber` + `pricingRef` to join `/trade-items/bulk/pricings` with `/trade-items/bulk/allowance-surcharges`

**Format examples** (opaque — clients must not parse):
```yaml
pricingRef:
  description: |
    Server-generated opaque reference key that uniquely identifies this pricing entry
    within the scope of a trade item (identified by `supplierIdGln` + `supplierItemNumber`).
    
    This is a technical identifier not present in the ETIM xChange domain model.
    Use `pricingRef` to correlate pricing entries with their allowances/surcharges
    from the `/allowance-surcharges` endpoint.
  $ref: ../../../../shared/schemas/identifiers/TechnicalId.yaml
  examples:
    - "price-c62-1-20250101"
    - "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Schemas that include `pricingRef`**:
| Schema | Context | Required |
|--------|---------|----------|
| `TradeItemPricing.yaml` | Single-item pricing (without trade item key) | ✅ |
| `TradeItemPricingSummary.yaml` | Bulk pricing (with trade item key) | ✅ |
| `TradeItemAllowanceSurchargeItem.yaml` | Single-item surcharge response | ✅ |
| `AllowanceSurchargeSummary.yaml` | Bulk surcharge (with trade item key) | ✅ |

### 4.3. Selection Identifier (`selectionId`) and `TechnicalId`

The `selectionId` query parameter allows filtering bulk endpoint results by a predefined selection/subset (e.g., seasonal catalogs, quarterly selections).

**`TechnicalId` schema** (`openapi/shared/schemas/identifiers/TechnicalId.yaml`):
```yaml
type: string
description: >-
  Generic technical identifier that can hold an integer, string, or GUID/UUID value.
  Used for opaque system-generated identifiers such as selection IDs, internal references,
  and other technical keys where the format is not prescribed.
minLength: 1
maxLength: 50
examples:
  - 'SELECTION-2024-Q1'
  - '123456'
  - 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
```

`TechnicalId` is the shared schema type used for:
- `selectionId` query parameter (via `$ref` in `selection-id.yaml`)
- `pricingRef` property in pricing and allowance/surcharge schemas

The `selectionId` parameter definition (`openapi/shared/parameters/query/selection-id.yaml`) references `TechnicalId` via `$ref`:
```yaml
name: selectionId
in: query
description: Filter results by selection identifier. Used to retrieve a specific subset
  of items based on a predefined selection.
required: false
schema:
  $ref: ../../schemas/identifiers/TechnicalId.yaml
example: "SELECTION-2024-Q1"
```

In `openapi.yaml`, register both as named components:
```yaml
schemas:
  TechnicalId:
    $ref: ../../shared/schemas/identifiers/TechnicalId.yaml
parameters:
  SelectionId:
    $ref: ../../shared/parameters/query/selection-id.yaml
```

### 5. TradeItem Service Design

#### Regular TradeItem Endpoints

**GET /trade-items/{supplierIdGln}/{supplierItemNumber}**
- **Summary**: Get trade item
- **Description**: Retrieve the full trade item payload for a single supplier item combination
- **Path Parameters**:
  - `supplierIdGln` (required): Supplier GLN. Must match `^[0-9]{13}$`
  - `supplierItemNumber` (required): Supplier item number (1-35 characters)
- **Response**: `TradeItemResponse` with `data: $ref: TradeItemResponseData.yaml` (nested structure: key at root, components nested)
- **Behavior**: Returns exactly one trade item document. No pagination, no cursor metadata. Respond with `404 Not Found` when the composite key is unknown.

**Subresource Endpoints** (following product API pattern):

**GET /trade-items/{supplierIdGln}/{supplierItemNumber}/details**
- **Summary**: Get trade item details
- **Description**: Retrieve item identification and details for a specific trade item
- **Response**: `TradeItemDetailsResponse` with `data: $ref: TradeItemDetailsResponseData.yaml`

**GET /trade-items/{supplierIdGln}/{supplierItemNumber}/descriptions**
- **Summary**: Get trade item descriptions
- **Description**: Retrieve multilingual descriptions for a specific trade item
- **Query Parameters**:
  - `language` (optional): Filter descriptions to specific language(s)
- **Response**: `TradeItemDescriptionsResponse` with `data: $ref: TradeItemDescriptionsResponseData.yaml`

**GET /trade-items/{supplierIdGln}/{supplierItemNumber}/orderings**
- **Summary**: Get trade item orderings
- **Description**: Retrieve ordering information for a specific trade item
- **Response**: `TradeItemOrderingsResponse` with `data: $ref: TradeItemOrderingsResponseData.yaml`

**GET /trade-items/{supplierIdGln}/{supplierItemNumber}/pricings**
- **Summary**: Get trade item pricings
- **Description**: Retrieve pricing information for a specific trade item
- **Response**: `TradeItemPricingsResponse` with `data: $ref: TradeItemPricingsResponseData.yaml`
- **Allowances/Surcharges**: Available via separate `/allowance-surcharges` endpoint

**GET /trade-items/{supplierIdGln}/{supplierItemNumber}/allowance-surcharges**
- **Summary**: Get trade item allowance surcharges
- **Description**: Retrieve allowances and surcharges for a specific trade item
- **Response**: `TradeItemAllowanceSurchargesResponse` with `data: $ref: TradeItemAllowanceSurchargesResponseData.yaml`
- **Correlation**: Each entry includes `pricingRef` to correlate with the corresponding pricing entry from the `/pricings` endpoint

**GET /trade-items/{supplierIdGln}/{supplierItemNumber}/relations**
- **Summary**: Get trade item relations
- **Description**: Retrieve item relations for a specific trade item (accessories, spare parts, consumables, successors)
- **Response**: `TradeItemRelationsResponse` with `data: $ref: TradeItemRelationsResponseData.yaml`

**GET /trade-items/{supplierIdGln}/{supplierItemNumber}/logistics-details**
- **Summary**: Get trade item logistics details
- **Description**: Retrieve base item logistic measurements (net dimensions, weight, volume) for a specific trade item
- **Response**: `TradeItemLogisticsDetailsResponse` with `data: $ref: TradeItemLogisticsDetailsResponseData.yaml`

### 6. Bulk Service Design

#### Bulk Endpoint Consolidation

The bulk API consolidates ETIM xChange's separate `ItemIdentification` and `ItemDetails` sections into a single endpoint:

| Endpoint | Consolidates | Schema |
|----------|--------------|--------|
| `/trade-items/bulk/details` | `ItemIdentification` + `ItemDetails` | `TradeItemDetailsSummary` |
| `/trade-items/bulk/descriptions` | `ItemDescriptions[]` | `ItemDescriptionsSummary` |
| `/trade-items/bulk/orderings` | `Ordering` | `TradeItemOrderingsSummary` |
| `/trade-items/bulk/pricings` | `Pricing[]` | `TradeItemPricingsSummary` (1 row per price) |
| `/trade-items/bulk/allowance-surcharges` | `AllowanceSurcharge[]` | `AllowanceSurchargeSummary` |
| `/trade-items/bulk/relations` | `ItemRelations[]` | `ItemRelationSummary` |
| `/trade-items/bulk/logistics-details` | `ItemLogisticDetails[]` | `ItemLogisticsSummary` |

**Note**: There is no separate `/trade-items/bulk/trade-items` or `/trade-items/bulk/item-identifications` endpoint. 
The `/trade-items/bulk/details` endpoint provides all identification fields (GTINs, manufacturer numbers, 
discount/bonus group IDs, validity dates) combined with item details (status, condition).
Discount/bonus group descriptions are multilingual and served from the description service.

#### Bulk Flattening Strategy

**Design Philosophy**: Maximize flattening for predictable pagination and ETL compatibility.

| Endpoint | Rows per Item | Flattening Pattern |
|----------|---------------|-------------------|
| `/trade-items/bulk/details` | 1 | Fully flat (all fields inline) |
| `/trade-items/bulk/descriptions` | n (per language) | Flat per language row |
| `/trade-items/bulk/orderings` | 1 | Fully flat (all fields inline) |
| `/trade-items/bulk/pricings` | n (per price tier) | **Flat per price entry** |
| `/trade-items/bulk/allowance-surcharges` | n (per surcharge) | **Flat per surcharge entry** |
| `/trade-items/bulk/relations` | n (per relation) | Flat per relation row |
| `/trade-items/bulk/logistics-details` | n (per logistic detail) | Flat per logistic row |

**Pricing Flattening** (consistent with `ProductEtimClassificationFeature` pattern):
- Each row = 1 price entry with embedded composite key
- Trade items with quantity tiers generate multiple rows
- Allows predictable payload sizes and efficient cursor pagination

**Allowance/Surcharge Separation** (star schema pattern):
- Moved from nested array within pricing to separate `/trade-items/bulk/allowance-surcharges` endpoint
- Each row = 1 surcharge entry with `pricingRef` linking to the parent pricing entry
- Enables clean dimensional modeling: pricing fact table + surcharges fact table
- Join via: `supplierIdGln` + `supplierItemNumber` + `pricingRef`

**Nested structures retained**:
- Simple string arrays (`itemGtins[]`) - minimal impact on row predictability

#### Bulk Endpoints to Create

**GET /trade-items/bulk/details**
- **Summary**: List trade item details
- **Description**: Retrieve trade item identification AND details in bulk with cursor-based pagination. This endpoint consolidates what would have been separate trade-items and item-identifications endpoints.
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkTradeItemDetailsResponse` using `TradeItemDetailsSummary` schema

**GET /trade-items/bulk/descriptions**
- **Summary**: List trade item descriptions
- **Description**: Retrieve multilingual trade item descriptions in bulk with cursor-based pagination. Flat per language row.
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkTradeItemDescriptionsResponse` using `ItemDescriptionsSummary` schema

**GET /trade-items/bulk/orderings**
- **Summary**: List trade item orderings
- **Description**: Retrieve trade item ordering information (units, quantities, step sizes) in bulk with cursor-based pagination
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkTradeItemOrderingsResponse` using `TradeItemOrderingsSummary` schema

**GET /trade-items/bulk/pricings**
- **Summary**: List trade item pricings
- **Description**: Retrieve trade item pricing information in bulk with cursor-based pagination. **Flattened structure**: 1 row per price entry (not grouped by item)
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkTradeItemPricingsResponse` using `TradeItemPricingsSummary` schema
- **Note**: A trade item with multiple price tiers will generate multiple rows with the same key but different pricing data.
- **Allowances/Surcharges**: Available via separate `/trade-items/bulk/allowance-surcharges` endpoint (not embedded)

**GET /trade-items/bulk/allowance-surcharges**
- **Summary**: List trade item allowance surcharges
- **Description**: Retrieve trade item allowances and surcharges in bulk with cursor-based pagination. **Flattened structure**: 1 row per surcharge entry
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkAllowanceSurchargesResponse` using `AllowanceSurchargeSummary` schema
- **Correlation**: Each entry includes `pricingRef` to correlate with the corresponding pricing entry. Join via: `supplierIdGln` + `supplierItemNumber` + `pricingRef`

**GET /trade-items/bulk/relations**
- **Summary**: List trade item relations
- **Description**: Retrieve trade item relations in bulk with cursor-based pagination. Flat per relation row.
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkTradeItemRelationsResponse` using `ItemRelationSummary` schema

**GET /trade-items/bulk/logistics-details**
- **Summary**: List trade item logistics details
- **Description**: Retrieve trade item logistics details in bulk with cursor-based pagination. Flat per logistic row.
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkTradeItemLogisticsDetailsResponse` using `ItemLogisticsSummary` schema

#### Response Structure (Cursor-Based Pagination)

All bulk endpoints return paginated responses using this structure pattern:

```yaml
type: object
required:
  - data
  - meta
properties:
  data:
    type: array
    description: Array of trade item summaries (specific to each endpoint)
    items:
      $ref: ../domain/TradeItemDetailsSummary.yaml  # Or *OrderingsSummary, *PricingsSummary
  meta:
    $ref: ../../../../shared/schemas/common/CursorPaginationMetadata.yaml
examples:
  - data:
      - supplierIdGln: "1234567890123"
        supplierItemNumber: "SKU-12345"
        itemStatus: "ACTIVE"
        itemCondition: "NEW"
        minimalItemDescription: "LED Lamp 10W E27"
    meta:
      cursor: "eyJpZCI6MTIzfQ=="
      hasNext: true
      hasPrev: false
      limit: 100
      estimatedTotal: 15420
```

### 7. Response Structures

#### Response Envelope Pattern (Named `$ref` for `data`)

**CRITICAL**: All response envelopes MUST use a named `$ref` for the `data` property — NEVER an inline anonymous `type: object`. This is required for NSwag/.NET code generation to produce well-named types.

```yaml
# ❌ INCORRECT — inline object → NSwag generates "Data", "Data2", "Data3"
type: object
properties:
  data:
    type: object
    properties:
      supplierIdGln: ...
      supplierItemNumber: ...
      details: ...

# ✅ CORRECT — named $ref → NSwag generates "TradeItemResponseData"
type: object
properties:
  data:
    $ref: ./TradeItemResponseData.yaml
```

#### Single Trade Item Response (Nested Structure)

Following the Product API pattern, single-item responses use:
1. A `*Response.yaml` envelope with `data: $ref: ./*ResponseData.yaml`
2. A `*ResponseData.yaml` with key fields at root + nested domain objects

**`TradeItemResponse.yaml`** (envelope for `GET /trade-items/{supplierIdGln}/{supplierItemNumber}`):
```yaml
type: object
description: |
  Response containing a single trade item with all its components.
required:
  - data
properties:
  data:
    $ref: ./TradeItemResponseData.yaml
examples:
  - data:
      supplierIdGln: "1234567890123"
      supplierItemNumber: "SKU-12345"
      details:
        itemStatus: "ACTIVE"
        itemCondition: "NEW"
      orderings:
        orderUnit: "PCE"
        minimumOrderQuantity: 1
      pricings:
        - pricingRef: "price-c62-1-20250101"
          priceUnit: "PCE"
          netPrice: 9.99
          currencyCode: "EUR"
```

**`TradeItemResponseData.yaml`** (named schema for `data`):
```yaml
type: object
description: |
  Single trade item with all its components.
  
  The trade item key (`supplierIdGln` + `supplierItemNumber`) is at the root level,
  with nested objects for each component:
  - `details`: Item identification, status, conditions
  - `orderings`: Ordering units, quantities, step sizes
  - `pricings`: Array of pricing information
  - `logistics`: Array of logistic details
  - `packagingUnits`: Array of packaging unit information
  - `itemRelations`: Array of related items
required:
  - supplierIdGln
  - supplierItemNumber
  - details
properties:
  supplierIdGln:
    $ref: ../../../../shared/schemas/identifiers/Gln.yaml
    description: Global Location Number (GLN) uniquely identifying the supplier
  supplierItemNumber:
    type: string
    minLength: 1
    maxLength: 35
    description: Supplier's unique item number/code
  details:
    $ref: ../domain/TradeItemDetails.yaml
    description: Item identification, status, and details
  orderings:
    $ref: ../domain/TradeItemOrdering.yaml
    description: Ordering information (units, quantities)
  pricings:
    type: ["array", "null"]
    items:
      $ref: ../domain/TradeItemPricing.yaml
    description: Array of pricing information
  logistics:
    type: ["array", "null"]
    items:
      $ref: ../domain/ItemLogistics.yaml
    description: Array of logistic details
  packagingUnits:
    type: ["array", "null"]
    items:
      $ref: ../domain/PackagingUnit.yaml
  itemRelations:
    type: ["array", "null"]
    items:
      $ref: ../domain/ItemRelation.yaml
```

**Subresource Response Pattern** (e.g., `TradeItemDetailsResponse.yaml`):
```yaml
# TradeItemDetailsResponse.yaml (envelope)
type: object
required:
  - data
properties:
  data:
    $ref: ./TradeItemDetailsResponseData.yaml
```

```yaml
# TradeItemDetailsResponseData.yaml (named data schema)
type: object
required:
  - supplierIdGln
  - supplierItemNumber
  - details
properties:
  supplierIdGln:
    $ref: ../../../../shared/schemas/identifiers/Gln.yaml
  supplierItemNumber:
    type: string
    minLength: 1
    maxLength: 35
  details:
    $ref: ../domain/TradeItemDetails.yaml
```

#### *Summary Schema Pattern for Bulk Retrieval

For bulk responses, use `*Summary` schemas that include the composite key fields:

- `TradeItemDetails.yaml` → For nested single-item (without key)
- `TradeItemDetailsSummary.yaml` → For bulk retrieval (WITH key fields embedded)

### 8. Schema Flattening Strategy

**Minimize nesting** by extracting nested ETIM structures into separate, reusable schemas:

#### From ETIM xChange Schema:
```json
"TradeItem": {
  "ItemIdentification": { ... },
  "ItemDetails": { ... },
  "ItemRelations": [ ... ],
  "ItemLogisticDetails": [ ... ],
  "Ordering": { ... },
  "Pricing": [ ... ],
  "PackagingUnit": [ ... ]
}
```

#### To Flattened OpenAPI:
```yaml
# TradeItem.yaml (main entity)
type: object
required:
  - supplierIdGln
  - supplierItemNumber
properties:
  # Key fields
  supplierIdGln: { $ref: Gln.yaml }
  supplierItemNumber: { type: string }
  
  # Flatten first-level nested objects with ETIM xChange references
  supplierAltItemNumber: 
    type: ["string", "null"]
    description: |
      Alternative supplier item number for the same trade item.
      **ETIM xChange**: `SupplierAltItemNumber`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierAltItemNumber`
  
  manufacturerItemNumber: 
    type: ["string", "null"]
    description: |
      Manufacturer's item number.
      **ETIM xChange**: `ManufacturerItemNumber`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ManufacturerItemNumber`
  
  itemGtins: 
    type: ["array", "null"]
    description: |
      Array of Global Trade Item Numbers.
      **ETIM xChange**: `ItemGtin`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemGtin[]`
  
  buyerItemNumber: 
    type: ["string", "null"]
    description: |
      Buyer-specific item number.
      **ETIM xChange**: `BuyerItemNumber`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.BuyerItemNumber`
  
  discountGroupId: 
    type: ["string", "null"]
    description: |
      Identifier for the discount group.
      **ETIM xChange**: `DiscountGroupId`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.DiscountGroupId`
  
  bonusGroupId: 
    type: ["string", "null"]
    description: |
      Identifier for the bonus group.
      **ETIM xChange**: `BonusGroupId`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.BonusGroupId`
  
  itemValidityDate: 
    type: ["string", "null"]
    format: date
    description: |
      Date from which the trade item is valid.
      **ETIM xChange**: `ItemValidityDate`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemValidityDate`
  
  itemObsolescenceDate: 
    type: ["string", "null"]
    format: date
    description: |
      Date when the trade item becomes obsolete.
      **ETIM xChange**: `ItemObsolescenceDate`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemObsolescenceDate`
  
  # Item details (flatten into main object)
  itemStatus: 
    $ref: ../enums/ItemStatus.yaml
    description: |
      Lifecycle status of the trade item.
      **ETIM xChange**: `ItemStatus`
      **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemStatus`
  
  itemCondition: 
    $ref: ../enums/ItemCondition.yaml
    description: |
      Condition of the trade item.
      **ETIM xChange**: `ItemCondition`
      **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemCondition`
  
  stockItem: 
    type: ["boolean", "null"]
    description: |
      Indicates if this is a stock item.
      **ETIM xChange**: `StockItem`
      **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.StockItem`
  
  shelfLifePeriod: 
    type: ["integer", "null"]
    description: |
      Shelf life period in days.
      **ETIM xChange**: `ShelfLifePeriod`
      **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ShelfLifePeriod`
  
  minimalItemDescription: 
    type: string
    description: |
      Minimal description of the trade item (80 characters max).
      **ETIM xChange**: `MinimalItemDescription`
      **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemDescriptions[].MinimalItemDescription`
  
  # References to complex sub-structures (when needed) - converted to number
  orderUnit: 
    type: string
    description: |
      Unit of measure for ordering.
      **ETIM xChange**: `OrderUnit`
      **Path**: `Supplier[].Product[].TradeItem[].Ordering.OrderUnit`
  
  minimumOrderQuantity: 
    type: number
    format: decimal
    minimum: 0
    multipleOf: 0.0001
    description: |
      Minimum quantity that must be ordered (converted from ETIM string to number).
      **ETIM xChange**: `MinimumOrderQuantity` (string with pattern)
      **Path**: `Supplier[].Product[].TradeItem[].Ordering.MinimumOrderQuantity`
  
  orderStepSize: 
    type: number
    format: decimal
    minimum: 0
    multipleOf: 0.0001
    description: |
      Increment in which quantities can be ordered (converted from ETIM string to number).
      **ETIM xChange**: `OrderStepSize` (string with pattern)
      **Path**: `Supplier[].Product[].TradeItem[].Ordering.OrderStepSize`
  
  # Arrays for relations
  itemRelations: 
    type: ["array", "null"]
    items: { $ref: ./ItemRelation.yaml }
  
  pricings:
    type: array
    description: |
      Array of pricing information (all numeric fields converted from ETIM strings).
      **ETIM xChange**: `Pricing`
      **Path**: `Supplier[].Product[].TradeItem[].Pricing[]`
    items: { $ref: ./ItemPricing.yaml }
  
  packagingUnits:
    type: ["array", "null"]
    items: { $ref: ./PackagingUnit.yaml }
```

### 9. ETIM xChange Field Mapping

Map ETIM xChange TradeItem fields to OpenAPI schemas with full documentation:

#### ItemIdentification
| ETIM xChange Field | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|------------------|--------------|----------|
| `SupplierItemNumber` | `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierItemNumber` | `supplierItemNumber` | `string` | ✅ |
| `SupplierAltItemNumber` | `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierAltItemNumber` | `supplierAltItemNumber` | `["string", "null"]` | ❌ |
| `ManufacturerItemNumber` | `Supplier[].Product[].TradeItem[].ItemIdentification.ManufacturerItemNumber` | `manufacturerItemNumber` | `["string", "null"]` | ❌ |
| `ItemGtin` | `Supplier[].Product[].TradeItem[].ItemIdentification.ItemGtin[]` | `itemGtins` | `["array", "null"]` | ❌ |
| `BuyerItemNumber` | `Supplier[].Product[].TradeItem[].ItemIdentification.BuyerItemNumber` | `buyerItemNumber` | `["string", "null"]` | ❌ |
| `DiscountGroupId` | `Supplier[].Product[].TradeItem[].ItemIdentification.DiscountGroupId` | `discountGroupId` | `["string", "null"]` | ❌ |
| `BonusGroupId` | `Supplier[].Product[].TradeItem[].ItemIdentification.BonusGroupId` | `bonusGroupId` | `["string", "null"]` | ❌ |
| `ItemValidityDate` | `Supplier[].Product[].TradeItem[].ItemIdentification.ItemValidityDate` | `itemValidityDate` | `["string", "null"]` (format: date) | ❌ |
| `ItemObsolescenceDate` | `Supplier[].Product[].TradeItem[].ItemIdentification.ItemObsolescenceDate` | `itemObsolescenceDate` | `["string", "null"]` (format: date) | ❌ |

#### ItemDetails
| ETIM xChange Field | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|------------------|--------------|----------|
| `ItemStatus` | `Supplier[].Product[].TradeItem[].ItemDetails.ItemStatus` | `itemStatus` | `["string", "null"]` (enum) | ❌ |
| `ItemCondition` | `Supplier[].Product[].TradeItem[].ItemDetails.ItemCondition` | `itemCondition` | `["string", "null"]` (enum) | ❌ |
| `StockItem` | `Supplier[].Product[].TradeItem[].ItemDetails.StockItem` | `stockItem` | `["boolean", "null"]` | ❌ |
| `ShelfLifePeriod` | `Supplier[].Product[].TradeItem[].ItemDetails.ShelfLifePeriod` | `shelfLifePeriod` | `["integer", "null"]` (0-999) | ❌ |
| `ItemDescriptions.MinimalItemDescription` | `Supplier[].Product[].TradeItem[].ItemDetails.ItemDescriptions[].MinimalItemDescription` | `minimalItemDescription` | `string` | ✅ |
| `ItemDescriptions.UniqueMainItemDescription` | `Supplier[].Product[].TradeItem[].ItemDetails.ItemDescriptions[].UniqueMainItemDescription` | `uniqueMainItemDescription` | `["string", "null"]` | ❌ |
| `DiscountGroupDescription` | `Supplier[].Product[].TradeItem[].ItemIdentification.DiscountGroupDescription[].DiscountGroupDescription` | `discountGroupDescription` | `["string", "null"]` | ❌ |
| `BonusGroupDescription` | `Supplier[].Product[].TradeItem[].ItemIdentification.BonusGroupDescription[].BonusGroupDescription` | `bonusGroupDescription` | `["string", "null"]` | ❌ |

**ItemStatus Enum Values**: `PRE-LAUNCH`, `ACTIVE`, `ON HOLD`, `PLANNED WITHDRAWAL`, `OBSOLETE`, `null`  
**ItemCondition Enum Values**: `NEW`, `USED`, `REFURBISHED`, `null`

**Note**: For nullable enums, include `null` in the enum array itself (following Product API pattern).

#### ItemRelations
| ETIM xChange Field | ETIM Type | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|-----------|------------------|--------------|----------|
| `RelatedSupplierItemNumber` | string(1-35) | `Supplier[].Product[].TradeItem[].ItemRelations[].RelatedSupplierItemNumber` | `relatedSupplierItemNumber` | `string` | ✅ |
| `RelatedManufacturerItemNumber` | string(1-35) | `Supplier[].Product[].TradeItem[].ItemRelations[].RelatedManufacturerItemNumber` | `relatedManufacturerItemNumber` | `["string", "null"]` | ❌ |
| `RelatedItemGtin` | array[string] | `Supplier[].Product[].TradeItem[].ItemRelations[].RelatedItemGtin[]` | `relatedItemGtins` | `["array", "null"]` | ❌ |
| `RelationType` | string(enum) | `Supplier[].Product[].TradeItem[].ItemRelations[].RelationType` | `relationType` | `string` (enum) | ✅ |
| `RelatedItemQuantity` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemRelations[].RelatedItemQuantity` | `relatedItemQuantity` | `number` | ✅ |

**RelationType Enum Values**: `ACCESSORY`, `CONSISTS_OF`, `CONSUMABLES`, `MANDATORY`, `SPAREPART`, `SUCCESSOR`, `OTHER`

**Convert `relatedItemQuantity` from string to `number` type**.

#### ItemLogisticDetails
| ETIM xChange Field | ETIM Type | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|-----------|------------------|--------------|----------|
| `BaseItemNetLength` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetLength` | `baseItemNetLength` | `["number", "null"]` | ❌ |
| `BaseItemNetWidth` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetWidth` | `baseItemNetWidth` | `["number", "null"]` | ❌ |
| `BaseItemNetHeight` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetHeight` | `baseItemNetHeight` | `["number", "null"]` | ❌ |
| `BaseItemNetDiameter` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetDiameter` | `baseItemNetDiameter` | `["number", "null"]` | ❌ |
| `NetDimensionUnit` | string(3) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].NetDimensionUnit` | `netDimensionUnit` | `["string", "null"]` (enum) | ❌ |
| `BaseItemNetWeight` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetWeight` | `baseItemNetWeight` | `["number", "null"]` | ❌ |
| `NetWeightUnit` | string(3) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].NetWeightUnit` | `netWeightUnit` | `["string", "null"]` (enum) | ❌ |

**Convert all dimension and weight string fields to `number` type** with appropriate constraints.

#### Ordering
| ETIM xChange Field | ETIM Type | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|-----------|------------------|--------------|----------|
| `OrderUnit` | string(enum) | `Supplier[].Product[].TradeItem[].Ordering.OrderUnit` | `orderUnit` | `string` (enum) | ✅ |
| `MinimumOrderQuantity` | string(pattern) | `Supplier[].Product[].TradeItem[].Ordering.MinimumOrderQuantity` | `minimumOrderQuantity` | `number` | ✅ |
| `OrderStepSize` | string(pattern) | `Supplier[].Product[].TradeItem[].Ordering.OrderStepSize` | `orderStepSize` | `number` | ✅ |
| `MaximumOrderQuantity` | string(pattern) | `Supplier[].Product[].TradeItem[].Ordering.MaximumOrderQuantity` | `maximumOrderQuantity` | `["number", "null"]` | ❌ |

Reference existing `UnitCodes.yaml` for order unit values. Convert all quantity strings to `number` type.

#### Pricing
| ETIM xChange Field | ETIM Type | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|-----------|------------------|--------------|----------|
| _(none — server-generated)_ | — | — | `pricingRef` | `TechnicalId` (`$ref`) | ✅ |
| `PriceUnit` | string(enum) | `Supplier[].Product[].TradeItem[].Pricing[].PriceUnit` | `priceUnit` | `string` (enum) | ✅ |
| `PriceUnitFactor` | string(pattern) | `Supplier[].Product[].TradeItem[].Pricing[].PriceUnitFactor` | `priceUnitFactor` | `["number", "null"]` | ❌ |
| `PriceQuantity` | string(pattern) | `Supplier[].Product[].TradeItem[].Pricing[].PriceQuantity` | `priceQuantity` | `number` | ✅ |
| `NetPrice` | string(pattern) | `Supplier[].Product[].TradeItem[].Pricing[].NetPrice` | `netPrice` | `number` | ✅ |
| `GrossListPrice` | string(pattern) | `Supplier[].Product[].TradeItem[].Pricing[].GrossListPrice` | `grossListPrice` | `["number", "null"]` | ❌ |
| `RecommendedRetailPrice` | string(pattern) | `Supplier[].Product[].TradeItem[].Pricing[].RecommendedRetailPrice` | `recommendedRetailPrice` | `["number", "null"]` | ❌ |

Create `TradeItemPricing.yaml` schema (API-facing pricing, includes `pricingRef`, excludes nested `allowanceSurcharges`).
Create `TradeItemPricingSummary.yaml` for bulk retrieval (includes `pricingRef` + trade item key fields).
**Convert all price/quantity string fields to `number` type** with `multipleOf: 0.0001`.

**Note**: `pricingRef` is a server-generated technical identifier (typed as `TechnicalId`) not present in the ETIM xChange domain model. It is required on all pricing schemas and used to correlate with allowance/surcharge entries.

#### PackagingUnit
| ETIM xChange Field | ETIM Type | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|-----------|------------------|--------------|----------|
| `PackagingUnitLevel` | integer | `Supplier[].Product[].TradeItem[].PackagingUnit[].PackagingUnitLevel` | `packagingUnitLevel` | `integer` | ✅ |
| `QuantityInParent` | string(pattern) | `Supplier[].Product[].TradeItem[].PackagingUnit[].QuantityInParent` | `quantityInParent` | `["number", "null"]` | ❌ |
| `PackagingGtin` | string(8-14) | `Supplier[].Product[].TradeItem[].PackagingUnit[].PackagingGtin` | `packagingGtin` | `["string", "null"]` | ❌ |
| `GrossLength` | string(pattern) | `Supplier[].Product[].TradeItem[].PackagingUnit[].GrossLength` | `grossLength` | `["number", "null"]` | ❌ |
| `GrossWidth` | string(pattern) | `Supplier[].Product[].TradeItem[].PackagingUnit[].GrossWidth` | `grossWidth` | `["number", "null"]` | ❌ |
| `GrossHeight` | string(pattern) | `Supplier[].Product[].TradeItem[].PackagingUnit[].GrossHeight` | `grossHeight` | `["number", "null"]` | ❌ |
| `GrossWeight` | string(pattern) | `Supplier[].Product[].TradeItem[].PackagingUnit[].GrossWeight` | `grossWeight` | `["number", "null"]` | ❌ |

Create `PackagingUnit.yaml` schema. **Convert all dimension, weight, and quantity string fields to `number` type**.

### 10. Shared Components to Use

Reuse existing shared schemas:
- `Gln.yaml` (supplier identifiers)
- `Gtin.yaml` (item identifiers)
- `TechnicalId.yaml` (opaque system identifiers — used for `selectionId` parameter and `pricingRef` property)
- `Price.yaml` (pricing structures)
- `CurrencyCode.yaml`
- `UnitCodes.yaml`
- `CountryCode.yaml`
- `LanguageCode.yaml`
- `CursorPaginationMetadata.yaml`
- `ProblemDetails.yaml` (error responses)

#### Component Registration in `openapi.yaml`

**CRITICAL**: ALL shared parameters, schemas, and responses used by the API MUST be registered in the `components/` section of `openapi.yaml`. Component names use **PascalCase** regardless of the source file's kebab-case name.

```yaml
components:
  schemas:
    # Shared schemas
    ProblemDetails:
      $ref: ../../shared/schemas/common/ProblemDetails.yaml
    TechnicalId:
      $ref: ../../shared/schemas/identifiers/TechnicalId.yaml
    CursorPaginationMetadata:
      $ref: ../../shared/schemas/common/CursorPaginationMetadata.yaml
    
    # Domain schemas (register ALL domain + summary schemas)
    TradeItemDetails:
      $ref: ./schemas/domain/TradeItemDetails.yaml
    TradeItemDetailsSummary:
      $ref: ./schemas/domain/TradeItemDetailsSummary.yaml
    # ... etc for all domain schemas
    
    # Response schemas (register ALL response + responseData schemas)
    TradeItemResponse:
      $ref: ./schemas/responses/TradeItemResponse.yaml
    TradeItemResponseData:
      $ref: ./schemas/responses/TradeItemResponseData.yaml
    # ... etc for all response schemas

  parameters:
    SupplierIdGln:
      $ref: ../../shared/parameters/query/supplier-id-gln-filter.yaml
    SupplierIdGlnPath:
      $ref: ../../shared/parameters/path/supplier-id-gln.yaml
    SupplierItemNumberPath:
      $ref: ../../shared/parameters/path/supplier-item-number.yaml
    Cursor:
      $ref: ../../shared/parameters/query/cursor.yaml
    Limit:
      $ref: ../../shared/parameters/query/limit.yaml
    SelectionId:
      $ref: ../../shared/parameters/query/selection-id.yaml
    MutationDateTime:
      $ref: ../../shared/parameters/query/mutation-date-time.yaml
    Language:
      $ref: ../../shared/parameters/query/language.yaml

  responses:
    BadRequest:
      $ref: ../../shared/responses/400-bad-request.yaml
    Unauthorized:
      $ref: ../../shared/responses/401-unauthorized.yaml
    Forbidden:
      $ref: ../../shared/responses/403-forbidden.yaml
    NotFound:
      $ref: ../../shared/responses/404-not-found.yaml
    InternalServerError:
      $ref: ../../shared/responses/500-internal-server-error.yaml
```

### 11. Query Parameters

Reuse existing shared query parameters (DO NOT create new files):

#### selection-id.yaml (EXISTS)
```yaml
name: selectionId
in: query
description: Filter results by selection identifier. Used to retrieve a specific subset
  of items based on a predefined selection.
required: false
schema:
  $ref: ../../schemas/identifiers/TechnicalId.yaml
example: "SELECTION-2024-Q1"
```

**Note**: The `selectionId` schema uses `$ref` to `TechnicalId.yaml` (generic opaque identifier, string 1-50 chars). Do NOT inline the type definition.

#### mutation-date-time.yaml (EXISTS)
```yaml
name: mutationDateTime
in: query
description: |
  Filter results by mutation timestamp (RFC 3339 / ISO 8601 UTC format).
  Returns items created or modified on or after this timestamp.
  Must use UTC timezone with 'Z' suffix.
required: false
schema:
  type: string
  format: date-time
example: "2024-10-15T00:00:00Z"
```

**Important**: Use `mutationDateTime` (datetime with UTC 'Z' suffix), NOT `mutationDate` (date only).

### 12. Example Bulk Response

Bulk responses use `*Summary` schemas that include the composite key fields:

```yaml
# BulkTradeItemDetailsResponse.yaml
type: object
required:
  - data
  - meta
properties:
  data:
    type: array
    description: Array of trade item details summaries
    items:
      $ref: ../domain/TradeItemDetailsSummary.yaml
  meta:
    $ref: ../../../../shared/schemas/common/CursorPaginationMetadata.yaml
    description: Cursor-based pagination metadata
examples:
  - data:
      - supplierIdGln: "8712423012485"
        supplierItemNumber: "SKU-LAMP-001"
        supplierAltItemNumber: "ALT-SKU-001"
        manufacturerItemNumber: "MFR-12345"
        itemGtins:
          - "08712423012485"
          - "12345678901234"
        buyerItemNumber: null
        discountGroupId: "DG-LIGHTING"
        itemValidityDate: "2024-01-01"
        itemObsolescenceDate: null
        itemStatus: "ACTIVE"
        itemCondition: "NEW"
        stockItem: true
        shelfLifePeriod: null
        minimalItemDescription: "LED Lamp 10W E27"
    meta:
      cursor: "eyJzdXBwbGllcklkR2xuIjoiODcxMjQyMzAxMjQ4NSIsInN1cHBsaWVySXRlbU51bWJlciI6IlNLVS1MQU1QLTA0MSJ9"
      hasNext: true
      hasPrev: false
      limit: 100
      estimatedTotal: 15420
```

**Key Difference from Single-Item Response**:
- **Bulk**: Uses `TradeItemDetailsSummary` which INCLUDES `supplierIdGln` and `supplierItemNumber` in each item
- **Single**: Uses `TradeItemDetails` which does NOT include key fields (key is at response root level)

### 13. Operations IDs

Use descriptive, camelCase operation IDs:

**Single-item endpoints**:
- `getTradeItem` - Main trade item
- `getTradeItemDetails` - Details subresource
- `getTradeItemDescriptions` - Descriptions subresource
- `getTradeItemOrderings` - Orderings subresource
- `getTradeItemPricings` - Pricings subresource
- `getTradeItemAllowanceSurcharges` - Allowance surcharges subresource
- `getTradeItemRelations` - Relations subresource
- `getTradeItemLogisticsDetails` - Logistics details subresource

**Bulk endpoints**:
- `getBulkTradeItemDetails`
- `getBulkTradeItemDescriptions`
- `getBulkTradeItemOrderings`
- `getBulkTradeItemPricings`
- `getBulkTradeItemAllowanceSurcharges`
- `getBulkTradeItemRelations`
- `getBulkTradeItemLogisticsDetails`

**Operation summary convention**: Use short Get/List pattern:
- Single endpoints: "Get trade item {aspect}" (e.g., "Get trade item details")
- Bulk endpoints: "List trade item {aspect}" (e.g., "List trade item details")
- No filler words like "Retrieve", "a single", "in bulk"

### 14. Tags

Following the Product API pattern, use exactly **2 tags** (not 3):
```yaml
tags:
  - name: TradeItems single
    description: Single trade item operations
    x-displayName: Single Trade Item
  - name: TradeItems bulk
    description: Bulk data retrieval operations with cursor-based pagination for high-volume data exchange
    x-displayName: Bulk Trade Items

x-tagGroups:
  - name: Trade Items
    tags:
      - TradeItems single
      - TradeItems bulk
```

**Do NOT add a parent `TradeItems` tag** — each API defines exactly 2 tags: `{Resource} single` and `{Resource} bulk`.

### 15. ETIM xChange Field Documentation

**CRITICAL**: Every field in the OpenAPI schemas MUST include in its description:
1. The original ETIM xChange field name (PascalCase)
2. The full JSON path in the ETIM schema
3. A business description of the field's purpose

**Format Pattern**:
```yaml
propertyName:
  type: string
  description: |
    [Business description of the field]
    
    **ETIM xChange**: `FieldName`  
    **Path**: `Supplier[].Product[].TradeItem[].Section.FieldName`
```

**Example**:
```yaml
supplierItemNumber:
  type: string
  minLength: 1
  maxLength: 35
  description: |
    Unique identifier for the trade item as assigned by the supplier. This is the primary 
    key for identifying items in the supplier's catalog system.
    
    **ETIM xChange**: `SupplierItemNumber`  
    **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierItemNumber`
  examples:
    - "SKU-12345"
    - "ITEM-ABC-789"

itemStatus:
  type: ["string", "null"]
  enum: ["PRE-LAUNCH", "ACTIVE", "ON HOLD", "PLANNED WITHDRAWAL", "OBSOLETE", null]
  description: |
    Current lifecycle status of the trade item in the supplier's catalog.
    
    - `PRE-LAUNCH`: Item announced but not yet available
    - `ACTIVE`: Item is currently available
    - `ON HOLD`: Item temporarily unavailable
    - `PLANNED WITHDRAWAL`: Item scheduled for discontinuation
    - `OBSOLETE`: Item no longer available
    
    **ETIM xChange**: `ItemStatus`  
    **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemStatus`
  examples:
    - "ACTIVE"
    - "PRE-LAUNCH"
    - null

itemGtins:
  type: ["array", "null"]
  items:
    type: string
    pattern: "^[0-9]{8,14}$"
  description: |
    Array of Global Trade Item Numbers (GTIN-8, GTIN-12, GTIN-13, or GTIN-14) assigned 
    to this trade item. Multiple GTINs may exist for different packaging levels.
    
    **ETIM xChange**: `ItemGtin`  
    **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemGtin[]`
  examples:
    - ["08712423012485", "12345678901234"]

orderUnit:
  type: string
  description: |
    Unit of measure in which the trade item can be ordered (e.g., piece, box, meter).
    References UN/CEFACT unit codes.
    
    **ETIM xChange**: `OrderUnit`  
    **Path**: `Supplier[].Product[].TradeItem[].Ordering.OrderUnit`
  examples:
    - "PCE"
    - "MTR"

minimumOrderQuantity:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999999999.9999
  description: |
    Minimum quantity that must be ordered for this trade item, expressed in the order unit.
    Converted from ETIM xChange string to number type.
    
    **ETIM xChange**: `MinimumOrderQuantity` (string with pattern)  
    **Path**: `Supplier[].Product[].TradeItem[].Ordering.MinimumOrderQuantity`
  examples:
    - 1
    - 10.5
    - 500
```

### 16. Error Responses

Use existing shared error responses:
- `400 Bad Request` → `#/components/responses/BadRequest`
- `401 Unauthorized` → `#/components/responses/Unauthorized`
- `403 Forbidden` → `#/components/responses/Forbidden`
- `404 Not Found` → `#/components/responses/NotFound`
- `500 Internal Server Error` → `#/components/responses/InternalServerError`

### 17. Validation Rules

Apply explicit validation constraints from the ETIM xChange schema while keeping object models open to additive fields:
- `supplierIdGln`: pattern `^[0-9]{13}$`
- `supplierItemNumber`: minLength 1, maxLength 35
- `itemGtins`: pattern `^[0-9]{8,14}$` per item
- **Numeric fields**: type `number`, minimum 0, multipleOf 0.0001, appropriate maximum based on ETIM pattern
  - Convert ETIM `^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$` → `number` with `maximum: 99999999999.9999`
  - Convert ETIM `^[0-9]{1,5}[.]{0,1}[0-9]{0,4}$` → `number` with `maximum: 99999.9999`
  - Convert ETIM `^[0-9]{1,12}[.]{0,1}[0-9]{0,4}$` → `number` with `maximum: 999999999999.9999`
- Date fields: format `date` (YYYY-MM-DD)
- Currency codes: pattern `^[A-Z]{3}$`
- Unit codes: Use enum from `UnitCodes.yaml`

### 18. Documentation Requirements

Each schema file must include:
- Clear `description` explaining business purpose
- **ETIM xChange field name** in description (e.g., `**ETIM xChange**: \`SupplierItemNumber\`")`
- **Full JSON path** in description (e.g., `**Path**: \`Supplier[].Product[].TradeItem[].ItemIdentification.SupplierItemNumber\`")`
- **Indicate ETIM type conversion** when applicable (e.g., "(string with pattern)" for numeric conversions)
- Realistic `examples` with actual ETIM-like data
  - Numeric fields: Use actual numbers (not strings)
  - Nullable fields: Include `null` in examples array
  - Date fields: Use ISO 8601 format (YYYY-MM-DD)
  - String enums: Show multiple valid enum values
- Validation constraints (`minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `multipleOf`)
- **For date fields**: Explicitly state "ISO 8601 date format (YYYY-MM-DD)"
- **For nullable fields**: Explain when/why field might be null
- Field-level descriptions explaining ETIM xChange business context

### 19. Implementation Steps

1. **Create enum schemas**: `ItemStatus.yaml`, `ItemCondition.yaml`, `RelationType.yaml`
   - Include `null` in enum arrays for nullable enums
2. **Create domain schemas** (following *Summary naming pattern):
   - `TradeItemDetails.yaml` (without key, for nested single-item)
   - `TradeItemDetailsSummary.yaml` (WITH key, for bulk)
   - `ItemDescription.yaml`, `ItemDescriptionsSummary.yaml`
   - `TradeItemOrdering.yaml`, `TradeItemOrderingsSummary.yaml`
   - `TradeItemPricing.yaml`, `TradeItemPricingsSummary.yaml` (1 row per price for bulk)
   - `AllowanceSurcharge.yaml`, `AllowanceSurchargeSummary.yaml`
   - `ItemRelation.yaml`, `ItemRelationSummary.yaml`
   - `ItemLogistics.yaml`, `ItemLogisticsSummary.yaml`
   - `PackagingUnit.yaml`, `ItemCountrySpecificField.yaml`
   - Include ETIM xChange field names and paths in all descriptions
3. **Create response envelope schemas** (named `$ref` for `data`):
   - Each single-item endpoint gets both `*Response.yaml` (envelope) and `*ResponseData.yaml` (named data schema)
   - `TradeItemResponse.yaml` + `TradeItemResponseData.yaml`
   - `TradeItemDetailsResponse.yaml` + `TradeItemDetailsResponseData.yaml`
   - `TradeItemDescriptionsResponse.yaml` + `TradeItemDescriptionsResponseData.yaml`
   - `TradeItemOrderingsResponse.yaml` + `TradeItemOrderingsResponseData.yaml`
   - `TradeItemPricingsResponse.yaml` + `TradeItemPricingsResponseData.yaml`
   - `TradeItemAllowanceSurchargesResponse.yaml` + `TradeItemAllowanceSurchargesResponseData.yaml`
   - `TradeItemRelationsResponse.yaml` + `TradeItemRelationsResponseData.yaml`
   - `TradeItemLogisticsDetailsResponse.yaml` + `TradeItemLogisticsDetailsResponseData.yaml`
4. **Create bulk response schemas** (using *Summary schemas):
   - `BulkTradeItemDetailsResponse.yaml`
   - `BulkTradeItemDescriptionsResponse.yaml`
   - `BulkTradeItemOrderingsResponse.yaml`
   - `BulkTradeItemPricingsResponse.yaml`
   - `BulkAllowanceSurchargesResponse.yaml`
   - `BulkTradeItemRelationsResponse.yaml`
   - `BulkTradeItemLogisticsDetailsResponse.yaml`
5. **Author single-item path definitions**:
   - `trade-items.yaml` - GET /trade-items/{supplierIdGln}/{supplierItemNumber}
   - `trade-item-details.yaml` - GET /trade-items/{key}/details
   - `trade-item-descriptions.yaml` - GET /trade-items/{key}/descriptions
   - `trade-item-orderings.yaml` - GET /trade-items/{key}/orderings
   - `trade-item-pricings.yaml` - GET /trade-items/{key}/pricings
   - `trade-item-allowance-surcharges.yaml` - GET /trade-items/{key}/allowance-surcharges
   - `trade-item-relations.yaml` - GET /trade-items/{key}/relations
   - `trade-item-logistics-details.yaml` - GET /trade-items/{key}/logistics-details
6. **Author bulk path definitions** (under `paths/bulk/`, following `/{resource}/bulk/{aspect}` convention):
   - `bulk/details.yaml`, `bulk/descriptions.yaml`, `bulk/orderings.yaml`
   - `bulk/pricings.yaml`, `bulk/allowance-surcharges.yaml`
   - `bulk/relations.yaml`, `bulk/logistics-details.yaml`
7. **Author main OpenAPI spec**: Populate `openapi.yaml` with all paths, servers, tags, and shared components
   - Register ALL schemas, parameters, and responses in `components/`
8. **Validate**: Ensure all schemas pass OpenAPI 3.1 validation
9. **Review**: Verify all ETIM xChange references are accurate and complete

### 20. Special Considerations

- **Keep product reference**: TradeItem is nested under Product in ETIM, but flatten for API
- **ETIM xChange documentation**: Every field must document its ETIM source with name and path
- **Language handling**: Support multilingual descriptions where present. `DiscountGroupDescription[]` and `BonusGroupDescription[]` are multilingual and served from the description service (not the details service). Language fields are **required and non-nullable** — denormalized from catalog-level `Language` (see section 2.5). Use the `language` query parameter for filtering.
- **Currency handling**: `currencyCode` is **required and non-nullable** on all pricing records — denormalized from catalog-level `CurrencyCode` (see section 2.5)
- **Attachment handling**: Reference URIs for documents/images
- **Country-specific fields**: Design extensible pattern for custom fields
- **Pricing complexity**: Handle multiple pricing scenarios, allowances, surcharges
- **Packaging hierarchy**: Support nested packaging units
- **Path notation**: Use `[]` to indicate arrays in ETIM paths (e.g., `Supplier[].Product[].TradeItem[]`)
- **Server URLs**: Use parameterized `{host}{basePath}` pattern — do NOT hardcode implementer-specific URLs
- **Response envelopes**: Always use named `$ref` for `data` property (`*ResponseData.yaml`) — never inline objects
- **Domain model documentation**: A separate `openapi-domain.yaml` provides schema-only documentation for the TradeItem domain (registered as `tradeitem-domain@v1` in Redocly)

### 21. Success Criteria

✅ All schemas validate against OpenAPI 3.1 / JSON Schema 2020-12  
✅ Naming conventions strictly followed (PascalCase components, camelCase properties)  
✅ **Every field includes ETIM xChange field name and full JSON path in description**  
✅ **All ETIM xChange string-based numeric fields converted to proper `number` type**  
✅ Numeric fields use `format: decimal` and `multipleOf: 0.0001` for 4 decimal place precision  
✅ **Nullable fields use `type: ["type", "null"]` pattern (not in required array)**  
✅ **Enum schemas include `null` in enum array when nullable**  
✅ **String boolean enums preserved as-is (e.g., `rohsIndicator`, `reachIndicator`)**  
✅ **Date fields include format and ISO 8601 description with examples**  
✅ Bulk endpoints use cursor-based pagination  
✅ Minimal nesting (max 2-3 levels deep)  
✅ Filtering by `selectionId`, `mutationDateTime`, and `supplierIdGln` implemented  
✅ All bulk paths follow `/{resource}/bulk/{aspect}` convention (e.g., `/trade-items/bulk/details`)  
✅ Composite key (`supplierIdGln` + `supplierItemNumber`) consistently used  
✅ **Response envelopes use named `$ref` for `data` (`*ResponseData.yaml`) — no inline anonymous objects**  
✅ Single trade item endpoint returns nested structure with key at root  
✅ All 7 subresource endpoints follow Product API pattern (details, descriptions, orderings, pricings, allowance-surcharges, relations, logistics-details)  
✅ `*Summary` schemas used for bulk retrieval (WITH embedded keys)  
✅ Domain schemas used for nested single-item (WITHOUT keys)  
✅ Comprehensive examples provided with numeric values (not strings)  
✅ Examples include `null` values for nullable fields  
✅ Reuse existing shared components (parameters, responses)  
✅ **ALL shared components registered in `openapi.yaml` `components/` section (PascalCase names)**  
✅ Error responses follow RFC 7807 Problem Details  
✅ ETIM xChange traceability complete for all mapped fields  
✅ `TechnicalId` schema used for `selectionId` parameter and `pricingRef` property  
✅ `pricingRef` used as join key between pricings and allowance/surcharges  
✅ `pricingRef` documented as server-generated, not present in ETIM xChange domain model  
✅ **Catalog-level `CurrencyCode` denormalized into each pricing record as required, non-nullable `$ref`**  
✅ **Catalog-level `Language` denormalized into each description/multilingual record as required, non-nullable `$ref`**  
✅ **Language fields use locale format `^[a-z]{2}[-][A-Z]{2}$` (e.g., `"en-GB"`, `"nl-NL"`)**  
✅ **Server URLs use parameterized `{host}{basePath}` pattern (not hardcoded 2BA URLs)**  
✅ **Tags: exactly 2 tags (`TradeItems single`, `TradeItems bulk`)**  
✅ **Operation summaries use short Get/List pattern**  

## Output Files Expected

Generate the following files:

### New Files
1. `openapi/apis/tradeitem/openapi.yaml`
2. `openapi/apis/tradeitem/openapi-domain.yaml` (domain model documentation)
3. `openapi/apis/tradeitem/README.md`

**Single-item path definitions**:
4. `openapi/apis/tradeitem/paths/trade-items.yaml`
5. `openapi/apis/tradeitem/paths/trade-item-details.yaml`
6. `openapi/apis/tradeitem/paths/trade-item-descriptions.yaml`
7. `openapi/apis/tradeitem/paths/trade-item-orderings.yaml`
8. `openapi/apis/tradeitem/paths/trade-item-pricings.yaml`
9. `openapi/apis/tradeitem/paths/trade-item-allowance-surcharges.yaml`
10. `openapi/apis/tradeitem/paths/trade-item-relations.yaml`
11. `openapi/apis/tradeitem/paths/trade-item-logistics-details.yaml`

**Bulk path definitions** (file names follow `/{resource}/bulk/{aspect}` → `bulk/{aspect}.yaml`):
12. `openapi/apis/tradeitem/paths/bulk/details.yaml`
13. `openapi/apis/tradeitem/paths/bulk/descriptions.yaml`
14. `openapi/apis/tradeitem/paths/bulk/orderings.yaml`
15. `openapi/apis/tradeitem/paths/bulk/pricings.yaml`
16. `openapi/apis/tradeitem/paths/bulk/allowance-surcharges.yaml`
17. `openapi/apis/tradeitem/paths/bulk/relations.yaml`
18. `openapi/apis/tradeitem/paths/bulk/logistics-details.yaml`

**Domain schemas (without keys - for nested single-item)**:
19. `openapi/apis/tradeitem/schemas/domain/TradeItemDetails.yaml`
20. `openapi/apis/tradeitem/schemas/domain/ItemDescription.yaml`
21. `openapi/apis/tradeitem/schemas/domain/TradeItemOrdering.yaml`
22. `openapi/apis/tradeitem/schemas/domain/TradeItemPricing.yaml` (includes `pricingRef`, excludes nested allowance/surcharges)
23. `openapi/apis/tradeitem/schemas/domain/AllowanceSurcharge.yaml`
24. `openapi/apis/tradeitem/schemas/domain/ItemLogistics.yaml`
25. `openapi/apis/tradeitem/schemas/domain/ItemRelation.yaml`
26. `openapi/apis/tradeitem/schemas/domain/PackagingUnit.yaml`
27. `openapi/apis/tradeitem/schemas/domain/ItemCountrySpecificField.yaml`
28. `openapi/apis/tradeitem/schemas/domain/ItemDetails.yaml`
29. `openapi/apis/tradeitem/schemas/domain/ItemIdentification.yaml`
30. `openapi/apis/tradeitem/schemas/domain/ItemAttachment.yaml`

**Domain schemas (WITH keys - for bulk retrieval)**:
31. `openapi/apis/tradeitem/schemas/domain/TradeItemDetailsSummary.yaml`
32. `openapi/apis/tradeitem/schemas/domain/ItemDescriptionsSummary.yaml`
33. `openapi/apis/tradeitem/schemas/domain/TradeItemOrderingsSummary.yaml`
34. `openapi/apis/tradeitem/schemas/domain/TradeItemPricingsSummary.yaml` (flattened - 1 row per price, includes `pricingRef`)
35. `openapi/apis/tradeitem/schemas/domain/AllowanceSurchargeSummary.yaml` (flattened - 1 row per surcharge, join via `pricingRef`)
36. `openapi/apis/tradeitem/schemas/domain/ItemRelationSummary.yaml`
37. `openapi/apis/tradeitem/schemas/domain/ItemLogisticsSummary.yaml`

**Single-item response envelope schemas** (each pair: `*Response.yaml` + `*ResponseData.yaml`):
38. `openapi/apis/tradeitem/schemas/responses/TradeItemResponse.yaml`
39. `openapi/apis/tradeitem/schemas/responses/TradeItemResponseData.yaml`
40. `openapi/apis/tradeitem/schemas/responses/TradeItemDetailsResponse.yaml`
41. `openapi/apis/tradeitem/schemas/responses/TradeItemDetailsResponseData.yaml`
42. `openapi/apis/tradeitem/schemas/responses/TradeItemDescriptionsResponse.yaml`
43. `openapi/apis/tradeitem/schemas/responses/TradeItemDescriptionsResponseData.yaml`
44. `openapi/apis/tradeitem/schemas/responses/TradeItemOrderingsResponse.yaml`
45. `openapi/apis/tradeitem/schemas/responses/TradeItemOrderingsResponseData.yaml`
46. `openapi/apis/tradeitem/schemas/responses/TradeItemPricingsResponse.yaml`
47. `openapi/apis/tradeitem/schemas/responses/TradeItemPricingsResponseData.yaml`
48. `openapi/apis/tradeitem/schemas/responses/TradeItemAllowanceSurchargesResponse.yaml`
49. `openapi/apis/tradeitem/schemas/responses/TradeItemAllowanceSurchargesResponseData.yaml`
50. `openapi/apis/tradeitem/schemas/responses/TradeItemAllowanceSurchargeItem.yaml` (includes `pricingRef` for correlation)
51. `openapi/apis/tradeitem/schemas/responses/TradeItemRelationsResponse.yaml`
52. `openapi/apis/tradeitem/schemas/responses/TradeItemRelationsResponseData.yaml`
53. `openapi/apis/tradeitem/schemas/responses/TradeItemLogisticsDetailsResponse.yaml`
54. `openapi/apis/tradeitem/schemas/responses/TradeItemLogisticsDetailsResponseData.yaml`

**Bulk response schemas**:
55. `openapi/apis/tradeitem/schemas/responses/BulkTradeItemDetailsResponse.yaml`
56. `openapi/apis/tradeitem/schemas/responses/BulkTradeItemDescriptionsResponse.yaml`
57. `openapi/apis/tradeitem/schemas/responses/BulkTradeItemOrderingsResponse.yaml`
58. `openapi/apis/tradeitem/schemas/responses/BulkTradeItemPricingsResponse.yaml`
59. `openapi/apis/tradeitem/schemas/responses/BulkAllowanceSurchargesResponse.yaml`
60. `openapi/apis/tradeitem/schemas/responses/BulkTradeItemRelationsResponse.yaml`
61. `openapi/apis/tradeitem/schemas/responses/BulkTradeItemLogisticsDetailsResponse.yaml`

**Enum schemas**:
62. `openapi/apis/tradeitem/schemas/enums/ItemStatus.yaml`
63. `openapi/apis/tradeitem/schemas/enums/ItemCondition.yaml`
64. `openapi/apis/tradeitem/schemas/enums/RelationType.yaml`

### Existing Files to Reuse (DO NOT CREATE)
- `openapi/shared/parameters/query/selection-id.yaml`
- `openapi/shared/parameters/query/mutation-date-time.yaml`
- `openapi/shared/parameters/query/cursor.yaml`
- `openapi/shared/parameters/query/limit.yaml`
- `openapi/shared/parameters/query/language.yaml`
- `openapi/shared/parameters/query/supplier-id-gln-filter.yaml`
- `openapi/shared/parameters/path/supplier-id-gln.yaml`
- `openapi/shared/parameters/path/supplier-item-number.yaml`
- `openapi/shared/responses/400-bad-request.yaml`
- `openapi/shared/responses/401-unauthorized.yaml`
- `openapi/shared/responses/403-forbidden.yaml`
- `openapi/shared/responses/404-not-found.yaml`
- `openapi/shared/responses/500-internal-server-error.yaml`
- `openapi/shared/schemas/common/CursorPaginationMetadata.yaml`
- `openapi/shared/schemas/common/ProblemDetails.yaml`
- `openapi/shared/schemas/identifiers/TechnicalId.yaml`
- `openapi/shared/schemas/identifiers/Gln.yaml`
- `openapi/shared/schemas/identifiers/Gtin.yaml`
- `openapi/shared/schemas/common/CurrencyCode.yaml`
- `openapi/shared/schemas/common/LanguageCode.yaml`

## Notes
- Follow the ETIM xChange V2.0 schema structure but adapt for REST API best practices
- Prioritize developer experience with clear, flat structures
- Design for high-volume data exchange scenarios
- Consider implementing rate limiting headers in responses
