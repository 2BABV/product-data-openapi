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
