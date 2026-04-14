# Governance Model
**Products & TradeItems API**

## 1. Purpose

This document describes the governance model, change process, and release strategy for the Products & TradeItems API.
Its goals are:

- Stability for international implementations
- Transparency of changes
- Predictable versioning
- Careful handling of breaking changes

---

## 2. Principles

1. **Stability over speed**
2. **No breaking changes within a major version**
3. **Full transparency (public repository)**
4. **Traceability of every change**
5. **International participation through a formal process**

---

## 3. Roles and Permissions

### 3.1 Maintainers (Core Team)
- Merge permissions
- Release permissions
- Final decision in case of conflicts
- Responsible for versioning

### 3.2 National Centers / Stakeholder Organizations
- May open issues
- May submit RFCs
- May submit pull requests
- No direct merge permissions

### 3.3 Community
- Read-only access
- May open issues
- May participate in discussions

The repository is **public**.
Write access is limited to maintainers.

---

## 4. Change Process

All changes follow the same traceable process.

### Step 1 — Change Request (Issue)

Every change starts as a GitHub issue containing:

- Business motivation
- Impact analysis
- Backward compatible? (yes/no)
- Affected endpoints / models
- National Center (if applicable)

---

### Step 2 — RFC (required for major changes)

An RFC is required for:

- Breaking changes
- New resources
- Changes to the Products or TradeItems model
- Semantic changes

The RFC is submitted as a Markdown document in `/rfcs` through a pull request.

An RFC contains:

- Context
- Problem statement
- Proposed solution
- JSON/OpenAPI example
- Impact analysis
- Migration strategy
- Alternatives

Discussion period: **3–4 weeks**

Merging the RFC pull request constitutes formal approval.

---

### Step 3 — Implementation PR

After RFC approval:

- Create a new pull request against `main`
- Reference the issue and RFC
- Update the CHANGELOG
- Update the version when required
- Pass CI validation

At least **2 maintainer reviews** are required.

---

## 5. Versioning Strategy

The API uses **Semantic Versioning (SemVer)**:

```
MAJOR.MINOR.PATCH
```

### MAJOR
Breaking changes:
- Required field added
- Field removed
- Type changed
- Endpoint removed
- Semantics changed

New major versions use a new URL path segment:

```
/v1/
/v2/
```

Implementers MAY add an optional prefix (e.g. `/api`) before the version segment.
The version segment itself (`/v1/`, `/v2/`) is fixed by the standard.

---

### MINOR
Backward-compatible additions:
- New optional field
- New endpoint
- Enum expansion
- New filtering capability

Optional fields added anywhere in the object model, including nested models, remain a MINOR change because clients are expected to accept unknown properties.

---

### PATCH
- Documentation improvements
- Schema bug fixes
- Non-functional corrections

---

## 6. Breaking Change Policy

- No breaking changes within a major version
- Deprecation period: at least **24 months**
- Parallel major versions are allowed
- Clients must ignore unknown enum values
- Clients must accept and ignore unknown properties in response payloads

---

## 7. Release Process

Each release contains:

- Git tag (format: `{api-name}/v{semver}`, e.g., `product/v1.2.0`, `tradeitem/v1.1.0`)
- GitHub Release with attached artifacts (bundled YAML spec + HTML docs)
- Per-API `CHANGELOG.md` entry (Keep a Changelog format)
- Updated `info.version` in the API's `openapi.yaml`

**Tag format (mono-repo, per-API versioning):**
- Product API: `product/v{semver}` — e.g., `product/v1.2.0`
- Trade Item API: `tradeitem/v{semver}` — e.g., `tradeitem/v1.1.0`

> **Important**: The tag version must match the `info.version` field in the corresponding `openapi.yaml`. The release workflow validates this and fails if they differ.

Release steps for maintainers:
1. Update `info.version` in `openapi/apis/{api}/openapi.yaml`
2. Add a `## [{version}] - {date}` section to `openapi/apis/{api}/CHANGELOG.md`
3. Commit: `git commit -m "release: {API} v{version}"`
4. Tag: `git tag {api}/v{version}` (must match `info.version` exactly)
5. Push: `git push origin main --tags`

The release workflow then automatically:
- Validates tag matches spec version
- Builds and bundles the spec
- Creates a GitHub Release with YAML + HTML artifacts
- Publishes versioned documentation to GitHub Pages

**Release artifacts per API:**

| File | Purpose |
|------|---------|
| `{api}-api.yaml` | Bundled single-file OpenAPI spec (for SDK generation, tooling import) |
| `{api}.html` | Standalone interactive API documentation |

**Release notes structure (in CHANGELOG.md):**

- Added
- Changed
- Deprecated
- Removed
- Fixed
- Breaking (if any)

---

## 8. CI and Validation

Automatic checks for every pull request:

- OpenAPI linting
- Schema validation
- Breaking change detection
- Required CHANGELOG update
- Required version check

Pull requests without passing checks cannot be merged.

---

## 9. Transparency and Documentation

The repository contains:

- `GOVERNANCE.md`
- `CONTRIBUTING.md`
- `VERSIONING.md`
- `CHANGELOG.md`
- `/rfcs` directory

All decisions are publicly traceable.

---

## 10. Decision-Making

- Consensus where possible
- If consensus is not reached: decision by maintainers
- RFC discussions are publicly visible
- The decision is recorded through the RFC merge

---

## 11. Long-Term Strategy

- Major versions are supported for at least 24 months
- The roadmap is published publicly
- International stakeholders participate through the RFC process

---

# Workflow Summary

1. Issue
2. RFC (if required)
3. Discussion period
4. RFC approval
5. Implementation PR
6. CI validation
7. Review and merge
8. Version bump
9. Release and communication

---

TODO:

- Create a formal `CONTRIBUTING.md`
- Document a concrete GitHub folder structure
- Generate an example RFC template

