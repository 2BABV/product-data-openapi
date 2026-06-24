# Changelog — Trade Item API

All notable changes to the Trade Item API will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This API adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Bulk packaging identification endpoint: `GET /trade-items/bulk/packaging-identification`
  - Flat `PackagingIdentificationSummary` schema with all packaging identification fields
  - New fields: `packagingBreak`, `numberOfPackagingParts`
- Bulk packaging logistic details endpoint: `GET /trade-items/bulk/packaging-logistic-details`
  - Flat `PackagingLogisticDetailsSummary` schema with per-part logistic detail fields
  - Parent packaging context: `packagingTypeCode`, `supplierPackagingNumber`
  - New fields: `supplierPackagingPartNumber`, `manufacturerPackagingPartNumber`, `packagingPartGtins`, `serialNumberOnPackaging`, `stackingFactor`, `packagingTippable`
  - Uses ETIM-aligned field names (`packagingTypeLength`, etc.) for bulk summary

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
