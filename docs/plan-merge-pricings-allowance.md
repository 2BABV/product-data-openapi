# Analysis: Flattening Pricing + AllowanceSurcharges into One Bulk Service

## Problem Statement

In the TradeItem API, the ETIM xChange source model **nests** `AllowanceSurcharge[]` inside each `Pricing[]` entry. However, the current OpenAPI design exposes them as **two separate** bulk endpoints:

1. `GET /bulk/trade-item-pricings` → 1 row per price, `allowanceSurcharges: null`
2. `GET /bulk/trade-item-allowance-surcharges` → 1 row per surcharge, linked via `pricingRef`

This introduces an **artificial `pricingRef`** — a server-generated opaque key not present in the ETIM xChange domain model — solely to enable clients to JOIN the two result sets.

**Question**: Should these be merged into a single endpoint? Is the current split justified, or does it create unnecessary complexity?

---

## Current Architecture

### ETIM xChange Source (Nested)

```
TradeItem
  └── Pricing[]                        ← array of price entries
        ├── PriceUnit, PriceQuantity, GrossListPrice, NetPrice, ...
        └── AllowanceSurcharge[]       ← NESTED inside each Pricing
              ├── AllowanceSurchargeIndicator (ALLOWANCE/SURCHARGE)
              ├── AllowanceSurchargeType (UNECE code)
              ├── AllowanceSurchargeAmount / AllowanceSurchargePercentage
              └── AllowanceSurchargeSequenceNumber, MinimumQuantity, ...
```

### Current OpenAPI Design (Split into Two Endpoints)

**Single-item endpoints** (also split):
- `/{gln}/{item}/pricings` → `TradeItemPricingsResponseData` with `pricings[]` array, each pricing has `allowanceSurcharges: null`
- `/{gln}/{item}/allowance-surcharges` → `TradeItemAllowanceSurchargesResponseData` with `allowanceSurcharges[]` array, each has `pricingRef`

**Bulk endpoints** (also split):
- `/bulk/trade-item-pricings` → `BulkTradeItemPricingsResponse`, items = `TradeItemPricingSummary` (flat, no allowanceSurcharges)
- `/bulk/trade-item-allowance-surcharges` → `BulkAllowanceSurchargesResponse`, items = `AllowanceSurchargeSummary` (flat, includes pricingRef)

**Key observation**: `TradeItemPricing.yaml` (the domain schema used in single-item responses) already HAS an `allowanceSurcharges` property — it's just always set to `null` in subresource and bulk responses.

---

## Why Nesting Is Wrong in a Flattened Bulk Endpoint

The bulk endpoints follow a **flattened structure** pattern: every row in `data[]` is a uniform flat object with the same shape. This is the core principle behind all other bulk endpoints in this API (details, descriptions, orderings, relations, logistics-details).

Embedding a nested `allowanceSurcharges[]` array inside a "flattened" pricing row **contradicts this principle**. A pricing with 0 surcharges and a pricing with 5 surcharges would have fundamentally different row shapes. This breaks:
- Predictable pagination (row size varies with surcharge count)
- ETL loading (nested arrays require extra transformation)
- The uniform-row contract that all other bulk endpoints follow

**The correct way to merge is true denormalization** — a LEFT JOIN pattern where pricing fields are repeated on each surcharge row:

```
┌─────────────────┬──────────────┬───────┬───────────┬─────────────┬────────┐
│ supplierIdGln   │ itemNumber   │ unit  │ grossList │ asIndicator │ asType │
├─────────────────┼──────────────┼───────┼───────────┼─────────────┼────────┤
│ 8712423012485   │ SKU-LAMP-001 │ C62   │ 12.99     │ ALLOWANCE   │ AEQ    │
│ 8712423012485   │ SKU-LAMP-001 │ C62   │ 12.99     │ SURCHARGE   │ DBD    │
│ 8712423012485   │ SKU-CABLE-02 │ MTR   │ 1.59      │ null        │ null   │
└─────────────────┴──────────────┴───────┴───────────┴─────────────┴────────┘
```

This is how relational systems have always handled parent-child data: the LEFT JOIN result. Every row is the same shape, no nesting, no artificial keys.

---

## Option A: True Flat Merge — One Endpoint, LEFT JOIN Style (Recommended ✅)

### How It Would Look

**Merged Bulk Endpoint**: `/bulk/trade-item-pricings`

Each row = 1 pricing × 1 allowance/surcharge combination. Pricings without surcharges still appear as 1 row with `null` allowance fields.

```yaml
# Example response
data:
  # Pricing with allowance (row 1 of 2 for this price)
  - supplierIdGln: "8712423012485"
    supplierItemNumber: "SKU-LAMP-001"
    priceUnit: C62
    priceQuantity: 1
    currencyCode: EUR
    grossListPrice: 12.99
    netPrice: 9.99
    vat: 21.0
    priceValidityDate: "2025-01-01"
    priceExpiryDate: "2025-12-31"
    allowanceSurchargeIndicator: ALLOWANCE      # ← flat, not nested
    allowanceSurchargeType: AEQ
    allowanceSurchargeSequenceNumber: 1
    allowanceSurchargePercentage: 5.5
    allowanceSurchargeAmount: null
    allowanceSurchargeMinimumQuantity: 50
    allowanceSurchargeValidityDate: "2025-01-01"
  # Same pricing with surcharge (row 2 of 2 — pricing fields repeated)
  - supplierIdGln: "8712423012485"
    supplierItemNumber: "SKU-LAMP-001"
    priceUnit: C62
    priceQuantity: 1
    currencyCode: EUR
    grossListPrice: 12.99
    netPrice: 9.99
    vat: 21.0
    priceValidityDate: "2025-01-01"
    priceExpiryDate: "2025-12-31"
    allowanceSurchargeIndicator: SURCHARGE
    allowanceSurchargeType: DBD
    allowanceSurchargeSequenceNumber: 2
    allowanceSurchargePercentage: null
    allowanceSurchargeAmount: 25.00
    allowanceSurchargeMinimumQuantity: null
    allowanceSurchargeValidityDate: null
  # Pricing without surcharges (allowance fields all null)
  - supplierIdGln: "8712423012485"
    supplierItemNumber: "SKU-CABLE-002"
    priceUnit: MTR
    priceQuantity: 100
    currencyCode: EUR
    netPrice: 1.59
    priceValidityDate: "2025-01-01"
    allowanceSurchargeIndicator: null
    allowanceSurchargeType: null
    allowanceSurchargeSequenceNumber: null
    allowanceSurchargePercentage: null
    allowanceSurchargeAmount: null
    allowanceSurchargeMinimumQuantity: null
    allowanceSurchargeValidityDate: null
meta:
  cursor: "..."
  hasNext: true
  limit: 100
  estimatedTotal: 28100
```

### Why No `pricingRef` Is Needed

The pricing fields themselves **are** the grouping key. If two rows share the same `supplierIdGln` + `supplierItemNumber` + `priceUnit` + `priceQuantity` + `priceValidityDate` + `grossListPrice` + ... then they describe the **same pricing** — just with different surcharges attached.

If two pricing entries are truly identical in every field, they are semantically the same pricing. Duplicate pricing entries would be a data quality issue in the source system, not something the API should paper over with synthetic identifiers.

This is the same principle used throughout the ETIM xChange model: data identity is determined by the data itself, not by positional array indices or artificial keys.

### What Changes

| Aspect | Current (Split) | True Flat Merge |
|--------|----------------|-----------------|
| **Endpoints** | 2 bulk endpoints | **1 bulk endpoint** |
| **pricingRef** | Required (artificial join key) | **Eliminated** — data is the key |
| **Join logic** | Client must JOIN on 3 keys | **None needed** — all data in one row |
| **Row shape** | Uniform per endpoint | **Uniform** — every row has same fields |
| **Pagination unit** | 1 row = 1 price OR 1 surcharge | 1 row = 1 pricing × surcharge combo |
| **API calls** | 2 paginated streams to sync | **1 paginated stream** |
| **ETIM alignment** | Deviated (artificial split + synthetic key) | **Aligned** (denormalized, no inventions) |
| **Row count** | `P + S` across 2 endpoints | `P + S` in 1 endpoint (same total) |
| **Nesting** | None (both endpoints flat) | **None** (truly flat) |
| **Data duplication** | None | Pricing fields repeated per surcharge |

### Data Duplication Is Bounded and Acceptable

The duplication is strictly bounded: ETIM xChange pricing entries typically have 0–5 surcharges. The pricing fields being repeated are ~10 scalar values. This is:
- **Negligible** in payload size (a few hundred bytes per duplicated row)
- **Consistent** with how other flat bulk endpoints work (e.g., `/bulk/product-etim-classification-features` repeats product key fields per feature)
- **Expected** by ETL/data warehouse clients who already handle denormalized data

### Client-Side Reconstruction

If a client wants the original nested structure, a simple `GROUP BY` on the pricing fields reconstructs it:

```python
# Group flat rows back into pricing → surcharges hierarchy
for key, group in groupby(rows, key=lambda r: (r.supplierIdGln, r.supplierItemNumber, 
                                                 r.priceUnit, r.priceQuantity, 
                                                 r.priceValidityDate)):
    pricing = group[0]  # pricing fields from any row in the group
    surcharges = [r for r in group if r.allowanceSurchargeIndicator is not None]
```

### Schema Changes Required

**New unified summary schema** — `TradeItemPricingSummary.yaml`:
1. Remove `pricingRef`
2. Add all `AllowanceSurcharge` fields as nullable top-level properties:
   - `allowanceSurchargeIndicator` (nullable — `null` when no surcharges)
   - `allowanceSurchargeType` (nullable)
   - `allowanceSurchargeSequenceNumber` (nullable)
   - `allowanceSurchargeAmount` (nullable)
   - `allowanceSurchargePercentage` (nullable)
   - `allowanceSurchargeMinimumQuantity` (nullable)
   - `allowanceSurchargeValidityDate` (nullable)

**Remove** (no longer needed):
- `AllowanceSurchargeSummary.yaml` (bulk-specific flat schema)
- `BulkAllowanceSurchargesResponse.yaml`
- `/bulk/trade-item-allowance-surcharges` path

**Update**:
- `openapi.yaml` — Remove allowance-surcharge component registrations
- `paths/bulk/trade-item-pricings.yaml` — Update description, examples

**Single-item endpoints** — Same consolidation:
- Remove `/{gln}/{item}/allowance-surcharges` path
- Populate `allowanceSurcharges` in `/pricings` response (change from `null` to actual data)
- Remove `TradeItemAllowanceSurchargesResponse*.yaml`, `TradeItemAllowanceSurchargeItem.yaml`
- Remove `pricingRef` from `TradeItemPricing.yaml`

---

## Option B: Keep Split (Current Design)

### Arguments For Keeping Split

1. **ETL / star schema** — Data warehouse clients may prefer normalized fact tables (pricing fact + surcharges fact), loadable directly from the API without transformation
2. **Predictable pagination** — Every row is the same "shape"; no variable-length nested arrays
3. **Selective fetching** — Client only interested in surcharges doesn't need to page through all pricing data
4. **Consistent pattern** — Other bulk endpoints in this API are also split by domain aspect

### Arguments Against (Why Split Is Problematic)

1. **Artificial `pricingRef`** — An opaque server-generated key that doesn't exist in ETIM xChange. Clients must understand and use this non-domain artifact
2. **Fragile correlation** — Two separately paginated streams that must be reconciled. Pagination cursors are independent — surcharges may paginate at different boundaries than their parent pricing
3. **Two API calls** — Clients always need BOTH endpoints to get a complete pricing picture; the split only helps the rare case where someone wants surcharges without prices
4. **Violates ETIM's own modeling** — ETIM xChange deliberately nests AllowanceSurcharges inside Pricing because they are semantically inseparable. A surcharge has no meaning without its parent price
5. **Inconsistency risk** — A mutation between the two paginated calls could cause stale joins

---

## Recommendation: **Encourage Merging (True Flat)** ✅

### Reasoning

The split was originally motivated by data warehouse optimization (star schema, predictable rows). However, the **costs outweigh the benefits**:

| Factor | Weight | Split (2 endpoints) | True Flat Merge (1 endpoint) |
|--------|--------|---------------------|------------------------------|
| Domain fidelity (ETIM alignment) | High | ❌ Artificial split + synthetic key | ✅ Denormalized, no inventions |
| Client simplicity | High | ❌ 2 calls + JOIN on 3 keys | ✅ 1 call, all data in every row |
| No artificial keys | High | ❌ `pricingRef` invented | ✅ Data is its own key |
| Flat row contract | High | ✅ Flat | ✅ Flat |
| Data consistency | Medium | ❌ Pagination mismatch risk | ✅ Atomic per row |
| Pagination predictability | Medium | ✅ Uniform rows per endpoint | ✅ Uniform rows (same shape) |
| ETL loading | Low | ✅ Direct fact tables | ✅ Also direct fact table (already flat) |

**Key insight**: The true flat merge gives the **best of both worlds** — it's flat (like the current split), yet requires only one endpoint and no artificial keys. ETL clients can load the flat rows directly. Application clients can GROUP BY to reconstruct the hierarchy.

**The `pricingRef` is the strongest signal** — when you invent a non-domain identifier purely to work around your own API design, that's a design smell. The ETIM xChange model got this right: surcharges belong to their pricing entry, and the pricing data itself is the identity.

### Comparison With Other Bulk Services

No other bulk service in this API invents an artificial join key to split nested data into separate endpoints. Details, descriptions, orderings, relations, logistics-details — each is ONE bulk endpoint per domain aspect. The pricing/surcharges split is the outlier.

In the Product API, `/bulk/product-etim-classification-features` denormalizes features with their parent classification data repeated per feature row — it does NOT split features into a separate endpoint with an artificial join key. **This is the exact same pattern we should follow for pricing + surcharges.**

---

## Proposed Migration Path

### Phase 1: Merge into single flat endpoint

- Merge allowance/surcharge fields into `TradeItemPricingSummary.yaml` as nullable top-level properties
- Remove `pricingRef` from pricing schemas
- Update `/bulk/trade-item-pricings` description and examples
- Populate `allowanceSurcharges` in `/{gln}/{item}/pricings` single-item response
- Update `openapi.yaml` component registrations

### Phase 2: Deprecate split endpoints

- Mark `/bulk/trade-item-allowance-surcharges` as deprecated
- Mark `/{gln}/{item}/allowance-surcharges` as deprecated
- Document migration path for existing consumers

### Phase 3: Remove split endpoints (next major version)

- Remove deprecated paths and schemas
- Clean up `openapi.yaml` components

---

## Impact Assessment

### Files to Modify (Phase 1)

1. `schemas/domain/TradeItemPricingSummary.yaml` — Add allowance/surcharge fields as nullable top-level properties, remove `pricingRef`
2. `schemas/domain/TradeItemPricing.yaml` — Remove `pricingRef`, populate `allowanceSurcharges` (no longer null)
3. `paths/bulk/trade-item-pricings.yaml` — Update description, update examples to show flat merged rows
4. `paths/trade-item-pricings.yaml` — Update description (remove "always null" note)
5. `openapi.yaml` — Update component registrations

### Files to Deprecate (Phase 2)

6. `paths/bulk/trade-item-allowance-surcharges.yaml` — Mark deprecated
7. `paths/trade-item-allowance-surcharges.yaml` — Mark deprecated
8. `schemas/responses/BulkAllowanceSurchargesResponse.yaml` — Mark deprecated
9. `schemas/responses/TradeItemAllowanceSurchargesResponse.yaml` — Mark deprecated
10. `schemas/responses/TradeItemAllowanceSurchargesResponseData.yaml` — Mark deprecated
11. `schemas/responses/TradeItemAllowanceSurchargeItem.yaml` — Mark deprecated
12. `schemas/domain/AllowanceSurchargeSummary.yaml` — Mark deprecated

### Files to Remove (Phase 3)

- All deprecated files above
- `pricingRef` references everywhere
