# ETIM xChange V2.0 API Review

Gap analysis of ETIM xChange V2.0 schema against Product and Trade Item APIs.

**See also**: [ETIM xChange → OpenAPI Field Mapping Registry](../resources/etim-xchange/etim-field-mapping-registry.md) — tracks every ETIM field's mapping status.

**Total findings: 60**

## Summary

| Decision | Priority | Count |
|----------|----------|-------|
| todo | high | 26 |
| todo | medium | 2 |
| todo | low | 5 |
| defer | - | 22 |
| skip | - | 5 |

---

## Todo (33 findings)

### Priority: HIGH

- **prod-005** [product] [ProductRelations] No endpoint for ProductRelations
  - *ETIM xChange defines ProductRelations[] with RelationType (15 enum values: ACCESSORY, CONSISTS_OF, CONSUMABLES, etc.) and RelatedProducts[] (with RelatedManufacturerProductNumber, RelatedProductGtin[]*
  - ETIM path: `Supplier[].Product[].ProductRelations[]`
  - Current: Schema files exist (ProductRelation.yaml, RelatedProduct.yaml, ProductRelationType.yaml) but are commented out in components and have no path definition
  - Reason: Enable existing schemas and add single + bulk endpoints

- **prod-006** [product] [Legislation] No endpoint for Legislation
  - *ETIM xChange defines a comprehensive Legislation object with 37 properties covering CE marking, RoHS, REACH, WEEE, hazardous materials transport (ADR/UN), GHS/CLP classification, battery regulations, *
  - ETIM path: `Supplier[].Product[].Legislation`
  - Current: Legislation.yaml exists with 17 of 37 properties implemented; commented out in openapi.yaml components; no endpoint defined
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-007** [product] [Legislation] SvhcIdentification array missing from Legislation schema
  - *ETIM xChange defines SvhcIdentification[] as an array of objects with CasNumber (pattern ^[0-9]{2,7}-[0-9]{2}-[0-9]{1}$) and EcNumber (pattern ^[0-9]{3}-[0-9]{3}-[0-9]{1}$) to identify Substances of V*
  - ETIM path: `Supplier[].Product[].Legislation.SvhcIdentification[]`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-008** [product] [Legislation] UnShippingName multilingual array missing
  - *ETIM xChange defines UnShippingName[] as a multilingual array of objects (Language + UnShippingName string, maxLength 255) for the UN proper shipping name of dangerous goods. Required for dangerous go*
  - ETIM path: `Supplier[].Product[].Legislation.UnShippingName[]`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-009** [product] [Legislation] PackingGroup missing from Legislation schema
  - *ETIM xChange defines PackingGroup as an enum with values 'I', 'II', 'III' representing the UN packing group for dangerous goods transport. Determines the degree of danger and packaging requirements.*
  - ETIM path: `Supplier[].Product[].Legislation.PackingGroup`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-010** [product] [Legislation] LimitedQuantities missing from Legislation schema
  - *ETIM xChange defines LimitedQuantities as a boolean indicating whether the product qualifies for limited quantities exemption under ADR dangerous goods transport regulations.*
  - ETIM path: `Supplier[].Product[].Legislation.LimitedQuantities`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-011** [product] [Legislation] ExceptedQuantities missing from Legislation schema
  - *ETIM xChange defines ExceptedQuantities as a boolean indicating whether the product qualifies for excepted quantities provisions under dangerous goods transport regulations.*
  - ETIM path: `Supplier[].Product[].Legislation.ExceptedQuantities`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-012** [product] [Legislation] AggregationState missing from Legislation schema
  - *ETIM xChange defines AggregationState as an enum ('L' for liquid, 'S' for solid, 'G' for gas) indicating the physical state of the hazardous substance.*
  - ETIM path: `Supplier[].Product[].Legislation.AggregationState`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-013** [product] [Legislation] SpecialProvisionId array missing from Legislation schema
  - *ETIM xChange defines SpecialProvisionId[] as an array of unique strings (pattern ^SP[0-9]{2,3}$) for ADR/RID special provision identifiers applicable to the dangerous good.*
  - ETIM path: `Supplier[].Product[].Legislation.SpecialProvisionId[]`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-014** [product] [Legislation] ClassificationCode missing from Legislation schema
  - *ETIM xChange defines ClassificationCode (string, maxLength 5) for the ADR/RID classification code of the dangerous good (e.g., 'F1', 'T1').*
  - ETIM path: `Supplier[].Product[].Legislation.ClassificationCode`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-015** [product] [Legislation] HazardLabel array missing from Legislation schema
  - *ETIM xChange defines HazardLabel[] as an array of unique strings (maxLength 3) for ADR hazard label codes (e.g., '3', '8', '6.1') that must appear on transport packaging.*
  - ETIM path: `Supplier[].Product[].Legislation.HazardLabel[]`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-016** [product] [Legislation] EnvironmentalHazards missing from Legislation schema
  - *ETIM xChange defines EnvironmentalHazards as a boolean indicating whether the product is classified as environmentally hazardous under ADR. Required for transport labeling.*
  - ETIM path: `Supplier[].Product[].Legislation.EnvironmentalHazards`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-017** [product] [Legislation] TunnelCode missing from Legislation schema
  - *ETIM xChange defines TunnelCode as an enum with 12 values ('A', 'B', 'B1000C', 'B/D', 'B/E', 'C', 'C5000D', 'C/D', 'C/E', 'D', 'D/E', 'E') for ADR tunnel restriction codes.*
  - ETIM path: `Supplier[].Product[].Legislation.TunnelCode`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-018** [product] [Legislation] LabelCode (GHS pictograms) array missing from Legislation schema
  - *ETIM xChange defines LabelCode[] as an array of unique GHS pictogram codes (enum: GHS01-GHS09) for CLP hazard classification labeling. Required for product safety labeling in the EU.*
  - ETIM path: `Supplier[].Product[].Legislation.LabelCode[]`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-019** [product] [Legislation] SignalWord missing from Legislation schema
  - *ETIM xChange defines SignalWord as an enum ('D' for Danger, 'W' for Warning) per CLP/GHS classification. Required on product safety labels.*
  - ETIM path: `Supplier[].Product[].Legislation.SignalWord`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-020** [product] [Legislation] HazardStatement array missing from Legislation schema
  - *ETIM xChange defines HazardStatement[] as an array of unique H-statement codes (minLength 4, maxLength 6, e.g., 'H220', 'H304') for CLP hazard statements. Essential for safety data communication.*
  - ETIM path: `Supplier[].Product[].Legislation.HazardStatement[]`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-021** [product] [Legislation] PrecautionaryStatement array missing from Legislation schema
  - *ETIM xChange defines PrecautionaryStatement[] as an array of unique P-statement codes (pattern ^P[0-9]{3}$, e.g., 'P210', 'P280') for CLP precautionary statements.*
  - ETIM path: `Supplier[].Product[].Legislation.PrecautionaryStatement[]`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-022** [product] [Legislation] LiIonTested missing from Legislation schema
  - *ETIM xChange defines LiIonTested as a boolean indicating whether lithium-ion batteries have passed UN 38.3 testing requirements. Required for products containing Li-ion batteries.*
  - ETIM path: `Supplier[].Product[].Legislation.LiIonTested`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-023** [product] [Legislation] LithiumAmount missing from Legislation schema
  - *ETIM xChange defines LithiumAmount as a decimal string (pattern ^[0-9]{1,12}[.]{0,1}[0-9]{0,4}$) representing the lithium content in grams. Required for battery transport regulations. Should be type n*
  - ETIM path: `Supplier[].Product[].Legislation.LithiumAmount`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-024** [product] [Legislation] BatteryEnergy missing from Legislation schema
  - *ETIM xChange defines BatteryEnergy as a decimal string (pattern ^[0-9]{1,12}[.]{0,1}[0-9]{0,4}$) representing battery energy in watt-hours. Required for lithium battery transport classification. Shoul*
  - ETIM path: `Supplier[].Product[].Legislation.BatteryEnergy`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-025** [product] [Legislation] Nos274 missing from Legislation schema
  - *ETIM xChange defines Nos274 as a boolean indicating whether the product falls under special provision 274 (Not Otherwise Specified) for dangerous goods classification.*
  - ETIM path: `Supplier[].Product[].Legislation.Nos274`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-026** [product] [Legislation] HazardTrigger array missing from Legislation schema
  - *ETIM xChange defines HazardTrigger[] as an array of unique strings (maxLength 100) describing what triggers the hazard classification (e.g., specific chemical components).*
  - ETIM path: `Supplier[].Product[].Legislation.HazardTrigger[]`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-027** [product] [Legislation] EprelRegistrationNumber missing from Legislation schema
  - *ETIM xChange defines EprelRegistrationNumber (pattern ^[0-9]{1,19}$) for the European Product Registry for Energy Labelling number. Required for energy-related products sold in the EU since March 2021*
  - ETIM path: `Supplier[].Product[].Legislation.EprelRegistrationNumber`
  - Current: Not present in Legislation.yaml
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **prod-040** [product] [ProductRelations] No bulk endpoint for ProductRelations
  - *Even if a single-product endpoint for relations were added, there is no bulk endpoint pattern defined for ProductRelations. For large-scale data synchronization, a /products/bulk/relations endpoint wo*
  - ETIM path: `Supplier[].Product[].ProductRelations[]`
  - Current: No bulk path definition exists; no BulkProductRelationsResponse schema exists
  - Reason: Enable existing schemas and add single + bulk endpoints

- **prod-041** [product] [Legislation] No bulk endpoint for Legislation
  - *There is no /products/bulk/legislation endpoint for bulk retrieval of regulatory compliance data. Given the volume of legislation properties and their importance for EU compliance, a bulk endpoint is *
  - ETIM path: `Supplier[].Product[].Legislation`
  - Current: No bulk path or response schema exists for legislation
  - Reason: Implement full Legislation endpoint with all ETIM xChange V2.0 fields

- **ti-001** [tradeitem] [FullTradeItem] Full trade item endpoint not wired into openapi.yaml
  - *The path definition for GET /trade-items/{supplierIdGln}/{supplierItemNumber} exists in paths/trade-items.yaml with a complete TradeItemResponse schema, but is not referenced from openapi.yaml paths s*
  - ETIM path: `Supplier[].Product[].TradeItem[]`
  - Current: Path file exists at paths/trade-items.yaml but not included in openapi.yaml paths
  - Reason: Wire up existing endpoint definition into openapi.yaml

### Priority: MEDIUM

- **prod-001** [product] [ProductIdentification] ManufacturerIdDuns missing
  - *ETIM xChange defines ManufacturerIdDuns (9-digit DUNS number, pattern ^[0-9]{9}$) as an alternative manufacturer identifier alongside GLN. The OpenAPI spec only uses ManufacturerIdGln as the manufactu*
  - ETIM path: `Supplier[].Product[].ProductIdentification.ManufacturerIdDuns`
  - Current: Not present in Product.yaml, ProductDetails.yaml, or ProductDetailsSummary.yaml
  - Reason: Add DUNS as alternative identifier and BrandDetails for brand series/variations

- **prod-004** [product] [ProductIdentification] BrandDetails array missing
  - *ETIM xChange defines BrandDetails[] with nested BrandSeries[] (multilingual, maxLength 50) and BrandSeriesVariation[] (multilingual, maxLength 50). These allow specifying product line/series within a *
  - ETIM path: `Supplier[].Product[].ProductIdentification.BrandDetails[]`
  - Current: Only brandName exists; no BrandSeries or BrandSeriesVariation
  - Reason: Add DUNS as alternative identifier and BrandDetails for brand series/variations

### Priority: LOW

- **prod-028** [product] [EtimClassification] EtimModellingClassCode missing
  - *ETIM xChange defines EtimModellingClassCode (pattern ^MC[0-9]{6}$) for ETIM Modelling Class code. Noted as TODO in EtimClassification.yaml but not implemented. ETIM Modelling is used for BIM/digital t*
  - ETIM path: `Supplier[].Product[].EtimClassification[].EtimModellingClassCode`
  - Current: Commented as TODO in EtimClassification.yaml; not present as a property
  - Reason: Future enhancement - BIM modelling support

- **prod-029** [product] [EtimClassification] EtimModellingClassVersion missing
  - *ETIM xChange defines EtimModellingClassVersion (integer, minimum 1) for the version of the ETIM Modelling Class. Noted as TODO in EtimClassification.yaml but not implemented.*
  - ETIM path: `Supplier[].Product[].EtimClassification[].EtimModellingClassVersion`
  - Current: Commented as TODO in EtimClassification.yaml; not present as a property
  - Reason: Future enhancement - BIM modelling support

- **prod-030** [product] [EtimClassification] EtimModellingPorts array entirely missing
  - *ETIM xChange defines EtimModellingPorts[] as an array of port definitions for ETIM Modelling with: EtimModellingPortcode (integer), EtimModellingConnectionTypeCode (pattern ^CT[0-9]{6}$), EtimModellin*
  - ETIM path: `Supplier[].Product[].EtimClassification[].EtimModellingPorts[]`
  - Current: No model or property exists for modelling ports
  - Reason: Future enhancement - BIM modelling support

- **prod-031** [product] [EtimClassification] EtimModellingFeatures missing coordinate and matrix value types
  - *ETIM xChange EtimModellingFeatures[] (within EtimModellingPorts) includes additional value types not present in regular EtimFeatures: EtimValueCoordinateX, EtimValueCoordinateY, EtimValueCoordinateZ (*
  - ETIM path: `Supplier[].Product[].EtimClassification[].EtimModellingPorts[].EtimModellingFeatures[]`
  - Current: No model exists for modelling features with coordinate/matrix values
  - Reason: Future enhancement - BIM modelling support

- **ti-003** [tradeitem] [Pricing] Pricing array is required in ETIM but nullable in API
  - *ETIM xChange TradeItem has Pricing in its required array, meaning every trade item must have at least one pricing entry. The API models pricings as type ['array', 'null'] (nullable) in TradeItem.yaml *
  - ETIM path: `Supplier[].Product[].TradeItem[].Pricing[]`
  - Current: pricings is nullable (type: ['array', 'null']) in TradeItem.yaml and TradeItemResponseData.yaml
  - Reason: Align with ETIM: make Pricing required, but needs review whether empty array is allowed vs at least one entry

## Deferred (22 findings)

- **prod-034** [product] [ProductCountrySpecificFields] Country-specific fields model does not match ETIM xChange structure
  - *ETIM xChange defines ProductCountrySpecificFields[] with a complex typed-value model: CSProductCharacteristicCode (required), CSProductCharacteristicName[] (multilingual), and multiple typed value pro*
  - Reason: Needs design discussion - complex typed-value model vs simplified key-value

- **prod-035** [product] [ProductCountrySpecificFields] No endpoint for ProductCountrySpecificFields
  - *ETIM xChange defines ProductCountrySpecificFields[] for country-specific product characteristics. While a simplified ProductCountrySpecificField.yaml domain schema exists, it is commented out in opena*
  - Reason: Needs design discussion - complex typed-value model vs simplified key-value

- **prod-036** [product] [ProductCountrySpecificExtensions] ProductCountrySpecificExtensions section missing
  - *ETIM xChange defines ProductCountrySpecificExtensions[] as a schema-less array for country-specific extensions that don't fit the structured fields. No model or endpoint exists in the API. This is a s*
  - Reason: Needs design discussion - complex typed-value model vs simplified key-value

- **prod-037** [product] [ProductAttachments] Bulk ProductAttachmentSummary missing attachmentLanguage
  - *The bulk endpoint's flattened ProductAttachmentSummary.yaml omits the attachmentLanguage[] field that is present in the single-product AttachmentDetails.yaml. Consumers of the bulk endpoint cannot det*
  - Reason: Review later whether bulk summary needs these fields

- **prod-038** [product] [ProductAttachments] Bulk ProductAttachmentSummary missing attachmentDescription
  - *The bulk endpoint's flattened ProductAttachmentSummary.yaml omits the attachmentDescription[] multilingual array that is present in the single-product AttachmentDetails.yaml. Bulk consumers cannot acc*
  - Reason: Review later whether bulk summary needs these fields

- **ti-002** [tradeitem] [Pricing.AllowanceSurcharge] AllowanceSurchargeDescription[] missing from AllowanceSurcharge schema
  - *ETIM xChange defines AllowanceSurchargeDescription as a multilingual array (Language + description text, maxLength 35) on each AllowanceSurcharge entry. The OpenAPI AllowanceSurcharge.yaml domain sche*
  - Reason: Review later whether surcharge descriptions are needed

- **ti-004** [tradeitem] [PackagingUnit.PackagingIdentification] PackagingBreak missing from PackagingUnit schema
  - *ETIM xChange defines PackagingBreak as a boolean in PackagingIdentification indicating whether the packaging unit can be broken open to sell individual items. This field is completely absent from the *
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-005** [tradeitem] [PackagingUnit.PackagingIdentification] NumberOfPackagingParts missing from PackagingUnit schema
  - *ETIM xChange defines NumberOfPackagingParts as an integer (minimum 1) in PackagingIdentification, indicating how many separate physical parts make up this packaging unit. This field is completely abse*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-006** [tradeitem] [PackagingUnit.PackagingLogisticDetails] PackagingLogisticDetails array flattened to single-level fields, losing multi-part support
  - *ETIM xChange models PackagingLogisticDetails as an array of objects (one per packaging part), allowing multi-part packaging where each part has its own dimensions, weight, GTIN, and supplier/manufactu*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-007** [tradeitem] [PackagingUnit.PackagingLogisticDetails] SupplierPackagingPartNumber missing from packaging logistics
  - *ETIM xChange defines SupplierPackagingPartNumber (string, maxLength 35) within PackagingLogisticDetails to identify each part of a multi-part packaging unit. This field is absent from the API's Packag*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-008** [tradeitem] [PackagingUnit.PackagingLogisticDetails] ManufacturerPackagingPartNumber missing from packaging logistics
  - *ETIM xChange defines ManufacturerPackagingPartNumber (string, maxLength 35) within PackagingLogisticDetails to identify each part by manufacturer's number. This field is absent from the API's Packagin*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-009** [tradeitem] [PackagingUnit.PackagingLogisticDetails] PackagingPartGtin[] missing from packaging logistics
  - *ETIM xChange defines PackagingPartGtin as a unique array of GTIN strings within PackagingLogisticDetails, allowing GTIN identification of individual packaging parts. This field is absent from the API'*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-010** [tradeitem] [PackagingUnit.PackagingLogisticDetails] SerialNumberOnPackaging missing from packaging logistics
  - *ETIM xChange defines SerialNumberOnPackaging as a boolean in PackagingLogisticDetails indicating whether the packaging carries a serial number. This field is absent from the API's PackagingUnit.yaml s*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-011** [tradeitem] [PackagingUnit.PackagingLogisticDetails] StackingFactor missing from packaging logistics
  - *ETIM xChange defines StackingFactor as an integer (minimum 1) in PackagingLogisticDetails indicating how many packaging units can be stacked on top of each other. This field is absent from the API's P*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-012** [tradeitem] [PackagingUnit.PackagingLogisticDetails] PackagingTippable missing from packaging logistics
  - *ETIM xChange defines PackagingTippable as a boolean in PackagingLogisticDetails indicating whether the packaging can be tilted/tipped during transport. This field is absent from the API's PackagingUni*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-013** [tradeitem] [PackagingUnit.PackagingLogisticDetails] PackagingMaterial[] complex structure entirely missing
  - *ETIM xChange defines a complex PackagingMaterial structure within PackagingLogisticDetails containing: RecyclabilityPerformanceGrade (enum A/B/C/NO GRADE), and a nested PackagingMaterials array with P*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-014** [tradeitem] [PackagingUnit.PackagingLogisticDetails] Packaging logistics property names and ETIM references use non-standard naming
  - *The PackagingUnit.yaml uses property names grossLength, grossWidth, grossHeight, grossDiameter, grossDimensionUnit, grossWeight, grossWeightUnit with ETIM xChange references citing 'GrossLength', 'Gro*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-015** [tradeitem] [ItemCountrySpecificFields] No dedicated single endpoint for ItemCountrySpecificFields
  - *ETIM xChange defines ItemCountrySpecificFields as an array of country-specific characteristics at the TradeItem level. While the ItemCountrySpecificField.yaml domain schema exists and is included in t*
  - Reason: Same design discussion as product-level country-specific fields

- **ti-016** [tradeitem] [ItemCountrySpecificFields] No dedicated bulk endpoint for ItemCountrySpecificFields
  - *There is no bulk endpoint for country-specific fields (e.g., /trade-items/bulk/country-specific-fields) following the pattern of other bulk endpoints like /trade-items/bulk/details, /trade-items/bulk/*
  - Reason: Same design discussion as product-level country-specific fields

- **ti-017** [tradeitem] [ItemCountrySpecificExtensions] ItemCountrySpecificExtensions completely absent from API
  - *ETIM xChange defines ItemCountrySpecificExtensions as a schema-less array (type: array, items: {}) at the TradeItem level, allowing arbitrary country-specific extension data. This section is completel*
  - Reason: Same design discussion as product-level country-specific fields

- **ti-018** [tradeitem] [PackagingUnit] No dedicated single endpoint for PackagingUnit
  - *ETIM xChange defines PackagingUnit as a complex array containing PackagingIdentification, PackagingLogisticDetails, and TradeItemEnclosed. While the PackagingUnit.yaml domain schema exists and the /en*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

- **ti-019** [tradeitem] [PackagingUnit] No dedicated bulk endpoint for PackagingUnit
  - *There is no bulk endpoint for packaging units (e.g., /trade-items/bulk/packaging-units) following the pattern of other bulk endpoints. While /trade-items/bulk/enclosed-items covers enclosed items, the*
  - Reason: Needs design discussion - array vs flat model, multi-part packaging, material composition

## Skipped (5 findings)

- **prod-002** [product] [ProductIdentification] ManufacturerName missing
  - *ETIM xChange requires ManufacturerName (string, maxLength 80) as a required field in ProductIdentification. The OpenAPI spec omits this entirely. While the API uses GLN as primary key, human-readable *
  - Reason: GLN is used as identifier; manufacturer name is resolved client-side

- **prod-003** [product] [ProductIdentification] ManufacturerShortname missing
  - *ETIM xChange defines ManufacturerShortname (string, maxLength 15) as a short form of the manufacturer name for space-constrained displays. Not present in the OpenAPI spec.*
  - Reason: ManufacturerShortname not needed; full name resolved client-side via GLN

- **prod-032** [product] [OtherClassifications] Entire OtherClassifications section missing
  - *ETIM xChange defines OtherClassifications[] as an array of non-ETIM classification systems with ClassificationName (required, maxLength 35), ClassificationVersion (maxLength 10), ClassificationClassCo*
  - Reason: API only serves ETIM classifications; other classification systems are out of scope

- **prod-033** [product] [OtherClassifications] No endpoint for OtherClassifications
  - *There is no single or bulk endpoint for retrieving other (non-ETIM) classification data. Products classified in UNSPSC, eCl@ss, or proprietary systems cannot be queried through the Product API.*
  - Reason: API only serves ETIM classifications; other classification systems are out of scope

- **prod-039** [product] [LcaEnvironmental] epdValidityStartDate made required vs ETIM optional
  - *In the OpenAPI LcaEnvironmental.yaml, epdValidityStartDate is listed as required and non-nullable (type: string). In the ETIM xChange schema, EpdValidityStartDate is optional (not in the required arra*
  - Reason: Intentional: epdValidityStartDate is required because it is derived from the header validityStartDate of the ETIM xChange file

---

*Generated from ETIM xChange V2.0 schema review session*
