# Changelog — Product API

All notable changes to the Product API will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This API adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-Preview1] - 2026-04-09

### Added
- Initial preview release of the Product API
- Single-item endpoints: `/products/{gln}/{productNumber}/details`, `/descriptions`, `/etim-classifications`, `/lca-environmental`
- Bulk endpoints: `/products/bulk/details`, `/bulk/descriptions`, `/bulk/etim-classifications`, `/bulk/lca-environmental`
- Cursor-based pagination for all bulk endpoints
- OAuth 2.0 Client Credentials security scheme (`read:products` scope)
- RFC 7807 Problem Details error responses
- LCA environmental declaration support (EPD metadata fields)
- ETIM classification and feature support
- Implementer-agnostic server URL configuration (parameterized host + basePath)
