# Governance Model (CONCEPT!)
**Products & TradeItems API**

## Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14)
([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) /
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)).

---

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
2. **No breaking changes within a stable major version**
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

Pre-release versions (for example, `1.0.0-Preview1`) may contain breaking changes
between successive pre-release releases. Compatibility is frozen when the first stable
release for that major version is published. Breaking changes after stable `1.0.0`
require a new major version and URL path.

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

### Minor-Version Negotiation

The API intentionally does not require clients to specify or negotiate a minor version.
Because all MINOR changes are strictly additive (new optional fields, new endpoints,
enum expansions) and clients are expected to accept unknown properties, every `/v1/`
response is backward-compatible regardless of the server's exact minor version.

**Compatibility direction**: An older client can always consume a newer server's response
(forward compatibility). However, in a multi-implementer ecosystem, a client that depends
on a feature introduced in version 1.2.0 cannot assume that every `/v1/` implementer has
upgraded beyond 1.0.0. Clients that require specific minor-version features should check
the `Api-Version` response header (see [Implementer Guide](docs/implementer-guide.md))
or consult the implementer's conformance documentation.

Introducing minor-version negotiation (e.g., a required request parameter) would require
a separate governance change and is not planned.

---

## 6. Breaking Change Policy

- Breaking changes are permitted between pre-release versions before the first stable release
- No breaking changes within a stable major version
- Deprecation period: at least **24 months**
- Parallel major versions are allowed
- Clients must ignore unknown enum values
- Clients must accept and ignore unknown properties in response payloads

### Deprecation & Sunset Headers

When deprecating an **API version** (e.g., sunsetting `/v1/` after `/v2/` is stable),
implementers SHOULD return these HTTP headers on every successful and API-generated
error response to affected endpoints:

- `Deprecation: @<unix-timestamp>` — The date the version was or will be deprecated
  ([RFC 9745](https://www.rfc-editor.org/rfc/rfc9745))
- `Sunset: <HTTP-date>` — The date the version will be removed
  ([RFC 8594](https://www.rfc-editor.org/rfc/rfc8594))

The `Sunset` date MUST be at least 24 months after the `Deprecation` date, consistent
with the deprecation period above. In addition, deprecated endpoints SHOULD be marked
`deprecated: true` in the OpenAPI specification.

Individual endpoints within a stable major version are NOT sunsetted independently —
deprecated operations remain available for the lifetime of their major version.
The `Sunset` header applies to the entire major version path (e.g., all of `/v1/`).

Implementers SHOULD also include `Link` headers pointing to migration documentation:

```http
Link: <https://example.com/docs/migration/v2>; rel="deprecation"
Link: <https://example.com/docs/sunset/v1>; rel="sunset"
```

Example response headers for a deprecated `/v1/` endpoint:

```http
Deprecation: @1830297600
Sunset: Tue, 01 Jan 2030 00:00:00 GMT
Link: <https://example.com/docs/migration/v2>; rel="deprecation"
```

> **Note**: `Deprecation` uses a Structured Field integer date (RFC 9745), while `Sunset`
> uses the standard HTTP-date format (RFC 8594). These formats differ by design.

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
