# Changelog — Product API

All notable changes to the Product API will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This API adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Response convention: sub-resource 404 removed** — Sub-resource endpoints (`/details`, `/descriptions`, `/etim-classifications`, `/lca-environmental`, `/attachments`) no longer return `404`. They always return `200` with an empty collection (`[]`) or `null` object. Only the root endpoint (`/products/{gln}/{num}`) returns `404`.
- **Response convention: root 404 uses shared response** — The root endpoint `404` now uses the shared `application/problem+json` response (was inline `application/json`).
- **Response convention: sub-resource arrays non-nullable** — Array properties in sub-resource response schemas (`ProductDescriptionsResponseData`, `ProductAttachmentsResponseData`, `ProductEtimClassificationsResponseData`) changed from `type: ["array", "null"]` to `type: array`. Empty = `[]`, never `null`.
- **Response convention: aggregate root arrays support partial inclusion** — Array properties in `ProductResponseData` use three-state semantics: `[...]` = has data, `[]` = included but empty, `null` = not included in this response. Schema uses `type: ["array", "null"]` (required + nullable).
- **Response convention: sub-resource singular objects nullable** — `details` in `ProductDetailsResponseData` and `lcaEnvironmental` in `ProductLcaEnvironmentalResponseData` are now required and nullable (`anyOf: [$ref, type: "null"]`). When the parent product does not exist, these endpoints return `200` with `null` instead of `404`. Aligns with array sub-resources (which return `[]`) and the "required but nullable" convention.
- **Optionality convention: optional fields are absent, not null (Option B)** — Optional ETIM scalar, date, number, boolean, enum, and object properties that were previously nullable (`type: ["x", "null"]` or `anyOf: [$ref, type: "null"]`) are now optional and **non-null**; unavailable values are omitted from the payload instead of sent as `null`. Applies across Product domain and summary schemas (e.g., `Product`, `ProductDetails`/`ProductDetailsSummary`, `ProductDescription`, `EtimClassification`, `EtimFeature`, `Legislation`, `LcaDeclaration`, `LcaEnvironmental`, `RelatedProduct`, `AttachmentDetails`, `ProductAttachment`, and the `AttachmentTypeSpecification` enum). Literal `null` values were removed from enum definitions and examples. This changes generated client contracts (nullable → optional) and is permitted during the v1 Preview phase.
- **Domain aggregate follows canonical ETIM** — `Product.yaml` now uses optional, non-null collections and objects (omitted when unavailable). The three-state `null`/`[]`/`[...]` field-selection semantics remain **only** in `ProductResponseData`.
- **Intentional `null` restricted to an allowlist** — JSON `null` is permitted only in `ProductResponseData` aggregate arrays (`descriptions`, `etimClassifications`, `attachments`), the required-nullable singular `data` properties (`ProductDetailsResponseData.details`, `ProductLcaEnvironmentalResponseData.lcaEnvironmental`), and pagination metadata (`cursor`, `prevCursor`, `estimatedTotal`). Enforced by `scripts/validate-option-b.mjs`.
- **Tooling: NSwag-compatibility bundle removed** — the `bundle:nswag` script, `scripts/generate-nswag-spec.mjs`, and the generated `*-api-nswag.yaml` outputs were removed. Optional enums now use a direct `$ref`, so clients generate directly from the canonical `product-api.yaml` bundle.

## [1.0.0-Preview2] - 2026-04-24

### Changed
- Renaming inconsistencies and consolidating

## [1.0.0-Preview1] - 2026-04-15

### Added
- Initial preview release of the Product API
- Single-item endpoints
- Bulk endpoints
- Cursor-based pagination for all bulk endpoints
- OAuth 2.0 security
- RFC 7807 Problem Details error responses
