# Plan: Naming Convention Improvements from Multi-Model Review

## Summary
Three independent code reviews (GPT-5.4, Claude Sonnet 4.6, Claude Opus 4.6) identified naming convention violations. Below is the consolidated, deduplicated list with consensus analysis and a proposed action plan.

## Findings — Cross-Model Consensus

### HIGH CONSENSUS (all 3 models agree)

#### 1. Summary schemas with extra "s" before Summary

Files to rename (each row represents ONE entity, not a collection):
- `ItemDescriptionsSummary.yaml` → `ItemDescriptionSummary.yaml`
- `TradeItemOrderingsSummary.yaml` → `TradeItemOrderingSummary.yaml`
- `ProductDescriptionsSummary.yaml` → `ProductDescriptionSummary.yaml`

Convention: Summary = `{BaseSchemaName}Summary`. Base schemas are singular, so summaries should be too.

Counterexamples that ARE correct:
- `TradeItemPricingsSummary` — justified because it groups MULTIPLE pricings per trade item (inner array)
- `TradeItemDetailsSummary` — justified because `TradeItemDetails` is a collective noun

#### 2. `TradeItemPricingsSummary` is a zombie/unused component

- `openapi.yaml:127` registers `TradeItemPricingsSummary` → `TradeItemPricingsSummary.yaml`
- But `BulkTradeItemPricingsResponse.yaml:24` actually references `TradeItemPricingSummary.yaml` (singular, correct)
- The plural file `TradeItemPricingsSummary.yaml` is registered but unused
- Fix: Remove `TradeItemPricingsSummary` component + file; register `TradeItemPricingSummary` instead

#### 3. Singular array properties in Product API (⚠️ BREAKING)

Properties that are `type: array` but use singular names:

| Property | Files | Suggested Plural |
|----------|-------|-----------------|
| `countryOfOrigin` | Product, ProductDetails, ProductDetailsSummary | `countriesOfOrigin` |
| `relatedManufacturerProductGroup` | Product, ProductDetails, ProductDetailsSummary | `relatedManufacturerProductGroups` |
| `productKeyword` | ProductDescription, ProductDescriptionsSummary | `productKeywords` |
| `relatedProductGtin` | RelatedProduct | `relatedProductGtins` |
| `lcaDeclaration` | LcaEnvironmental | `lcaDeclarations` |
| `tradeItemEnclosed` | PackagingUnit | `tradeItemsEnclosed` |
| `attachmentLanguage` | AttachmentDetails | `attachmentLanguages` |
| `attachmentDescription` | AttachmentDetails | `attachmentDescriptions` |
| `hazardClass` | Legislation | `hazardClasses` |
| `functionalUnitDescription` | LcaEnvironmental | `functionalUnitDescriptions` |

#### 4. `etimValueDetails` name collision

In `EtimFeature.yaml`, outer array and inner string share name `etimValueDetails`. Code generators produce confusing `feature.etimValueDetails[0].etimValueDetails`.

## Proposed Action Plan

### Phase 1: Non-breaking fixes (safe to do now)
1. Rename `ItemDescriptionsSummary` → `ItemDescriptionSummary` (file + component + refs)
2. Rename `TradeItemOrderingsSummary` → `TradeItemOrderingSummary` (file + component + refs)
3. Rename `ProductDescriptionsSummary` → `ProductDescriptionSummary` (file + component + refs)
4. Fix `TradeItemPricingsSummary` zombie: remove unused file/component, register `TradeItemPricingSummary`
5. Regenerate bundles, lint, commit

### Phase 2: Breaking fixes (requires coordination with consumers)
6. Rename singular array properties to plural (all 10 properties listed above)
7. Resolve `etimValueDetails` naming collision
8. Batch into a versioned release with migration guide

### Phase 3: Guideline improvements
9. Add explicit naming convention documentation to the repo
10. Document the collective noun exception (e.g., `ItemDetails`, `TradeItemPricingsSummary`)
11. Consider a linting rule or CI check for naming conventions

## Notes
- Phase 1 only affects component keys and filenames — generated class names change, but no response payloads change
- Phase 2 changes response payloads — coordinate with API versioning strategy
- ETIM xChange uses singular names for some arrays (e.g., `CountryOfOrigin[]`) — our API should NOT follow that; we pluralize array properties regardless of source naming
