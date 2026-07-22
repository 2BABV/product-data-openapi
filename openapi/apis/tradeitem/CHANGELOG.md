# Changelog — Trade Item API

All notable changes to the Trade Item API will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This API adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Response convention: sub-resource 404 removed** — Sub-resource endpoints (`/details`, `/descriptions`, `/ordering`, `/pricings`, `/relations`, `/logistic-details`, `/attachments`, `/enclosed-items`) no longer return `404`. They always return `200` with an empty collection (`[]`) or `null` object. Only the root endpoint (`/trade-items/{gln}/{num}`) returns `404`.
- **Response convention: root 404 uses shared response** — The root endpoint `404` now uses the shared `application/problem+json` response (was inline `application/json`).
- **Response convention: sub-resource arrays non-nullable** — Array properties in sub-resource response schemas (`TradeItemDescriptionsResponseData`, `TradeItemAttachmentsResponseData`, `TradeItemRelationsResponseData`, `TradeItemLogisticDetailsResponseData`, `TradeItemEnclosedItemsResponseData`) changed from `type: ["array", "null"]` to `type: array`. Empty = `[]`, never `null`. Also applies to `enclosedItemGtins` in the response-specific `TradeItemEnclosedItem` schema. (`TradeItemPricingsResponseData` already used `type: array`.)
- **Response convention: aggregate root arrays support partial inclusion** — Array properties in `TradeItemResponseData` (`descriptions`, `pricings`, `relations`, `logisticDetails`, `attachments`, `packagingUnits`) use three-state semantics: `[...]` = has data, `[]` = included but empty, `null` = not included in this response. Schema uses `type: ["array", "null"]` (required + nullable).
- **Response convention: sub-resource singular objects nullable** — `details` in `TradeItemDetailsResponseData` and `ordering` in `TradeItemOrderingResponseData` are now nullable (`anyOf: [$ref, type: "null"]`). When the parent trade item does not exist, these endpoints return `200` with `null` instead of `404`. Aligns with array sub-resources (which return `[]`) and Product API precedent (`ProductLcaEnvironmentalResponseData`).
- **Optionality convention: optional fields are absent, not null (Option B)** — Optional ETIM scalar, date, number, boolean, enum, and object properties that were previously nullable (`type: ["x", "null"]` or `anyOf: [$ref, type: "null"]`) are now optional and **non-null**; unavailable values are omitted from the payload instead of sent as `null`. Applies across Trade Item domain and summary schemas (e.g., `TradeItem`, `TradeItemDetails`/`Summary`, `TradeItemOrdering`/`Summary`, `ItemDescription`/`Summary`, `ItemLogistic`/`Summary`, `ItemRelation`/`Summary`, `ItemAttachment`/`Summary`, `TradeItemEnclosed`/`Summary`, `PackagingUnit`, `AllowanceSurcharge`, and the `AttachmentTypeSpecification` enum). Literal `null` values were removed from enum definitions and examples. This changes generated client contracts (nullable → optional) and is permitted during the v1 Preview phase.
- **Flattened pricing: conditional absence instead of nullable fields** — In `TradeItemPricingSummary`, the seven `allowanceSurcharge*` fields changed from nullable to optional and non-null. A pricing row without an allowance/surcharge now **omits all seven fields** entirely (never `null`). A `dependentRequired` block couples `allowanceSurchargeIndicator` and `allowanceSurchargeType` (both required whenever either — or any other allowance/surcharge field — is present), rejecting partial rows.
- **Domain aggregate follows canonical ETIM optionality** — `TradeItem.yaml` now uses optional, non-null collections and objects (omitted when unavailable); `ordering` remains required and non-null. The three-state `null`/`[]`/`[...]` field-selection semantics remain **only** in `TradeItemResponseData`.
- **Intentional `null` restricted to an allowlist** — JSON `null` is permitted only in `TradeItemResponseData` aggregate arrays (`descriptions`, `pricings`, `relations`, `logisticDetails`, `attachments`, `packagingUnits`), the required-nullable singular `data` properties (`TradeItemDetailsResponseData.details`, `TradeItemOrderingResponseData.ordering`), and pagination metadata (`cursor`, `prevCursor`, `estimatedTotal`). Enforced by `scripts/validate-option-b.mjs`.
- **Tooling: NSwag-compatibility bundle removed** — the `bundle:nswag` script, `scripts/generate-nswag-spec.mjs`, and the generated `*-api-nswag.yaml` outputs were removed. Optional enums now use a direct `$ref`, so clients generate directly from the canonical `tradeitem-api.yaml` bundle.

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
