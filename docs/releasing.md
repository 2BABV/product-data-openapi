# How to Release an API Version

This guide covers the steps to release a new version of the **Product API** or **Trade Item API**.


## Tag format

```
product/v1.2.3
tradeitem/v1.2.3
```

Tags are **prefixed per API** so each API is versioned independently.
Versions follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH` (e.g. `1.2.0`) or a pre-release label (e.g. `1.0.0-Preview1`, `2.0.0-beta.1`).

## Release steps

### 1. Update `info.version` in the OpenAPI spec

```bash
# For Product API
edit openapi/apis/product/openapi.yaml
# Change:  version: 1.0.0-Preview
# To:      version: 1.1.0
```

The tag you create in step 4 **must match this value exactly**.

### 2. Add a CHANGELOG entry

```bash
edit openapi/apis/product/CHANGELOG.md
```

Add a new section **before** `## [Unreleased]`:

```markdown
## [1.1.0] - 2026-05-01

### Added
- New feature description

### Changed
- Changed behaviour description

### Fixed
- Bug fix description
```

The release workflow **validates** that this section exists and uses its content as release notes.

### 3. Commit

```bash
git add openapi/apis/product/openapi.yaml openapi/apis/product/CHANGELOG.md
git commit -m "release: Product API v1.1.0"
```

### 4. Tag

```bash
git tag product/v1.1.0
```

For Trade Item API: `git tag tradeitem/v1.1.0`

### 5. Push

```bash
git push origin main --tags
```

## What happens automatically

Once the tag is pushed, the `release.yml` workflow:

1. **Validates** the tag version matches `info.version` in the spec
2. **Validates** a CHANGELOG entry exists for the version
3. **Bundles** the OpenAPI YAML
4. **Builds** the HTML documentation
5. **Creates a GitHub Release** with:
   - YAML bundle (`product-api.yaml`) and HTML doc (`product.html`) as downloadable assets
   - Release notes extracted from the CHANGELOG
   - Pre-release flag set automatically for versions containing `-` (e.g. `1.0.0-Preview`)
6. **Publishes versioned docs** to GitHub Pages at:
   - `https://product-data-openapi.2ba.nl/product/v1.1.0/`
   - `https://product-data-openapi.2ba.nl/product/latest/` (updated)
7. **Updates `versions.json`** so the version selector on the landing page shows the new version

## Pre-release versions

Versions containing a hyphen (e.g. `1.0.0-Preview1`, `2.0.0-beta.1`) are automatically
marked as pre-releases on GitHub and are not promoted to "latest" in the version selector
until a stable release exists.

## Rollback / re-release

To fix a bad release, delete the tag and re-push after fixing the issue:

```bash
git tag -d product/v1.1.0
git push origin :refs/tags/product/v1.1.0
# fix the issue, then re-tag
git tag product/v1.1.0
git push origin main --tags
```

## GitHub Pages setup (one-time, manual)

After the first push to `main`, go to:
**GitHub → Settings → Pages → Source → GitHub Actions**

This must be done once by a repository admin. It cannot be automated.
