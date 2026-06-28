# ETIM Bulk Exchange Model (EBEM) — Architecture Analysis

## Goal

Design a generic Bulk API for ETIM xChange that any party can implement:

- Manufacturers
- Datapools
- Wholesalers
- PIM systems
- ERP systems

This is not an API for a single implementation — it is a **standard**.

---

## Hard Requirements

### 1. Fully Lossless

Every ETIM xChange message must be perfectly reconstructible:

```
ETIM xChange → EBEM → ETIM xChange
```

No information may be lost. "Lossless" means **semantically equivalent** under JSON Schema validation — not byte-identical JSON output. Decisions on array ordering and absence-vs-null semantics must be documented explicitly.

### 2. No Internal Keys

The model must not contain:

- SQL identity columns
- Database GUIDs
- Internal surrogate keys

Every implementation has its own database. Keys must be derived from the business domain.

### 3. Implementation-Independent

The model must not depend on:

- Any specific RDBMS (SQL Server, Oracle, PostgreSQL)
- Any specific PIM system
- Any specific programming language

Every vendor must be able to offer the same API.

### 4. Bulk-Capable

Datasets contain millions of records. The model must be:

- Streamable
- Efficient
- Easy to import

CSV (optionally GZipped), Parquet, Arrow, and NDJSON are all viable serialization formats — the model must not be coupled to any single one.

---

## Core Insight

**ETIM xChange is not a relational model.** It is an exchange format with deep nesting, arrays, value objects, and translations. It is not directly suitable as a bulk model.

The fundamental question is NOT:

> "How do I convert ETIM xChange to CSV?"

The real question is:

> "How do I design a canonical relational representation model of ETIM xChange that is fully lossless?"

This is a fundamentally different design challenge.

---

## The Identity Problem

Almost all nested objects lack their own identity. Objects like `ProductDescription`, `AttachmentDescription`, `PackagingUnitName`, `BrandSeries`, and `EtimValueDetails` have no ID field.

**Root entities** have clear business keys:

| Entity    | Business Key                              |
|-----------|-------------------------------------------|
| Product   | Manufacturer + ManufacturerProductNumber   |
| TradeItem | Supplier + SupplierItemNumber              |

**Child objects** often lack natural keys, requiring contextual (composite) keys:

- `Product + AttachmentUri + Language`
- `Product + FeatureCode + Language`

These keys serve **reconstruction**, not universal identity.

**Keyless arrays** (e.g., `ItemLogisticDetails`, `BrandDetails`) have no natural discriminator. This creates a fundamental tension with the "no surrogate keys" requirement. The resolution: allow **positional indices** as reconstruction keys where no natural key exists, documented explicitly per dataset.

---

## Design Principles

### One Dataset = One Concept

> Every dataset represents exactly one logical ETIM concept and must independently contribute to ETIM xChange reconstruction.

Not "as few datasets as possible" — but "as clear as possible."

### Model First, API Second

We are not designing a REST API. We are designing a **data model standard**. If the model is sound:

- CSV exports follow naturally
- REST endpoints follow naturally
- Parquet/Arrow/NDJSON follow naturally

### The Catalogue Envelope Must Be Addressed

The ETIM xChange hierarchy is: **Catalogue → Supplier → Product → TradeItem**. A lossless round-trip must reconstruct the full envelope, including `SchemaVersion`, `CatalogueId`, `CatalogueType` (FULL/CHANGE), `CatalogueValidityStart`, `Language[]`, `Country[]`, `CurrencyCode`, etc.

A **manifest** concept should declare:
- Which datasets are included
- Catalogue metadata
- Schema version
- FULL vs CHANGE exchange type
- Row counts per dataset (for validation)

---

## Entity Classification

Every ETIM xChange element is classified into one of these categories:

### A. Root Entity

Clear business identity. Top-level aggregate roots.

Examples: `Catalogue`, `Supplier`, `Product`, `TradeItem`

### B. Child Entity (Natural Key)

Identified within the context of their parent by a natural business key.

Examples: `ProductAttachment` (by URI), `EtimClassification` (by ClassCode), `ProductRelation` (by RelatedProductNumber)

### C. Positional Child (No Natural Key)

Identified within parent context only by ordinal position. Arrays with no discriminator field.

Examples: `ItemLogisticDetails`, `BrandDetails`

### D. Singleton Component

1:1 relationship with parent. Can potentially be flattened into the parent dataset.

Examples: `Ordering`, `Legislation`, `ProductDimensions`

### E. Localized Value

Always coupled to a parent, identified by parent context + Language.

Examples: `ProductDescription`, `MarketingText`, `AttachmentDescription`

### F. Polymorphic Property (EAV-pattern)

Identified by a code/name, with type-dependent value columns. Many columns will be null for any given row.

Examples: `CountrySpecificFields`, `EtimFeatures` (code + one of: ValueCode, ValueNumeric, ValueRange, ValueLogical, ValueDetails[])

### G. Reference Data

External classification data, not owned by the exchange.

Examples: `ETIM Class`, `Unit`, `Language`, `Currency`

---

## Approach

### Step 1 — Information Inventory

Create a complete inventory at the semantic level (not JSON/XML structure level):

| ETIM Element         | Parent     | Cardinality | Translatable | Category | Business Key                |
|----------------------|------------|-------------|--------------|----------|-----------------------------|
| Catalogue            | —          | 1           | No           | A        | CatalogueId                 |
| Supplier             | Catalogue  | 1..n        | No           | A        | SupplierIdGln               |
| Product              | Supplier   | 0..n        | No           | A        | Manufacturer + ProductNumber|
| ProductDescription   | Product    | 0..n        | Yes          | E        | ProductKey + Language        |
| ProductAttachment    | Product    | 0..n        | No           | B        | ProductKey + AttachmentUri   |
| AttachmentDescription| Attachment | 0..n        | Yes          | E        | AttachmentKey + Language     |
| TradeItem            | Product    | 0..n        | No           | A        | Supplier + ItemNumber        |
| EtimFeature          | Product    | 0..n        | No           | F        | ProductKey + FeatureCode     |
| ItemLogisticDetails  | TradeItem  | 0..n        | No           | C        | TradeItemKey + Position      |

No API, no CSV. Inventory only.

### Step 2 — Classify Every Object

Place every ETIM element into one of the seven categories (A–G). This determines key strategy and dataset design.

### Step 3 — Define Reconstruction Rules

Not "What is the key?" but **"How do I rebuild the ETIM tree?"**

```
Product
 └── ProductDescription
```

is reconstructed from:

```sql
Product JOIN ProductDescription ON ProductKey
```

For each dataset, document:
1. **Primary reconstruction key** — minimal set of columns that uniquely identifies a row
2. **Key completeness** — are all key components always present?
3. **Fallback strategy** — what happens when optional key fields are null?

### Step 4 — Design Datasets

Only now determine the physical datasets:

```
Catalogue.csv
Supplier.csv
Product.csv
ProductDescription.csv
ProductFeature.csv
ProductAttachment.csv
AttachmentDescription.csv
TradeItem.csv
...
```

---

## Open Design Decisions

### Array Ordering

Several ETIM arrays have explicit ordering (`AttachmentOrder`, `AllowanceSurchargeSequenceNumber`). Others have no explicit order field. Decision needed: is implicit JSON array order semantically significant? If yes, a synthetic position column is required for arrays without an explicit sequence field.

### FULL vs CHANGE Synchronization

ETIM xChange supports `CatalogueType: "FULL"` (complete replacement) and `"CHANGE"` (delta). Decisions needed:
- Does the bulk model support delta operations (add/update/delete markers per row)?
- Or is every exchange always a full snapshot?
- How to express "remove this attachment" in CSV?

### Composite Key Width

Deeply nested objects (e.g., `Supplier → Product → TradeItem → PackagingUnit → PackagingLogisticDetails → PackagingMaterial`) produce reconstruction keys with 5–7 columns. This is technically correct but makes CSV unwieldy. Consider whether intermediate reference columns can reduce key width.

**Example — Flat composite key (naive approach):**

```csv
# PackagingMaterial.csv
supplierGln, supplierItemNumber, packagingTypeCode, packagingPosition, materialType, materialWeight, materialWeightUnit
8712345000001, ITEM-001, CT, 1, CARDBOARD, 0.450, KGM
8712345000001, ITEM-001, CT, 1, PLASTIC, 0.030, KGM
8712345000001, ITEM-001, PA, 2, WOOD, 1.200, KGM
```

Every row repeats 4 key columns (`supplierGln + supplierItemNumber + packagingTypeCode + packagingPosition`) just to identify which `PackagingUnit` the material belongs to. At deeper levels (e.g., localized material descriptions), this grows to 6–7 key columns.

**Alternative — Intermediate reference via parent dataset position:**

Each dataset only carries the key of its **direct parent**, not the full ancestor chain. The parent dataset in turn carries *its* parent key, forming a chain:

```csv
# TradeItem.csv (key: supplierGln + supplierItemNumber)
supplierGln, supplierItemNumber, ...
8712345000001, ITEM-001, ...

# PackagingUnit.csv (key: supplierGln + supplierItemNumber + position)
supplierGln, supplierItemNumber, position, packagingTypeCode, ...
8712345000001, ITEM-001, 1, CT, ...
8712345000001, ITEM-001, 2, PA, ...

# PackagingMaterial.csv (key: supplierGln + supplierItemNumber + packagingPosition + materialType)
supplierGln, supplierItemNumber, packagingPosition, materialType, materialWeight, materialWeightUnit
8712345000001, ITEM-001, 1, CARDBOARD, 0.450, KGM
8712345000001, ITEM-001, 1, PLASTIC, 0.030, KGM
8712345000001, ITEM-001, 2, WOOD, 1.200, KGM
```

The trade-off: each dataset carries only one level of parent context (typically 2–3 key columns), but reconstruction requires joining through intermediate datasets. This keeps CSV rows compact while preserving full lossless reconstruction through the chain.

---

## Deliverable

The first deliverable is not an API — it is:

**EBEM Specification v0.1**

A ~30–40 page document defining per ETIM xChange element:

- Semantic meaning
- Category (A–G)
- Cardinality
- Reconstruction key and rules
- Dataset assignment
- Mapping to ETIM xChange JSON paths
- Serialization format (CSV column definitions)
- Synchronization behavior

Alongside the spec, a **machine-readable metamodel** (YAML/JSON) listing every ETIM path with its classification, cardinality, key strategy, and parent reference. This becomes both the input to the spec AND a generatable conformance test.

### Machine-Readable Metamodel

The metamodel is a structured YAML file that formally encodes the Information Inventory in a format that scripts can consume to **generate** artifacts (CSV headers, validation rules, documentation, conformance tests). It is the single source of truth from which spec prose, CSV formats, validation tooling, and the reference implementation are all derived.

```yaml
# ebem-metamodel.yaml
version: "0.1"
schemaVersion: "ETIM xChange V2.0"

datasets:
  Catalogue:
    category: A  # Root Entity
    parent: null
    cardinality: "1"
    xchangePath: "$"
    reconstructionKey:
      - catalogueId
    columns:
      - name: catalogueId
        type: string
        required: true
        xchangeMapping: "$.CatalogueId"
      - name: catalogueType
        type: string
        required: true
        enum: [FULL, CHANGE]
        xchangeMapping: "$.CatalogueType"
      - name: schemaVersion
        type: string
        required: true
        xchangeMapping: "$.SchemaVersion"
      - name: catalogueValidityStart
        type: date
        required: false
        xchangeMapping: "$.CatalogueValidityStart"

  Product:
    category: A  # Root Entity
    parent: Supplier
    cardinality: "0..n"
    xchangePath: "$.Supplier[*].Products[*]"
    reconstructionKey:
      - manufacturerIdGln
      - manufacturerProductNumber
    columns:
      - name: manufacturerIdGln
        type: string
        required: true
        maxLength: 13
        xchangeMapping: "$.ManufacturerIdGln"
      - name: manufacturerProductNumber
        type: string
        required: true
        maxLength: 35
        xchangeMapping: "$.ManufacturerProductNumber"
      - name: etimClassCode
        type: string
        required: false
        xchangeMapping: "$.EtimClassification.EtimClassCode"

  ProductDescription:
    category: E  # Localized Value
    parent: Product
    cardinality: "0..n"
    translatable: true
    xchangePath: "$.Supplier[*].Products[*].ProductDescriptions[*]"
    reconstructionKey:
      - manufacturerIdGln
      - manufacturerProductNumber
      - language
    columns:
      - name: manufacturerIdGln
        type: string
        required: true
        foreignKey: Product.manufacturerIdGln
      - name: manufacturerProductNumber
        type: string
        required: true
        foreignKey: Product.manufacturerProductNumber
      - name: language
        type: string
        required: true
        format: iso-639-1
        xchangeMapping: "$.Language"
      - name: shortDescription
        type: string
        required: false
        maxLength: 80
        xchangeMapping: "$.ShortDescription"
      - name: longDescription
        type: string
        required: false
        xchangeMapping: "$.LongDescription"

  EtimFeature:
    category: F  # Polymorphic Property (EAV)
    parent: Product
    cardinality: "0..n"
    xchangePath: "$.Supplier[*].Products[*].EtimFeatures[*]"
    reconstructionKey:
      - manufacturerIdGln
      - manufacturerProductNumber
      - featureCode
    polymorphicValueColumns:
      - valueNumeric
      - valueLogical
      - valueCode
      - valueRangeMin
      - valueRangeMax
    columns:
      - name: manufacturerIdGln
        type: string
        required: true
        foreignKey: Product.manufacturerIdGln
      - name: manufacturerProductNumber
        type: string
        required: true
        foreignKey: Product.manufacturerProductNumber
      - name: featureCode
        type: string
        required: true
        xchangeMapping: "$.FeatureCode"
      - name: valueNumeric
        type: number
        required: false
        xchangeMapping: "$.ValueNumeric"
      - name: valueLogical
        type: boolean
        required: false
        xchangeMapping: "$.ValueLogical"
      - name: valueCode
        type: string
        required: false
        xchangeMapping: "$.EtimValueCode"

  ItemLogisticDetails:
    category: C  # Positional Child (no natural key)
    parent: TradeItem
    cardinality: "0..n"
    xchangePath: "$.Supplier[*].Products[*].TradeItems[*].ItemLogisticDetails[*]"
    reconstructionKey:
      - supplierIdGln
      - supplierItemNumber
      - position
    keyCompleteness: always-present
    fallbackStrategy: positional-index
    columns:
      - name: supplierIdGln
        type: string
        required: true
        foreignKey: TradeItem.supplierIdGln
      - name: supplierItemNumber
        type: string
        required: true
        foreignKey: TradeItem.supplierItemNumber
      - name: position
        type: integer
        required: true
        synthetic: true  # derived from array index, not in xChange
      - name: grossWeight
        type: number
        required: false
        xchangeMapping: "$.GrossWeight"
```

**What scripts generate from this metamodel:**

| Generated artifact | Derived from |
|---|---|
| CSV headers | `columns[*].name` in order |
| Validation rules | `required`, `maxLength`, `enum`, `type` per column |
| Foreign key checks | `foreignKey` references → referential integrity |
| Reconstruction logic | `parent` + `reconstructionKey` → JOIN chains |
| Conformance tests | Round-trip xChange JSON → CSVs → JSON via `xchangeMapping` |
| Documentation | `category`, `cardinality`, key strategy rendered as tables |

A **reference implementation** (a script that performs `ETIM_xChange.json → EBEM CSVs → ETIM_xChange.json` losslessly) serves as the ultimate conformance test and removes ambiguity from the spec.

---

## Summary

| Principle | Rationale |
|-----------|-----------|
| Model first, API second | Serialization formats follow from a sound model |
| Lossless round-trip | Testable acceptance criterion for every design decision |
| No surrogate keys | Implementation independence |
| One dataset = one concept | Clear, independent, composable datasets |
| Seven-category classification | Covers all ETIM patterns including EAV and keyless arrays |
| Manifest + envelope | Required for full message reconstruction |

The architecture discussion is complete. The next step is to produce the Information Inventory as a machine-readable artifact — the foundation for everything that follows.
