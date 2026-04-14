# ETIM Classifications

**Version**: 2.0  
**Date**: December 10, 2025  
**Source**: ETIM xChange V2.0 Schema (2025-11-27)  
**Target**: OpenAPI 3.1 / JSON Schema 2020-12

## Table of Contents

- [Overview](#overview)
- [Structural Changes from File Format to API](#structural-changes-from-file-format-to-api)
  - [1. Removal of OtherClassifications](#1-removal-of-otherclassifications)
  - [2. Single Classification Structure](#2-single-classification-structure)
  - [3. ETIM Release Version Alignment](#3-etim-release-version-alignment)
  - [4. Release Version Filtering](#4-release-version-filtering)
- [API Model Structure](#api-model-structure)

---

## Overview

This document describes the transformation of the ETIM Classification structure from the ETIM xChange V2.0 file format to the Product Data OpenAPI format. The API model follows the ETIM xChange schema structure closely while being optimized for REST service delivery.

---

## Structural Changes from File Format to API

### 1. Removal of OtherClassifications

**ETIM xChange File Format**:
- Contains two separate classification structures:
  - `EtimClassification[]` - Array for ETIM standard classifications
  - `OtherClassifications[]` - Array for non-ETIM classification systems

**Product Data OpenAPI Format**:
- Contains only `etimClassifications[]` - Array for ETIM standard classifications
- `OtherClassifications` structure has been removed

**Rationale**: 
REST services inherently support extensibility through versioning and optional fields. The placeholder for `OtherClassifications` is no longer necessary in the API model. Organizations requiring non-ETIM classifications can implement custom extensions through separate endpoints or API versions.

---

### 2. Single Classification Structure

**Product Data OpenAPI Product Model**:
```yaml
Product:
  properties:
    etimClassifications:
      type: array
      items:
        $ref: '#/components/schemas/EtimClassification'
```

**Bulk Endpoint**:
- `/bulk/product-etim-classifications` - Dedicated bulk service for retrieving ETIM classifications

The API provides a focused, standardized approach with only ETIM classifications available inside the `Product` schema.

---

### 3. ETIM Release Version Alignment

The API model aligns with the ETIM xChange V2.0 schema structure for classification versioning.

#### ETIM xChange Schema Fields
```json
{
  "EtimClassification": [
    {
      "EtimReleaseVersion": "9.0",     // Required - Single string value
      "EtimClassCode": "EC002745",     // Required
      "EtimClassVersion": 1            // Optional
    }
  ]
}
```

**Composite Key**: `EtimReleaseVersion` + `EtimClassCode`

#### API Format Fields
```yaml
EtimClassification:
  required:
    - etimClassCode
    - etimReleaseVersion
  properties:
    etimClassCode:
      type: string
      pattern: "^EC[0-9]{6}$"
      
    etimReleaseVersion:
      type: string
      pattern: "^[0-9]{1,2}[.]{1}[0-9]{1}|DYNAMIC$"
      description: |
        ETIM release version where this classification is valid.
        Release number (e.g., "9.0", "10.0", "11.0") or "DYNAMIC" 
        for dynamic ETIM classes.
      
    etimClassVersion:
      type: ["integer", "null"]
      minimum: 1
      description: |
        Version number of the ETIM class. Optional field matching 
        ETIM xChange specification.
```

**Alignment Details**:
1. **`etimReleaseVersion`**: Single required string (matches ETIM xChange `EtimReleaseVersion`)
2. **`etimClassVersion`**: Optional nullable integer (matches ETIM xChange `EtimClassVersion`)
3. **Composite Key**: Uses `etimReleaseVersion` + `etimClassCode` as per ETIM xChange design

**Data Representation**:
If the same class version exists in releases 9.0, 10.0, and 11.0, the API represents this with separate classification entries (matching the ETIM xChange file format):

```json
{
  "etimClassifications": [
    {
      "etimClassCode": "EC002745",
      "etimClassVersion": 1,
      "etimReleaseVersion": "9.0"
    },
    {
      "etimClassCode": "EC002745",
      "etimClassVersion": 1,
      "etimReleaseVersion": "10.0"
    },
    {
      "etimClassCode": "EC002745",
      "etimClassVersion": 1,
      "etimReleaseVersion": "11.0"
    }
  ]
}
```

---

### 4. Release Version Filtering

Both the generic product service and the bulk ETIM classifications endpoint support filtering by ETIM release version:

#### Query Parameter
```yaml
name: etimReleaseVersion
in: query
schema:
  type: string
  pattern: "^[0-9]{1,2}[.]{1}[0-9]{1}|DYNAMIC$"
description: |
  Filter classifications by ETIM release version.
  Only return products/classifications valid for the specified release.
examples:
  - "9.0"
  - "10.0"
  - "11.0"
  - "DYNAMIC"
```

#### Endpoints Supporting Release Filtering
1. **`GET /products`** - Generic product service
   - Filter: Products with classifications valid for specified release
   
2. **`GET /bulk/product-etim-classifications`** - Bulk classifications service
   - Filter: Classifications valid for specified release
   - Use for ETIM classification synchronization

**Filter Behavior**:
- Returns only classifications where `etimReleaseVersion` matches the specified release
- Supports "DYNAMIC" for dynamic ETIM classes

---

## API Model Structure

The complete ETIM Classification model in the API includes:

```yaml
EtimClassification:
  type: object
  required:
    - etimClassCode
    - etimReleaseVersion
  properties:
    etimClassCode:
      type: string
      pattern: "^EC[0-9]{6}$"
      description: ETIM class code (EC + 6 digits)
      
    etimReleaseVersion:
      type: string
      pattern: "^[0-9]{1,2}[.]{1}[0-9]{1}|DYNAMIC$"
      description: ETIM release version (e.g., "9.0", "10.0", "DYNAMIC")
      
    etimClassVersion:
      type: ["integer", "null"]
      minimum: 1
      description: Version of the ETIM class (optional)
      
    etimDynamicReleaseDate:
      type: ["string", "null"]
      format: date
      description: Release date for dynamic ETIM classes
      
    etimFeatures:
      type: ["array", "null"]
      description: ETIM feature values characterizing the product
```

---

## Future Enhancements

### ETIM Modelling Classes (TODO)

The following fields from ETIM xChange V2.0 are **reserved for future implementation**:

| Field | Pattern | Description |
|-------|---------|-------------|
| `etimModellingClassCode` | `^MC[0-9]{6}$` | ETIM modelling class code for advanced product modeling |
| `etimModellingClassVersion` | integer ≥ 1 | Version number of the ETIM modelling class |

**ETIM xChange Path**: `Supplier[].Product[].EtimClassification[].EtimModellingClassCode` / `EtimModellingClassVersion`

These fields will be added to the API when modelling class support is implemented. The ETIM xChange V2.0 schema defines these fields, but they are not yet exposed through this API.

---

## Summary of Key Changes

| Aspect | ETIM xChange File Format | Product Data OpenAPI Format |
|--------|-------------------------|------------------------|
| **Classification Structures** | `EtimClassification[]` + `OtherClassifications[]` | `etimClassifications[]` only |
| **Release Version** | Single required string (`EtimReleaseVersion`) | Single required string (`etimReleaseVersion`) |
| **Class Version** | Optional integer | Optional nullable integer |
| **Composite Key** | `EtimReleaseVersion` + `EtimClassCode` | `etimReleaseVersion` + `etimClassCode` |
| **Release Filtering** | Not applicable | Supported via `etimReleaseVersion` query parameter |
| **Bulk Endpoint** | Not applicable | `/bulk/product-etim-classifications` |

The API format maintains alignment with ETIM xChange V2.0 schema structure while providing enhanced filtering capabilities and REST-optimized endpoints for efficient data retrieval.
