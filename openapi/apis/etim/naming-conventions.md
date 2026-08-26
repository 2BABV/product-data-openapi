# ETIM API — foreign-key field naming convention

## Best practice

Fields that reference a parent entity (foreign-key-style fields) **must be named after the
specific parent field they reference** — e.g. `classCode`, `featureCode`, `featureGroupCode`,
`groupCode`, `unitCode`, `valueCode` — never a generic name like `code`.

This applies even when it means a small schema is duplicated per parent entity type, rather than
reused across unrelated types via a generic field name. Self-documentation takes priority over
DRY reuse for a public API contract: a consumer must be able to tell what a field references from
its name alone, without cross-referencing prose descriptions or other schemas.

```yaml
# ✅ CORRECT — field name identifies the referenced entity
classCode:
  type: string
  pattern: "^EC[0-9]{6}$"

# ❌ INCORRECT — generic name hides which entity this references
code:
  type: string
  description: "Class code (EC, MC, or CT prefix)."
```

## FK fields identify a relationship *role*, not a globally unique name

A specific FK field name only needs to be unambiguous **within its own schema**. The same field
name may legitimately be reused across different, unrelated schemas to describe an analogous
relationship to a *different* parent type — this is not a violation of the convention.

For example, `groupCode` means "code of the `EtimGroup` this belongs to" in `EtimClass.yaml` and
`EtimGroupTranslation.yaml`, but "code of the `EtimModellingGroup` this belongs to" in
`EtimModellingClass.yaml` and `EtimModellingGroupTranslation.yaml`. Each schema is unambiguous on
its own (backed by a distinct `pattern`, e.g. `^EG[0-9]{6}$` vs `^MG[0-9]{6}$`), so this reuse is
fine and expected — it mirrors how the same English word can name analogous relationships in
different contexts.

What the convention forbids is a **single shared schema** whose one field can reference *several
different, unrelated entity types depending on which endpoint returns it* (see below) — that is
what actually hides information from the consumer.

## Handling fields that reference more than one entity type

Some relationships are genuinely polymorphic (e.g. ETIM class codes can be `EC` for a regular
class, or `MC`/`CT` for a modelling class/connection type). Prefer, in order:

1. **Split into a dedicated schema per parent type** (preferred in this API). Each schema keeps
   its own specific field name and the parent-type-specific validation `pattern`. This mirrors
   the existing `EtimClassFeature.yaml` / `EtimModellingClassFeature.yaml` split, and is simpler
   than a discriminator when each endpoint already fixes which parent type it returns.
2. **Keep one shared schema but add an explicit discriminator field** alongside a still
   specific-sounding name, e.g. `classCode` + `classType: "EC" | "MC" | "CT"` — useful mainly when
   a single endpoint can genuinely return a polymorphic mix (`oneOf`) of items.
3. **`allOf` composition**: a shared base schema (e.g. `languageCode`, `description`,
   `mutationDate`) extended by thin per-type wrappers that each add their own specific FK field —
   reuses the common fields while keeping the FK name specific per type.

Avoid: reusing a bare, generic field name (`code`) across unrelated parent types purely to save a
schema file. That is the least discoverable option and is the pattern this document corrects.

## Mismatches found and fixed

The following schemas previously used a generic `code`/`version` FK field and have been split or
renamed to follow the convention above:

| Before | After | Notes |
|---|---|---|
| `EtimClassSynonym.yaml` (`code`, `version`, shared EC+MC/CT) | `EtimClassSynonym.yaml` (`classCode`, `classVersion`, EC only) + new `EtimModellingClassSynonym.yaml` (`classCode`, `classVersion`, MC/CT only) | Split per parent type, mirrors `EtimClassFeature`/`EtimModellingClassFeature` |
| `EtimClassTranslation.yaml` (`code`, `version`, shared EC+MC/CT) | `EtimClassTranslation.yaml` (`classCode`, `classVersion`, EC only) + new `EtimModellingClassTranslation.yaml` (`classCode`, `classVersion`, MC/CT only) | Same split |
| `EtimTranslation.yaml` (`code`, shared by Feature/FeatureGroup/Group/ModellingGroup/Value — 5 unrelated parent types) | Removed. Replaced by 5 dedicated schemas: `EtimFeatureTranslation.yaml` (`featureCode`), `EtimFeatureGroupTranslation.yaml` (`featureGroupCode`), `EtimGroupTranslation.yaml` (`groupCode`), `EtimModellingGroupTranslation.yaml` (`groupCode`), `EtimValueTranslation.yaml` (`valueCode`) | Widest-reaching mismatch — one field name covered 5 distinct entity types |
| `EtimUnitTranslation.yaml` (`code`, dedicated to `EtimUnit` only) | `EtimUnitTranslation.yaml` (`unitCode`) | Not shared with other types, but still used the generic name; also added the missing `^EU[0-9]{6}$` pattern to match `EtimClassFeature.unitCode` |

**This was an in-place breaking change to `etim@v1`** (field renames + schema name changes on the
affected bulk translation/synonym responses). No compatibility shim or version bump was applied,
because the API was not yet externally adopted at the time of this change.
