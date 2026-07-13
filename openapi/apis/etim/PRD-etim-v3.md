# PRD: ETIM API v3

## Problem Statement

The current ETIM API v2 has two key architectural problems:

1. **Deeply nested responses with embedded translations**: When fetching classes or modelling classes, every nested entity (features, values, units, groups, feature-groups) embeds a full `translations[]` array containing all languages the client is entitled to. This causes massive response payloads, makes incremental sync expensive, and couples unrelated data together.

2. **No flat bulk endpoints for entity types and relations**: Consumers who need the full ETIM dataset (for local caching, search indexes, or offline use) must paginate through classes one-by-one and parse deeply nested structures. There is no way to efficiently bulk-sync individual entity types (features, values, units) or the relation tables (class-features, class-feature-values) independently.

Additionally, the v2 API uses non-RESTful patterns (POST for reads, offset pagination, mixed content types) that don't align with the workspace's OpenAPI 3.1 standards (cursor pagination, RESTful GET, OAuth2 client credentials, response envelope pattern).

## Solution

Create a new ETIM API v3 that:

1. **Provides flat bulk endpoints** for each ETIM entity type (`classes`, `features`, `feature-groups`, `groups`, `modelling-classes`, `modelling-groups`, `units`, `values`) and for relation tables (`class-features`, `class-feature-values`).

2. **Provides dedicated translation endpoints** for each entity type, separate from the entity data itself. Translations are filtered by one or more language codes (comma-separated query param).

3. **Removes embedded translations from entity responses**: Entity endpoints return a single-language `description` field (based on the `language` query param) plus `descriptionEn` as a stable fallback, but NO `translations[]` array in nested or parent entities.

4. **Retains single-entity lookup, search, diff, RFC, and misc endpoints** using RESTful patterns (GET with path/query params, POST only for mutations).

5. **Follows the workspace API standards**: OpenAPI 3.1, cursor-based pagination, OAuth2 client credentials, response envelope (`data` + `meta`), `ProblemDetails` errors.

## User Stories

1. As an ETIM data consumer, I want to bulk-download all ETIM classes with cursor pagination, so that I can sync the full classification dataset efficiently.

2. As an ETIM data consumer, I want to bulk-download all ETIM features as flat records, so that I can build a local feature lookup table without parsing nested class structures.

3. As an ETIM data consumer, I want to bulk-download all ETIM feature-groups as flat records, so that I can categorize features locally.

4. As an ETIM data consumer, I want to bulk-download all ETIM groups as flat records, so that I can build group hierarchies locally.

5. As an ETIM data consumer, I want to bulk-download all ETIM modelling-classes as flat records, so that I can sync modelling data independently from product classes.

6. As an ETIM data consumer, I want to bulk-download all ETIM modelling-groups as flat records, so that I can categorize modelling classes locally.

7. As an ETIM data consumer, I want to bulk-download all ETIM units as flat records, so that I can resolve unit references locally.

8. As an ETIM data consumer, I want to bulk-download all ETIM values as flat records, so that I can resolve value references locally.

9. As an ETIM data consumer, I want to bulk-download the class-features relation table (classCode + classVersion + featureCode + orderNumber + unitCode + ...), so that I can reconstruct class-feature assignments without fetching full class details.

10. As an ETIM data consumer, I want to bulk-download the class-feature-values relation table (classCode + classVersion + featureCode + valueCode + orderNumber), so that I can know which values are valid for which class-feature combination.

11. As an ETIM data consumer, I want to bulk-download translations for classes filtered by language(s), so that I can sync only the languages I need without downloading the full entity payload.

12. As an ETIM data consumer, I want to bulk-download translations for features filtered by language(s), so that I only fetch translation data for my relevant markets.

13. As an ETIM data consumer, I want to bulk-download translations for feature-groups, groups, modelling-classes, modelling-groups, units, and values filtered by language(s), so that translation sync is independent per entity type.

14. As an ETIM data consumer, I want each flat entity to include `descriptionEn` (always present), a `description` in my requested language, `deprecated` flag (where applicable), `status`, `mutationDate`, and `revision`, so that I have enough metadata for local processing.

15. As an ETIM data consumer, I want to filter bulk endpoints by ETIM release (e.g. `ETIM-10.0`, `DYNAMIC`), so that I only sync entities relevant to a specific release.

16. As an ETIM data consumer, I want to look up a single class by code with optional version and language query params using a RESTful GET, so that ad-hoc lookups are simple and cacheable.

17. As an ETIM data consumer, I want to look up a single feature, group, unit, or value by code using a RESTful GET, so that I don't need POST bodies for simple reads.

18. As an ETIM data consumer, I want to search classes by text (description/synonym) using GET with query params, so that search is simple and consistent with REST conventions.

19. As an ETIM data consumer, I want to see the diff/changes for a class between versions, so that I can understand what changed in a new version.

20. As an ETIM contributor, I want to create an RFC (Request For Change) via POST, so that I can propose class modifications programmatically.

21. As an ETIM data consumer, I want to list available ETIM releases via a simple GET, so that I can discover valid release identifiers.

22. As an ETIM data consumer, I want to list available/allowed languages via a simple GET, so that I know which language codes I can use.

23. As an ETIM data consumer, I want modelling-class-features to include the `portcode` in the flat relation record, so that I can associate features with ports without separate port queries.

24. As an ETIM data consumer, I want the API to use OAuth2 client credentials with a `read:etim` scope, so that authentication is consistent with other 2BA APIs.

25. As an ETIM data consumer, I want responses to follow the envelope pattern (`data` + `meta` for bulk, `data` for single), so that I can use the same client parsing logic across all 2BA APIs.

26. As an ETIM data consumer, I want error responses to follow RFC 7807 ProblemDetails, so that error handling is consistent and machine-readable.

27. As an ETIM data consumer, I want the bulk translation endpoints to accept multiple comma-separated language codes (e.g. `language=nl-NL,de-DE`), so that I can fetch translations for multiple markets in one request.

## Implementation Decisions

### API Structure

- **Base path**: `/api/v3/etim/...`
- **OpenAPI version**: 3.1.0 (JSON Schema 2020-12)
- **Authentication**: OAuth 2.0 Client Credentials, scope `read:etim`, token URL `https://identity.2ba.nl/connect/token`
- **Pagination**: Cursor-based (reuse shared `CursorPaginationMetadata`)
- **Errors**: RFC 7807 ProblemDetails (reuse shared schemas)

### Endpoint Design

#### Bulk Entity Endpoints (Tag: `ETIM bulk`)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v3/etim/bulk/classes` | Flat classes (code, version, groupCode, status, descriptionEn, description, mutationDate, revision, deprecated, sectors) |
| `GET /api/v3/etim/bulk/features` | Flat features (code, type, descriptionEn, description, deprecated, status, mutationDate, revision) |
| `GET /api/v3/etim/bulk/feature-groups` | Flat feature-groups (code, descriptionEn, description) |
| `GET /api/v3/etim/bulk/groups` | Flat groups (code, descriptionEn, description) |
| `GET /api/v3/etim/bulk/modelling-classes` | Flat modelling-classes (code, version, groupCode, status, descriptionEn, description, mutationDate, revision) |
| `GET /api/v3/etim/bulk/modelling-groups` | Flat modelling-groups (code, descriptionEn, description) |
| `GET /api/v3/etim/bulk/units` | Flat units (code, descriptionEn, description, abbreviation, abbreviationEn, deprecated) |
| `GET /api/v3/etim/bulk/values` | Flat values (code, descriptionEn, description, deprecated) |
| `GET /api/v3/etim/bulk/class-features` | Flat relation (classCode, classVersion, featureCode, orderNumber, unitCode, unitImperialCode, featureGroupCode, type, deprecated, local) |
| `GET /api/v3/etim/bulk/class-feature-values` | Flat relation (classCode, classVersion, featureCode, valueCode, orderNumber) |

Common query params for bulk: `cursor`, `limit`, `language` (for description field), `release` (filter by ETIM release).

#### Bulk Translation Endpoints (Tag: `ETIM bulk`)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v3/etim/bulk/classes/translations` | Class translations (code, version, languageCode, description, synonyms) |
| `GET /api/v3/etim/bulk/features/translations` | Feature translations (code, languageCode, description) |
| `GET /api/v3/etim/bulk/feature-groups/translations` | Feature-group translations (code, languageCode, description) |
| `GET /api/v3/etim/bulk/groups/translations` | Group translations (code, languageCode, description) |
| `GET /api/v3/etim/bulk/modelling-classes/translations` | Modelling-class translations (code, version, languageCode, description, synonyms) |
| `GET /api/v3/etim/bulk/modelling-groups/translations` | Modelling-group translations (code, languageCode, description) |
| `GET /api/v3/etim/bulk/units/translations` | Unit translations (code, languageCode, description, abbreviation) |
| `GET /api/v3/etim/bulk/values/translations` | Value translations (code, languageCode, description) |

Common query params for translations: `cursor`, `limit`, `language` (comma-separated, required — filters which languages to return).

#### Single Entity Endpoints (Tag: `ETIM single`)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v3/etim/classes/{classCode}` | Single class details (query: `version`, `language`) |
| `GET /api/v3/etim/classes/{classCode}/diff` | Class version diff (query: `version`, `language`) |
| `GET /api/v3/etim/features/{featureCode}` | Single feature (query: `language`) |
| `GET /api/v3/etim/feature-groups/{featureGroupCode}` | Single feature-group (query: `language`) |
| `GET /api/v3/etim/groups/{groupCode}` | Single group (query: `language`) |
| `GET /api/v3/etim/modelling-classes/{classCode}` | Single modelling-class (query: `version`, `language`) |
| `GET /api/v3/etim/modelling-groups/{groupCode}` | Single modelling-group (query: `language`) |
| `GET /api/v3/etim/units/{unitCode}` | Single unit (query: `language`) |
| `GET /api/v3/etim/values/{valueCode}` | Single value (query: `language`) |

#### Search Endpoints (Tag: `ETIM single`)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v3/etim/classes/search` | Search classes (query: `q`, `language`, `release`, `group`, `cursor`, `limit`) |
| `GET /api/v3/etim/features/search` | Search features (query: `q`, `language`, `deprecated`, `local`, `cursor`, `limit`) |
| `GET /api/v3/etim/modelling-classes/search` | Search modelling-classes (query: `q`, `language`, `release`, `group`, `cursor`, `limit`) |

#### Misc & Mutation Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v3/etim/releases` | List all ETIM releases |
| `GET /api/v3/etim/languages` | List all available languages |
| `GET /api/v3/etim/languages/allowed` | List allowed languages for the client |
| `POST /api/v3/etim/rfcs` | Create a Request For Change |

### Schema Design Decisions

- **No embedded translations**: Entity responses do NOT include `translations[]` arrays in nested objects. Translations are fetched separately via dedicated endpoints.
- **Flat relation records**: `class-features` and `class-feature-values` are fully denormalized junction records with all foreign keys inline.
- **Modelling port inclusion**: Modelling class-feature relations include `portcode` in the flat record to indicate port association (null/0 = class-level feature).
- **Single-language description**: All entity endpoints accept a `language` query param and return a single `description` field in that language, plus `descriptionEn` as the invariant English label.
- **Modelling classes stay separate**: Separate endpoint paths for modelling-classes vs regular classes (different entity codes: MC vs EC, different groups: MG vs EG).
- **Response envelope**: All responses wrap content in `data` (with a named `$ref` schema), bulk adds `meta` with `CursorPaginationMetadata`.
- **Nullable fields**: Use OpenAPI 3.1 `type: ["string", "null"]` pattern.
- **ETIM code patterns**: Retain regex validation (`^EC[0-9]{6}$`, `^EF[0-9]{6}$`, `^EU[0-9]{6}$`, `^EV[0-9]{6}$`, `^EG[0-9]{6}$`, `^MC[0-9]{6}$`, `^MG[0-9]{6}$`).

### Directory Structure

```
openapi/apis/etim/
├── openapi.yaml                    # Main spec file
├── paths/
│   ├── bulk/
│   │   ├── classes.yaml
│   │   ├── classes-translations.yaml
│   │   ├── features.yaml
│   │   ├── features-translations.yaml
│   │   ├── feature-groups.yaml
│   │   ├── feature-groups-translations.yaml
│   │   ├── groups.yaml
│   │   ├── groups-translations.yaml
│   │   ├── modelling-classes.yaml
│   │   ├── modelling-classes-translations.yaml
│   │   ├── modelling-groups.yaml
│   │   ├── modelling-groups-translations.yaml
│   │   ├── units.yaml
│   │   ├── units-translations.yaml
│   │   ├── values.yaml
│   │   ├── values-translations.yaml
│   │   ├── class-features.yaml
│   │   └── class-feature-values.yaml
│   ├── classes.yaml
│   ├── classes-search.yaml
│   ├── classes-diff.yaml
│   ├── features.yaml
│   ├── features-search.yaml
│   ├── feature-groups.yaml
│   ├── groups.yaml
│   ├── modelling-classes.yaml
│   ├── modelling-classes-search.yaml
│   ├── modelling-groups.yaml
│   ├── units.yaml
│   ├── values.yaml
│   ├── releases.yaml
│   ├── languages.yaml
│   └── rfcs.yaml
├── schemas/
│   ├── domain/
│   │   ├── EtimClass.yaml
│   │   ├── EtimFeature.yaml
│   │   ├── EtimFeatureGroup.yaml
│   │   ├── EtimGroup.yaml
│   │   ├── EtimModellingClass.yaml
│   │   ├── EtimModellingGroup.yaml
│   │   ├── EtimUnit.yaml
│   │   ├── EtimValue.yaml
│   │   ├── EtimClassFeature.yaml
│   │   ├── EtimClassFeatureValue.yaml
│   │   ├── EtimTranslation.yaml
│   │   ├── EtimClassTranslation.yaml
│   │   ├── EtimUnitTranslation.yaml
│   │   ├── EtimRelease.yaml
│   │   └── EtimLanguage.yaml
│   └── responses/
│       ├── BulkClassesResponse.yaml
│       ├── BulkClassesTranslationsResponse.yaml
│       ├── BulkFeaturesResponse.yaml
│       ├── ... (one per bulk endpoint)
│       ├── ClassResponse.yaml
│       ├── ClassResponseData.yaml
│       ├── ... (one per single endpoint)
│       └── RfcResponse.yaml
├── generated/
│   └── etim-api.yaml              # Bundled output (git-tracked)
└── etim-api-v2.json                # Legacy reference (existing)
```

### Tags and Grouping

- Tags: `ETIM single`, `ETIM bulk`
- `x-tagGroups`: single group named `ETIM`

## Testing Decisions

- **No automated tests in this repository** — this is a specification-only repo. Validation is done via:
  - `npx @redocly/cli lint` — validates the OpenAPI spec against rules
  - `npx @redocly/cli bundle` — confirms the spec can be bundled without errors
  - Manual review of generated documentation via Redocly preview
- Good test coverage for implementations of this spec should test:
  - Pagination correctness (cursor stability, hasNext/hasPrev accuracy)
  - Language filtering on translation endpoints
  - Release filtering produces correct subsets
  - Response envelope structure compliance
  - Error response format (ProblemDetails)

## Out of Scope

- **Implementation details** (backend architecture, database schema, Elasticsearch queries) — this PRD covers only the API contract
- **Migration tooling** from v2 to v3 — consumers will need to update their integrations
- **Webhook/event-driven sync** — only pull-based bulk sync is in scope
- **Write operations** beyond RFC creation (no CRUD for entities)
- **Rate limiting design** — left to implementation
- **Versioning of individual entities** (version history queries beyond the existing diff endpoint)
- **Bulk modelling-class-features and modelling-class-feature-values as separate endpoints** — modelling features are included in the regular `class-features` endpoint via the `portcode` field discriminator (portcode present = modelling class feature)

## Further Notes

- The v2 API JSON (`etim-api-v2.json`) should remain in the repo as a reference but will not be modified.
- The v3 spec should be implemented as a proper multi-file OpenAPI 3.1 YAML structure following workspace conventions (like the Product and TradeItem APIs).
- The `IncludeModel` pattern from v2 (selecting which nested fields to return) is replaced by the flat endpoint design — consumers fetch exactly the data they need from the appropriate endpoint.
- Modelling class features with `portcode` field: when `portcode` is null or 0, the feature belongs to the class itself; when non-zero, it belongs to that specific port.
- The comma-separated `language` query param on translation endpoints allows fetching translations for multiple markets in a single pagination pass, reducing round-trips for multi-language deployments.
- RFC endpoint should accept the same payload structure as v2 (or a simplified version) — exact schema TBD during implementation.
