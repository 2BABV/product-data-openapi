# Product and TradeItem Naming Review

**Date**: 2026-04-10  
**Source schema**: `resources/etim-xchange/ETIM xChange_Schema_V2.0-2025-11-27.json`  
**Scope**: current Product API and TradeItem API naming, compared against the ETIM xChange JSON schema

---

## Conclusion

- **Product API**: no naming problems found.
- **TradeItem API**: the exposed API naming is mostly intentional and correct, but several schema descriptions reference **wrong ETIM source names/paths**.
- There was **no local git diff** to review at the time of inspection, so this is a review of the current repository state on `main`.

---

## Correct and intentional naming differences

These differences from the ETIM schema are considered **right** in this repository:

| Pattern | Example | Why | Verdict |
|---|---|---|---|
| PascalCase -> camelCase | `ManufacturerProductNumber` -> `manufacturerProductNumber` | Standard JSON/REST naming convention used throughout this repo | **Right** |
| Array pluralization | `ProductGtin` -> `productGtins`, `ItemGtin` -> `itemGtins` | Improves clarity for array-valued fields | **Right** |
| Kebab-case paths | `/trade-items/bulk/pricings` | Matches repo path conventions | **Right** |
| OpenAPI component naming with extra context | `Ordering` -> `TradeItemOrdering`, `Pricing` -> `TradeItemPricing` | Avoids ambiguous component names in generated clients and shared docs | **Right** |
| Context prefixes for enclosed items | `SupplierItemNumber` -> `enclosedSupplierItemNumber` | Prevents ambiguity between parent item and enclosed item fields | **Right** |
| Response-envelope shaping | `ProductAttachments` represented as `attachments` inside `ProductResponseData` | Safe contextual shortening inside an already product-scoped response DTO | **Right** |
| API-only technical keys | `pricingRef` | Added for correlation in flat API responses; not intended to mirror ETIM field names | **Right** |

---

## Wrong ETIM source-name references in TradeItem docs

These are **documentation/annotation issues**, not API field-name issues.

| File | OpenAPI field | Current ETIM reference in docs | Canonical ETIM name/path | Why this is wrong | Verdict |
|---|---|---|---|---|---|
| `openapi/apis/tradeitem/schemas/domain/TradeItem.yaml` | `supplierIdGln` | `Supplier[].SupplierId.SupplierIdGln` | `SupplierIdGln` at `Supplier[].SupplierIdGln` | The ETIM JSON schema has a direct `SupplierIdGln` property on `Supplier`, not a nested `SupplierId.SupplierIdGln` object path | **Wrong** |
| `openapi/apis/tradeitem/schemas/responses/TradeItemResponseData.yaml` | `supplierIdGln` | `Supplier[].SupplierId.SupplierIdGln` | `SupplierIdGln` at `Supplier[].SupplierIdGln` | Same incorrect source-path description | **Wrong** |
| `openapi/apis/tradeitem/schemas/domain/TradeItemDetailsSummary.yaml` | `supplierIdGln` | `Supplier[].SupplierId.SupplierIdGln` | `SupplierIdGln` at `Supplier[].SupplierIdGln` | Same incorrect source-path description | **Wrong** |
| `openapi/apis/tradeitem/schemas/domain/TradeItemOrderingsSummary.yaml` | `supplierIdGln` | `Supplier[].SupplierId.SupplierIdGln` | `SupplierIdGln` at `Supplier[].SupplierIdGln` | Same incorrect source-path description | **Wrong** |
| `openapi/apis/tradeitem/schemas/domain/TradeItemPricingsSummary.yaml` | `supplierIdGln` | `Supplier[].SupplierId.SupplierIdGln` | `SupplierIdGln` at `Supplier[].SupplierIdGln` | Same incorrect source-path description | **Wrong** |
| `openapi/apis/tradeitem/schemas/domain/TradeItemPricingSummary.yaml` | `supplierIdGln` | `Supplier[].SupplierId.SupplierIdGln` | `SupplierIdGln` at `Supplier[].SupplierIdGln` | Same incorrect source-path description | **Wrong** |
| `openapi/apis/tradeitem/schemas/domain/PricingWithTradeItem.yaml` | `supplierIdGln` | `Supplier[].SupplierId.SupplierIdGln` | `SupplierIdGln` at `Supplier[].SupplierIdGln` | Same incorrect source-path description | **Wrong** |
| `openapi/apis/tradeitem/schemas/domain/AllowanceSurchargeSummary.yaml` | `supplierIdGln` | `Supplier[].SupplierId.SupplierIdGln` | `SupplierIdGln` at `Supplier[].SupplierIdGln` | Same incorrect source-path description | **Wrong** |
| `openapi/apis/tradeitem/schemas/domain/TradeItem.yaml` | `manufacturerIdGln` | `ManufacturerId.ManufacturerIdGln` | `ManufacturerIdGln` at `Supplier[].Product[].ProductIdentification.ManufacturerIdGln` | The ETIM JSON schema exposes `ManufacturerIdGln` directly under `ProductIdentification` | **Wrong** |
| `openapi/apis/tradeitem/schemas/responses/TradeItemResponseData.yaml` | `manufacturerIdGln` | `ManufacturerId.ManufacturerIdGln` | `ManufacturerIdGln` at `Supplier[].Product[].ProductIdentification.ManufacturerIdGln` | Same incorrect source-name description | **Wrong** |
| `openapi/apis/tradeitem/schemas/responses/TradeItemAllowanceSurchargesResponseData.yaml` | `supplierIdGln` | `SupplierId.IdValue` | `SupplierIdGln` | `SupplierId.IdValue` is not the canonical JSON schema field name in the ETIM source used here | **Wrong** |
| `openapi/apis/tradeitem/schemas/responses/TradeItemAllowanceSurchargesResponseData.yaml` | `supplierItemNumber` | `TradeItemSupplierItemNumber` | `SupplierItemNumber` at `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierItemNumber` | The canonical ETIM field is `SupplierItemNumber`; `TradeItemSupplierItemNumber` is not the schema name | **Wrong** |

---

## Product API observations

The Product API naming reviewed here is consistent with the ETIM schema and the repository conventions:

- camelCase JSON properties consistently map to ETIM PascalCase source fields
- path naming uses repo-standard kebab-case
- response DTO names intentionally differ from ETIM aggregate names where needed for OpenAPI clarity
- no incorrect ETIM source-name annotations were identified during this review

---

## Recommendation

If these docs are used as a traceability aid, the TradeItem schema descriptions listed above should be corrected so that:

- ETIM source names match the JSON schema exactly
- ETIM source paths point to the actual canonical locations
- reviewers can distinguish real API design choices from documentation drift
