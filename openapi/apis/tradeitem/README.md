# TradeItem API Domain Model

## Overview

The TradeItem API manages supplier trade item information based on ETIM xChange V2.0. Trade items represent the supplier's perspective of products they sell, including pricing, ordering conditions, logistics, and packaging information.

This API provides both individual trade item operations and bulk data retrieval with cursor-based pagination for high-volume synchronization scenarios.



## TradeItem Design Decisions

### Key Identification Fields

Trade items are uniquely identified by the composite key:
- `supplierIdGln` (GLN - 13 digits) + `supplierItemNumber` (max 35 chars)

Each trade item links to its parent product via required reference fields:
- `manufacturerIdGln` + `manufacturerProductNumber`

This enables joining trade item data with product specifications from the Product API.

### TradeItem Details

TradeItem details (`TradeItemDetails`) combines identification and operational information into a single schema:
- **Identification**: alternative item numbers, manufacturer references, GTINs, buyer item numbers
- **Commercial**: discount/bonus group assignments, validity/obsolescence dates
- **Operational**: item status, condition, stock indicator, shelf life

This merged approach simplifies the API surface compared to the ETIM xChange source structure which separates `ItemIdentification` and `ItemDetails`.

### TradeItem Descriptions

Item descriptions are available via dedicated endpoints:
- `/{supplierIdGln}/{supplierItemNumber}/descriptions` - Single item descriptions (nested array)
- `/bulk/trade-item-descriptions` - Bulk descriptions (flattened, one row per language)

This separation allows:
- Independent retrieval of descriptions without loading full trade item details
- Language filtering at the API level
- Efficient bulk synchronization of multilingual content

### Bulk Endpoint Consolidation

The bulk API consolidates ETIM xChange sections for efficient data retrieval:

| Endpoint | ETIM xChange Sections | Schema |
|----------|----------------------|--------|
| `/bulk/trade-item-details` | `ItemIdentification` + `ItemDetails` (excl. descriptions) | `TradeItemDetailsSummary` |
| `/bulk/trade-item-descriptions` | `ItemDetails.ItemDescriptions[]` | `ItemDescriptionsSummary` |
| `/bulk/trade-item-orderings` | `Ordering` | `TradeItemOrderingsSummary` |
| `/bulk/trade-item-pricings` | `Pricing[]` (excl. allowances/surcharges) | `TradeItemPricingSummary` |
| `/bulk/trade-item-allowance-surcharges` | `Pricing[].AllowanceSurcharge[]` | `AllowanceSurchargeSummary` |
| `/bulk/trade-item-relations` | `ItemRelations[]` | `ItemRelationSummary` |
| `/bulk/trade-item-logistics-details` | `ItemLogisticDetails[]` | `ItemLogisticsSummary` |

**Note**: There is no separate `/bulk/trade-items` or `/bulk/item-identifications` endpoint. The `/bulk/trade-item-details` endpoint provides all identification fields combined with item details.

### Single-Item Endpoints

| Endpoint | Description | Schema |
|----------|-------------|--------|
| `/{supplierIdGln}/{supplierItemNumber}` | Core trade item info | `TradeItemResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/details` | Item details | `TradeItemDetailsResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/descriptions` | Multilingual descriptions | `TradeItemDescriptionsResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/orderings` | Ordering conditions | `TradeItemOrderingsResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/pricings` | Pricing information | `TradeItemPricingsResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/allowance-surcharges` | Allowances/surcharges | `TradeItemAllowanceSurchargesResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/relations` | Item relations | `TradeItemRelationsResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/logistics-details` | Item logistics details | `TradeItemLogisticsDetailsResponse` |

### Bulk Flattening Strategy

**Design Philosophy**: Maximize flattening for predictable pagination and ETL compatibility.

| Endpoint | Rows per Item | Flattening Pattern |
|----------|---------------|-------------------|
| `/bulk/trade-item-details` | 1 | Fully flat (all fields inline) |
| `/bulk/trade-item-orderings` | 1 | Fully flat (all fields inline) |
| `/bulk/trade-item-descriptions` | n (per language) | Flat per language row |
| `/bulk/trade-item-pricings` | n (per price tier) | **Flat per price entry** |
| `/bulk/trade-item-allowance-surcharges` | n (per surcharge) | **Flat per surcharge entry** |
| `/bulk/trade-item-relations` | n (per relation) | **Flat per relation entry** |
| `/bulk/trade-item-logistics-details` | 1 (typically) | Fully flat (all fields inline) |

**Pricing Flattening** (consistent with Product API's `ProductEtimClassificationFeature` pattern):
- Each row = 1 price entry with embedded trade item key (`supplierIdGln` + `supplierItemNumber`) and server-generated `pricingRef`
- Trade items with quantity tiers or validity periods generate multiple rows
- Enables predictable payload sizes and efficient cursor pagination
- Optimized for ETL/data warehouse ingestion

**Allowance/Surcharge Separation** (star schema pattern):
- Moved from nested array within pricing to separate `/bulk/trade-item-allowance-surcharges` endpoint
- Each row = 1 surcharge entry with embedded trade item key and `pricingRef` linking to the parent pricing entry
- Enables clean dimensional modeling: pricing fact table + surcharges fact table
- Join via: `supplierIdGln` + `supplierItemNumber` + `pricingRef`

**Nested structures retained**:
- Simple string arrays (`itemGtins[]`) - minimal impact on row predictability



## TradeItem TODO

### Medium Priority

**PackagingUnit** (PackagingUnit[])
- Multi-level packaging hierarchy support
- Packaging GTINs, dimensions, weights
- `QuantityInParent` relationships

**AllowanceSurchargeDescription**
- Multilingual description for allowances/surcharges: `AllowanceSurchargeDescription[]`
- Each entry has `language` (IETF tag) + `allowanceSurchargeDescription` (max 35 chars)
- Single-item endpoints: nested array (like other multilingual fields)
- Bulk endpoint: flattened to primary language string

**Country-Specific Fields**
- `ItemCountrySpecificFields[]` with typed values
- Decision needed: simplified model vs full type support (same as Product API)

### Low Priority

**Legislation Fields** (if applicable at trade item level)
- RoHS, REACH indicators (string enums: "true"/"false"/"exempt")
- Hazardous materials data

### Not Planned

**Full TradeItem Composite Endpoint** - The `/bulk/trade-item-details` consolidation means we don't need a separate endpoint returning everything. Clients can join details/orderings/pricings as needed.