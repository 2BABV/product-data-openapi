# Changelog — Trade Item API

All notable changes to the Trade Item API will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This API adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Bulk packaging identification endpoint: `GET /trade-items/bulk/packaging-unit-identification`
  - Flat `PackagingUnitPackagingIdentificationSummary` schema with all packaging identification fields
  - New fields: `packagingBreak`, `numberOfPackagingParts`
- Bulk packaging logistic details endpoint: `GET /trade-items/bulk/packaging-unit-logistic-details`
  - Flat `PackagingUnitPackagingLogisticDetailSummary` schema with per-part logistic detail fields
  - Parent packaging context: `packagingTypeCode`, `supplierPackagingNumber`
  - New fields: `supplierPackagingPartNumber`, `manufacturerPackagingPartNumber`, `packagingPartGtins`, `serialNumberOnPackaging`, `stackingFactor`, `packagingTippable`
  - Uses ETIM-aligned field names (`packagingTypeLength`, etc.) for bulk summary
- Bulk enclosed items endpoint: `GET /trade-items/bulk/packaging-unit-enclosed-items`
  - Flat `PackagingUnitTradeItemEnclosedSummary` schema
### Changed
- **Removed sub-resource `/enclosed-items`** — Enclosed items are now returned nested within the `/packaging-units` sub-resource via `PackagingUnit.tradeItemEnclosed[]`. The separate flattened view was redundant. Bulk endpoint `/bulk/packaging-unit-enclosed-items` remains for ETL.
- **Response convention: sub-resource 404 removed** — Sub-resource endpoints (`/details`, `/descriptions`, `/ordering`, `/pricings`, `/relations`, `/logistic-details`, `/attachments`, `/packaging-units`) no longer return `404`. They always return `200` with an empty collection (`[]`) or `null` object. Only the root endpoint (`/trade-items/{gln}/{num}`) returns `404`.
- **Response convention: root 404 uses shared response** — The root endpoint `404` now uses the shared `application/problem+json` response (was inline `application/json`).
- **Response convention: sub-resource arrays non-nullable** — Array properties in sub-resource response schemas (`TradeItemDescriptionsResponseData`, `TradeItemAttachmentsResponseData`, `TradeItemRelationsResponseData`, `TradeItemLogisticDetailsResponseData`, `TradeItemPackagingUnitsResponseData`) changed from `type: ["array", "null"]` to `type: array`. Empty = `[]`, never `null`. (`TradeItemPricingsResponseData` already used `type: array`.)
- **Response convention: aggregate root arrays support partial inclusion** — Array properties in `TradeItemResponseData` (`descriptions`, `pricings`, `relations`, `logisticDetails`, `attachments`, `packagingUnits`) use three-state semantics: `[...]` = has data, `[]` = included but empty, `null` = not included in this response. Schema uses `type: ["array", "null"]` (required + nullable).
- **Response convention: sub-resource singular objects nullable** — `details` in `TradeItemDetailsResponseData` and `ordering` in `TradeItemOrderingResponseData` are now nullable (`anyOf: [$ref, type: "null"]`). When the parent trade item does not exist, these endpoints return `200` with `null` instead of `404`. Aligns with array sub-resources (which return `[]`) and Product API precedent (`ProductLcaEnvironmentalResponseData`).

## [1.0.0-Preview2] - 2026-04-24

### Changed
- Renaming inconsistencies and consolidating

## [1.0.0-Preview1] - 2026-04-15

### Added
- Initial preview release of the Trade Item API
- Single-item endpoints
- Bulk endpoints
- Cursor-based pagination for all bulk endpoints
- OAuth 2.0 security
- RFC 7807 Problem Details error responses
