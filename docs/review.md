# ETIM xChange V2.0 Schema vs OpenAPI Spec — Consistency Review

**Date**: 2026-04-01  
**Source schema**: `resources/etim-xchange/ETIM xChange_Schema_V2.0-2025-11-27.json`  
**APIs reviewed**: Product API, Trade Item API

---

## 1 — Product API

### TODO: ProductIdentification --> Unbranded product ? Marc?

### 🔴 Critical: `ProductCountrySpecificField.yaml` uses invented schema

The OpenAPI schema (`openapi/apis/product/schemas/domain/ProductCountrySpecificField.yaml`) uses fields (`countryCode`, `fieldName`, `fieldValue`) that **do not exist** in the ETIM xChange specification. The ETIM schema defines a rich, typed structure identical to the trade item variant:

| ETIM xChange Property | OpenAPI Property | Status |
|---|---|---|
| `CSProductCharacteristicCode` | ❌ Missing | **WRONG** |
| `CSProductCharacteristicName[]` (multilingual) | ❌ Missing | **WRONG** |
| `CSProductCharacteristicValueBoolean` | ❌ Missing | **WRONG** |
| `CSProductCharacteristicValueNumeric` | ❌ Missing | **WRONG** |
| `CSProductCharacteristicValueRangeLower` | ❌ Missing | **WRONG** |
| `CSProductCharacteristicValueRangeUpper` | ❌ Missing | **WRONG** |
| `CSProductCharacteristicValueString[]` (multilingual) | ❌ Missing | **WRONG** |
| `CSProductCharacteristicValueSet[]` (multilingual) | ❌ Missing | **WRONG** |
| `CSProductCharacteristicValueSelect` | ❌ Missing | **WRONG** |
| `CSProductCharacteristicMultivalueSelect[]` | ❌ Missing | **WRONG** |
| `CSProductCharacteristicValueUnitCode` | ❌ Missing | **WRONG** |
| `CSProductCharacteristicReferenceGtin[]` | ❌ Missing | **WRONG** |

> **Reference**: The trade item equivalent (`ItemCountrySpecificField.yaml`) has the correct structure and can serve as a template.
>
> **ETIM xChange path**: `Supplier[].Product[].ProductCountrySpecificFields[]`

---

### 🔴 Critical: `Legislation.yaml` is missing 21 properties

Only the first ~13 fields are implemented. Everything after `volumeHazardousSubstances` is absent.

#### SVHC / REACH

| ETIM xChange Property | Type | Status |
|---|---|---|
| `SvhcIdentification[]` → `CasNumber` | string (pattern `^[0-9]{2,7}-[0-9]{2}-[0-9]{1}$`) | ❌ Missing |
| `SvhcIdentification[]` → `EcNumber` | string (pattern `^[0-9]{3}-[0-9]{3}-[0-9]{1}$`) | ❌ Missing |

#### GHS/CLP Hazard Classification

| ETIM xChange Property | Type | Status |
|---|---|---|
| `LabelCode[]` | enum: GHS01–GHS09 | ❌ Missing |
| `SignalWord` | enum: D (Danger), W (Warning) | ❌ Missing |
| `HazardStatement[]` | string (4–6 chars) | ❌ Missing |
| `PrecautionaryStatement[]` | string (pattern `^P[0-9]{3}$`) | ❌ Missing |

#### Dangerous Goods Transport (ADR)

| ETIM xChange Property | Type | Status |
|---|---|---|
| `UnShippingName[]` (multilingual) | string (max 255) | ❌ Missing |
| `PackingGroup` | enum: I, II, III | ❌ Missing |
| `LimitedQuantities` | boolean | ❌ Missing |
| `ExceptedQuantities` | boolean | ❌ Missing |
| `AggregationState` | enum: L (liquid), S (solid), G (gas) | ❌ Missing |
| `SpecialProvisionId[]` | string (pattern `^SP[0-9]{2,3}$`) | ❌ Missing |
| `ClassificationCode` | string (max 5) | ❌ Missing |
| `HazardLabel[]` | string (max 3) | ❌ Missing |
| `EnvironmentalHazards` | boolean | ❌ Missing |
| `TunnelCode` | enum: A, B, B1000C, B/D, B/E, C, C5000D, C/D, C/E, D, D/E, E | ❌ Missing |

#### Battery / Lithium

| ETIM xChange Property | Type | Status |
|---|---|---|
| `LiIonTested` | boolean | ❌ Missing |
| `LithiumAmount` | decimal (pattern) | ❌ Missing |
| `BatteryEnergy` | decimal (pattern) | ❌ Missing |
| `Nos274` | boolean | ❌ Missing |
| `HazardTrigger[]` | string (max 100) | ❌ Missing |

#### Energy

| ETIM xChange Property | Type | Status |
|---|---|---|
| `EprelRegistrationNumber` | string (pattern `^[0-9]{1,19}$`) | ❌ Missing |

> **ETIM xChange path**: `Supplier[].Product[].Legislation`

---

### 🟡 Major: `ProductIdentification` missing fields

| ETIM xChange Property | Type | Status |
|---|---|---|
| `ManufacturerIdDuns` | string (pattern `^[0-9]{9}$`) | ❌ Missing |
| `ManufacturerShortname` | string (max 15) | ❌ Missing |
| `BrandDetails[]` → `BrandSeries[]` (multilingual) | string (max 50) | ❌ Missing |
| `BrandDetails[]` → `BrandSeriesVariation[]` (multilingual) | string (max 50) | ❌ Missing |

> **ETIM xChange path**: `Supplier[].Product[].ProductIdentification`

---

### 🟡 Major: `OtherClassifications` entirely missing from Product API

The ETIM xChange schema defines a complete non-ETIM classification structure. No corresponding schema exists in the Product API.

| ETIM xChange Property | Type | Required | Status |
|---|---|---|---|
| `ClassificationName` | string (max 35) | ✅ | ❌ Missing |
| `ClassificationVersion` | string (max 10) | | ❌ Missing |
| `ClassificationClassCode` | string (max 100) | ✅ | ❌ Missing |
| `ClassificationFeatures[]` → `ClassificationFeatureName` | string (max 100) | ✅ | ❌ Missing |
| `ClassificationFeatures[]` → `ClassificationFeatureValue1` | string (max 100) | ✅ | ❌ Missing |
| `ClassificationFeatures[]` → `ClassificationFeatureValue2` | string (max 100) | | ❌ Missing |
| `ClassificationFeatures[]` → `ClassificationFeatureUnit` | string (max 100) | | ❌ Missing |

> **ETIM xChange path**: `Supplier[].Product[].OtherClassifications[]`

---

### 🟡 Major: ETIM Modelling Ports missing from `EtimClassification.yaml`

The `EtimClassification.yaml` has a TODO comment for `EtimModellingClassCode` and `EtimModellingClassVersion`, but the entire `EtimModellingPorts[]` structure is not mentioned at all. This includes coordinate and matrix feature types not present in standard ETIM features.

| ETIM xChange Property | Type | Status |
|---|---|---|
| `EtimModellingClassCode` | string (pattern `^MC[0-9]{6}$`) | ⚠️ TODO only |
| `EtimModellingClassVersion` | integer (min 1) | ⚠️ TODO only |
| `EtimModellingPorts[]` → `EtimModellingPortcode` | integer (min 0) | ❌ Missing |
| `EtimModellingPorts[]` → `EtimModellingConnectionTypeCode` | string (pattern `^CT[0-9]{6}$`) | ❌ Missing |
| `EtimModellingPorts[]` → `EtimModellingConnectionTypeVersion` | integer (min 1) | ❌ Missing |
| `EtimModellingPorts[]` → `EtimModellingFeatures[]` → all standard feature fields | various | ❌ Missing |
| `EtimModellingPorts[]` → `EtimModellingFeatures[]` → `EtimValueCoordinateX` | decimal | ❌ Missing |
| `EtimModellingPorts[]` → `EtimModellingFeatures[]` → `EtimValueCoordinateY` | decimal | ❌ Missing |
| `EtimModellingPorts[]` → `EtimModellingFeatures[]` → `EtimValueCoordinateZ` | decimal | ❌ Missing |
| `EtimModellingPorts[]` → `EtimModellingFeatures[]` → `EtimValueMatrix[]` (source/result) | decimal pairs | ❌ Missing |

> **ETIM xChange path**: `Supplier[].Product[].EtimClassification[].EtimModellingPorts[]`

---

## 2 — Trade Item API

### TODO: LogisticDetails --> baseItem* --> eigenlijk Product eigenschappen in 2BA? 
### TODO: LogisticDetails --> hoe kan dit een lijst zijn?
### TODO: ItemAttachments --> Key: AttachmentType, AttachmentUri (Ook bij Product)
### TODO: ItemAttachmentsDescriptions --> Lijst op bovenstaande key?
### TODO: PackagingLogisticDetails --> Nieuw? Wat is hiervan de key? Is er al een partij die dit heeft? kan leveren?

### 🔴 Critical: `TradeItemEnclosed` is entirely missing

The ETIM xChange schema defines `TradeItemEnclosed[]` under `PackagingUnit` (schema lines 673–681) describing items enclosed within a packaging unit. No corresponding schema or property exists in the Trade Item API.

| ETIM xChange Property | Type | Required | Status |
|---|---|---|---|
| `SupplierItemNumber` | string (max 35) | ✅ | ❌ Missing |
| `ManufacturerItemNumber` | string (max 35) | | ❌ Missing |
| `ItemGtin[]` | GTIN array | | ❌ Missing |
| `EnclosedItemQuantity` | integer (min 1) | ✅ | ❌ Missing |

> **ETIM xChange path**: `Supplier[].Product[].TradeItem[].PackagingUnit[].TradeItemEnclosed[]`

---

### 🟡 Major: `PackagingUnit.yaml` missing multiple fields

#### From `PackagingIdentification`

| ETIM xChange Property | Type | Status |
|---|---|---|
| `PackagingBreak` | boolean | ❌ Missing |
| `NumberOfPackagingParts` | integer (min 1) | ❌ Missing |

#### From `PackagingLogisticDetails[]`

| ETIM xChange Property | Type | Status |
|---|---|---|
| `SupplierPackagingPartNumber` | string (max 35) | ❌ Missing |
| `ManufacturerPackagingPartNumber` | string (max 35) | ❌ Missing |
| `PackagingPartGtin[]` | GTIN array | ❌ Missing |
| `SerialNumberOnPackaging` | boolean | ❌ Missing |
| `StackingFactor` | integer (min 1) | ❌ Missing |
| `PackagingTippable` | boolean | ❌ Missing |

#### `PackagingMaterial[]` (entire hierarchy missing)

| ETIM xChange Property | Type | Status |
|---|---|---|
| `RecyclabilityPerformanceGrade` | enum: A, B, C, NO GRADE | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialType` | enum (8 values) | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialCategory` | enum (1–22) | ❌ Missing |
| `PackagingMaterials[]` → `CompositePackagingMaterial` | boolean | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialSpecification[]` (multilingual) | string (max 255) | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialWeight` | decimal | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialWeightUnit` | enum (weight units) | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialPercentageRecycled` | decimal (0–100) | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialColoured` | boolean | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialRecyclable` | boolean | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialCompostable` | boolean | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialBiodegradable` | boolean | ❌ Missing |
| `PackagingMaterials[]` → `PackagingMaterialReusable` | boolean | ❌ Missing |

> **ETIM xChange path**: `Supplier[].Product[].TradeItem[].PackagingUnit[]`

---

### 🟡 Major: `AllowanceSurchargeDescription` missing

The ETIM xChange schema includes a multilingual `AllowanceSurchargeDescription[]` field (max 35 chars) on each `AllowanceSurcharge`. The OpenAPI `AllowanceSurcharge.yaml` does not include this field.

| ETIM xChange Property | Type | Status |
|---|---|---|
| `AllowanceSurchargeDescription[]` (multilingual) | string (max 35) | ❌ Missing |

> **ETIM xChange path**: `Supplier[].Product[].TradeItem[].Pricing[].AllowanceSurcharge[].AllowanceSurchargeDescription[]`

---

## 3 — General

### 🟢 Header Push-through Status

The user noted that `ValidityDates`, `CurrencyCode`, and `LanguageCode` can be pushed through from the ETIM xChange header into API response objects.

| Header Property | Push-through Status | Implementation |
|---|---|---|
| `CatalogueValidityStart` | ✅ Used as default | Default for `productValidityDate`, `itemValidityDate`, `priceValidityDate`, `epdValidityStartDate` |
| `CatalogueValidityEnd` | ⚠️ Not explicitly used | Could serve as default for expiry/obsolescence dates |
| `CurrencyCode` | ✅ Present | In `TradeItemPricing.currencyCode` and `Pricing.currencyCode` |
| `Language` | ✅ Denormalized | Into `descriptionLanguage` fields across all description schemas |

---

### ✅ Correctly Implemented Schemas (no issues found)

#### Product API schemas

| Schema File | Fields Matched | Status |
|---|---|---|
| `Product.yaml` (identification + details) | All ProductIdentification + ProductDetails fields (minus items listed above) | ✅ |
| `ProductDetails.yaml` | All non-key product fields | ✅ |
| `ProductDescription.yaml` | All 9 description fields | ✅ |
| `ProductRelation.yaml` + `RelatedProduct.yaml` | relationType, relatedProducts[], all 3 related product fields | ✅ |
| `AttachmentDetails.yaml` | All 6 attachment detail fields | ✅ |
| `ProductAttachment.yaml` | attachmentType, attachmentTypeSpecification, attachmentOrder, attachmentDetails | ✅ |
| `EtimFeature.yaml` | All 7 value types + reasonNoValue | ✅ |
| `EtimClassification.yaml` | classCode, classVersion, releaseVersion, dynamicReleaseDate, features (modelling pending) | ✅ |
| `LcaEnvironmental.yaml` | All 15 fields | ✅ |
| `LcaDeclaration.yaml` | All 21 environmental indicator fields | ✅ |

#### Trade Item API schemas

| Schema File | Fields Matched | Status |
|---|---|---|
| `ItemIdentification.yaml` | All 11 identification fields | ✅ |
| `ItemDetails.yaml` | All 4 detail fields | ✅ |
| `ItemDescription.yaml` | 3 description fields + flattened discount/bonus group descriptions | ✅ |
| `ItemLogistics.yaml` | All 9 logistics fields | ✅ |
| `TradeItemOrdering.yaml` | All 9 ordering fields | ✅ |
| `TradeItemPricing.yaml` | All 12 pricing fields + pricingRef + allowanceSurcharges | ✅ |
| `AllowanceSurcharge.yaml` | 7 of 8 fields (missing description) | ✅ (minor gap) |
| `ItemRelation.yaml` | All 5 relation fields | ✅ |
| `ItemAttachment.yaml` | All attachment fields (flattened from nested structure) | ✅ |
| `ItemCountrySpecificField.yaml` | All 11 value types | ✅ |

---

### Summary

| Severity | Count | Items |
|---|---|---|
| 🔴 Critical | 3 | `ProductCountrySpecificField` wrong schema; `Legislation` missing 21 fields; `TradeItemEnclosed` absent |
| 🟡 Major | 5 | Missing `OtherClassifications`; `ManufacturerIdDuns`/`ManufacturerShortname`/`BrandDetails`; ETIM Modelling Ports; PackagingUnit fields; AllowanceSurchargeDescription |
| ⚠️ Minor | 1 | `CatalogueValidityEnd` not pushed through as default for expiry dates |
| ✅ OK | 20 | Schemas correctly implemented |
