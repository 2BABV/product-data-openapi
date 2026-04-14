# Changelog — Trade Item API

All notable changes to the Trade Item API will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This API adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-Preview1] - 2026-04-09

### Added
- Initial preview release of the Trade Item API
- Single-item endpoints: `/trade-items/{gln}/{itemNumber}/details`, `/descriptions`, `/orderings`, `/pricings`, `/allowance-surcharges`, `/relations`, `/logistics-details`
- Bulk endpoints: `/trade-items/bulk/details`, `/bulk/descriptions`, `/bulk/orderings`, `/bulk/pricings`, `/bulk/allowance-surcharges`, `/bulk/relations`, `/bulk/logistics-details`
- Cursor-based pagination for all bulk endpoints
- OAuth 2.0 Client Credentials security scheme (`read:tradeitems` scope)
- RFC 7807 Problem Details error responses
- Implementer-agnostic server URL configuration (parameterized host + basePath)
- Multilanguage description support (`discountGroupDescription`, `bonusGroupDescription`)
- Item relations and logistics details schemas
