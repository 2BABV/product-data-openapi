# ETIM API

This directory contains the OpenAPI 3.1 specification for the ETIM classification and modelling
API. It exposes ETIM classification data (classes, features, groups, units, values) and ETIM
modelling data (modelling classes, modelling groups) through bulk (cursor-paginated, full/delta
sync) and single-resource endpoints, plus search and misc/mutation endpoints.

For the full functional scope, endpoint inventory, and rationale, see [`PRD-etim-v3.md`](PRD-etim-v3.md).

For the foreign-key field naming convention used across this API (and the schema mismatches it
corrected), see [`naming-conventions.md`](naming-conventions.md).

## Directory Structure

- `paths/` — path items, including `paths/bulk/` for bulk endpoints
- `parameters/` — reusable path/query parameters specific to this API (e.g. `release`, `language`)
- `schemas/domain/` — flat domain schemas (`EtimClass`, `EtimFeature`, `EtimGroup`, etc.)
- `schemas/responses/` — response envelope schemas (bulk `data`/`meta`, single-item `data`)
- `generated/` — bundled output (`etim-api.yaml`); regenerate with `npm run bundle:etim` after any
  source change

## Design Decisions

### `release` Filter Scoping

The `release` query parameter (`parameters/query/etim-release.yaml`) filters results by ETIM
release (e.g. `ETIM-10.0`, `ETIM-9.0`, or `DYNAMIC`). It is applied **only** to endpoints whose
response records are actually tied to a release-scoped entity or version — adding it elsewhere
would be a no-op that misleads API consumers into thinking release-dependent filtering happens
when it doesn't.

**Applies `release` filter** (response schema carries `releases` or a `version` that maps to
specific releases):

| Endpoint | Why |
|----------|-----|
| `classes`, `modelling-classes` | `EtimClass`/`EtimModellingClass` carry a `releases: string[]` array directly |
| `class-features`, `class-feature-values`, `modelling-class-features`, `modelling-class-feature-values` | Relations are scoped to a specific class `version`, and class versions map to releases |
| `classes/translations`, `classes/synonyms`, `modelling-classes/translations`, `modelling-classes/synonyms` | Records are keyed by `classCode` + `classVersion` (`EtimClassTranslation`/`EtimModellingClassTranslation`, `EtimClassSynonym`/`EtimModellingClassSynonym`); `classVersion` maps to the parent class's `releases` |

**Does NOT apply `release` filter** (response schema is global master data with no
`version`/`releases` field):

| Endpoint | Why |
|----------|-----|
| `features`, `feature-groups`, `groups`, `units`, `values`, `modelling-groups` | `EtimFeature`, `EtimFeatureGroup`, `EtimGroup`, `EtimUnit`, `EtimValue`, `EtimModellingGroup` have no release/version field — these are global, release-independent master data |
| `features/translations`, `feature-groups/translations`, `groups/translations`, `units/translations`, `values/translations`, `modelling-groups/translations` | Translation records (`EtimFeatureTranslation`, `EtimFeatureGroupTranslation`, `EtimGroupTranslation`, `EtimModellingGroupTranslation`, `EtimValueTranslation`, `EtimUnitTranslation`) are keyed only by their entity-specific code (e.g. `featureCode`, `unitCode`) + `languageCode` — no release/version field to filter on |

**Rule of thumb for new endpoints:** only add the `release` filter if the response schema actually
carries a field whose value varies per release (`releases` array, or a `version` that maps to
specific releases via the parent entity). Otherwise omit it.

This is a deliberate design decision, not an unresolved gap: entities/translations without a
release/version field are confirmed global master data. `release` is not redefined as an implicit
"entity referenced by a class in this release" membership join for these endpoints — such a join is
out of scope and not implemented.
