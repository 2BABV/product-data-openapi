# Products API Domain Model

## Overview

The Products API manages manufacturer product specifications with ETIM classification data based on ETIM xChange V2.0. Products represent the manufacturer's perspective of items with comprehensive technical specifications, standardized classifications, legislation compliance, and lifecycle assessment data.

This API provides both individual product operations and bulk data retrieval with cursor-based pagination for high-volume synchronization scenarios.



## Products Design decisions

### Key Identification Fields

Products are uniquely identified by the composite key:
- `manufacturerIdGln` (GLN - 13 digits) + `manufacturerProductNumber` (max 35 chars)

[Decision details](docs/product-key.md)

### Manufacturer identity

The ETIM xChange `ProductIdentification` object includes `ManufacturerIdDuns`, `ManufacturerName`, and `ManufacturerShortname` alongside each product. This API intentionally **excludes** these fields from the Product domain. Manufacturer identity data (name, shortname, DUNS) belongs in a separate **Manufacturer service** and should not be duplicated per product.

Only `manufacturerIdGln` is retained as a foreign key reference to the Manufacturer. Consumers needing manufacturer details should resolve `manufacturerIdGln` against the Manufacturer service.

### Product details

Product details (`ProductDetails`) combines identification and operational information into a single schema:
- **Identification**: GTINs, brand, lifecycle dates, customs data
- **Operational**: status, type, warranties, product groups

This merged approach simplifies the API surface compared to the ETIM xChange source structure which separates `ProductIdentification` and `ProductDetails`.

Product descriptions (multilingual texts, marketing content, keywords) are intentionally excluded from the product details endpoint. Instead, descriptions are available through a dedicated `/bulk/product-descriptions` endpoint with:
- Flattened structure (one row per language per product)
- Language filtering support
- Optimized payload sizes for ETL/data warehouse ingestion

### ETIM classifications

An ETIM product classification is uniquely identified by the composite key:
- `etimClassCode` + `etimReleaseVersion` 

**Design decisions:**
- **OtherClassifications excluded**: Non-ETIM classification systems (UNSPSC, eCl@ss, etc.) are intentionally not supported. This API focuses on ETIM-based product data interchange.
- **Modelling classes**: TODO - see below

[Decision details](docs/etim-classifications.md)



## Products TODO

### High Priority

**Missing Endpoints** (schemas exist, endpoints not implemented)
- `/{manufacturerIdGln}/{manufacturerProductNumber}/relations` - ProductRelations (accessory, sparepart, etc.)
- `/{manufacturerIdGln}/{manufacturerProductNumber}/attachments` - ProductAttachments (images, datasheets, etc.)
- `/{manufacturerIdGln}/{manufacturerProductNumber}/legislation` - Legislation compliance data
- `/bulk/product-relations` - Bulk relations export
- `/bulk/product-attachments` - Bulk attachments export
- `/bulk/product-legislation` - Bulk legislation export

**BrandDetails** (ProductIdentification)
- Missing nested structure with `BrandSeries` and `BrandSeriesVariation` (both multilingual arrays)
- Check how to handle this complex multilingual structure

**Legislation - Hazardous Materials & Compliance** (44% coverage, missing 20 fields)
- SVHC identification: `SvhcIdentification[]` with `CasNumber`, `EcNumber`
- GHS labeling: `LabelCode[]` (GHS01-GHS09), `SignalWord` (D/W), `HazardStatement[]`, `PrecautionaryStatement[]`
- ADR transport: `PackingGroup`, `LimitedQuantities`, `ExceptedQuantities`, `AggregationState`, `SpecialProvisionId[]`, `ClassificationCode`, `HazardLabel[]`, `TunnelCode`, `EnvironmentalHazards`, `UnShippingName[]` (multilingual)
- Battery data: `LiIonTested`, `LithiumAmount`, `BatteryEnergy`, `Nos274`
- Other: `HazardTrigger[]`, `EprelRegistrationNumber` (EU Energy Label)

### Medium Priority

**functionalUnitDescription in bulk LCA**
- `ProductLcaDeclarationSummary` excludes `functionalUnitDescription` (multilingual array) because it breaks the flat/tabular pattern optimized for ETL/data warehouse ingestion
- Consumers needing functional unit descriptions should use the single-product `/{manufacturerIdGln}/{manufacturerProductNumber}/lca-environmental` endpoint
- Consider: dedicated bulk endpoint for functional unit descriptions if demand arises

**ETIM Modelling Classes** (EtimClassification)
- `EtimModellingClassCode` (pattern: `^MC[0-9]{6}$`)
- `EtimModellingClassVersion`
- `EtimModellingPorts[]` with port definitions for BIM/CAD integration

**ProductCountrySpecificFields Enhancement**
- Current implementation uses simplified `fieldName`/`fieldValue` strings
- xChange supports typed values: boolean, numeric, range (lower/upper), multilingual strings, single/multi select
- Missing: `CSProductCharacteristicValueUnitCode`, `CSProductCharacteristicReferenceGtin[]`
- Decision needed: keep simplified model or implement full type support?

### Not Planned

**OtherClassifications** - Intentionally excluded (ETIM-focused API)
**ProductCountrySpecificExtensions** - Open-ended extension point, not in scope