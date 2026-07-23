# Implementer Guide

This guide explains how to implement the Product Data APIs. The OpenAPI specifications define a **standard URL contract** that all implementers must follow, while allowing flexibility for hosting infrastructure.

## URL Contract

The URL structure separates fixed elements (mandated by the standard) from variable elements (implementer's choice):

```
https://{implementer-domain}[/optional-prefix]/v1/{resource}/{path-params}
```

| URL Part | Fixed or Variable? | Rationale |
|---|---|---|
| Domain / host | **Variable** | Each implementer has their own domain |
| Optional prefix (e.g. `/api`) | **Variable** | Depends on implementer infrastructure |
| `/v1/` version segment | **Fixed** | All v1 implementers MUST use `/v1/` |
| Resource path | **Fixed** | Must be identical across implementers |
| Path parameters | **Fixed** | Per spec definition |

### Resource Paths

| API | Resource path prefix |
|-----|---------------------|
| Product API | `/products` |
| Trade Item API | `/trade-items` |
| Net Price API | `/netprices` |
| Stock API | `/stock` |

### Example URLs

| Implementer | Product details URL |
|---|---|
| 2BA | `https://rest.2ba.nl/api/v1/products/{gln}/{productNumber}/details` |
| Artikelbeheer (Select) | `https://selectprerelease.artikelbeheer.nl/api/v1/products/{gln}/{productNumber}/details` |
| ETIM International (Etimix) | `https://acceptation-service-api-dsgo.etimix.com/v1/products/{gln}/{productNumber}/details` |

Note: The presence or absence of `/api` before `/v1` is implementer-specific. The fixed part starts at `/v1/`.

## Authentication (OAuth 2.0)

All APIs use the **OAuth 2.0 Client Credentials** flow (`clientCredentials` grant type) as defined in RFC 6749 §4.4. This is the standard grant for machine-to-machine (M2M) communication.

### Token Endpoint

Each implementer provides their own OAuth 2.0 authorization server. The OpenAPI specs use a placeholder `tokenUrl` — implementers must replace it with their actual endpoint.

| Implementer | Token URL |
|---|---|
| *(placeholder in spec)* | `https://auth.example.com/connect/token` |
| 2BA (production) | `https://identity.2ba.nl/connect/token` |
| 2BA (acceptance) | `https://identity.accept.2ba.nl/connect/token` |

### Client Authentication

Two methods are supported:

1. **Client Secret** — standard `client_id` + `client_secret` in the token request body
2. **Client Assertion (RFC 7523)** — `client_assertion` + `client_assertion_type` using a signed JWT, for certificate-based authentication in higher-security environments

### Scopes

Scope naming follows the pattern `read:{resource}`:

| API | Scope |
|-----|-------|
| Product API | `read:products` |
| Trade Item API | `read:tradeitems` |
| Net Price API | `read:netprices` |
| Stock API | `read:stock` |

### Token Request Example

```http
POST /connect/token HTTP/1.1
Host: auth.your-domain.com
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=your-client-id
&client_secret=your-client-secret
&scope=read:products
```

The response returns a Bearer token to include in API requests:

```http
GET /v1/products/{gln}/{productNumber}/details HTTP/1.1
Host: api.your-domain.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

## Error Responses

All APIs return errors using the [RFC 9457 Problem Details](https://datatracker.ietf.org/doc/html/rfc9457) format with content type `application/problem+json`.

> **Note**: RFC 9457 supersedes RFC 7807. The format is identical; only the standard reference has changed.

When the error has no extra semantics beyond the HTTP status code, the `type` field is set to `about:blank` and `title` matches the standard HTTP status phrase:

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "No product found with manufacturer GLN '1234567890123' and product number 'XYZ'"
}
```

**Client guidance**: Use `type` and `status` for control flow decisions. The `detail` and `title` fields are human-readable descriptions and must not be used for programmatic branching or exception-message matching.

## Sub-Resource Response Behavior

Root resource endpoints return `404` when the entity does not exist:

```http
GET /v1/products/9999999999999/UNKNOWN HTTP/1.1
→ 404 Not Found (ProblemDetails)
```

Sub-resource endpoints **never** return `404`. They always return `200` with the collection property set to an empty array:

```http
GET /v1/products/9999999999999/UNKNOWN/descriptions HTTP/1.1
→ 200 OK
```

```json
{
  "data": {
    "manufacturerIdGln": "9999999999999",
    "manufacturerProductNumber": "UNKNOWN",
    "descriptions": []
  }
}
```

This applies regardless of whether the parent product or trade item exists. A `200` response from a sub-resource endpoint does **not** confirm parent entity existence. Clients that need to verify existence must call the root endpoint.

### Nullability Rules

| Type | Context | When absent | Example |
|------|---------|-------------|---------|
| Collections (arrays) | Sub-resource endpoints | Empty array `[]` | `"descriptions": []` |
| Collections (arrays) | Aggregate root endpoint | `null` if not included, `[]` if included but empty | `"pricings": null` |
| Singular objects | All endpoints | `null` | `"ordering": null` |

Sub-resource endpoints always return their specific collection as `[]` when empty — never `null`.

Aggregate root endpoints (`/products/{gln}/{num}` and `/trade-items/{gln}/{num}`) support partial inclusion. Collections that were not requested are returned as `null`, while requested but empty collections are `[]`:

| Value | Meaning |
|-------|---------|
| `[...]` | Requested, has data |
| `[]` | Requested, but empty (no data exists) |
| `null` | Not included in this response (not requested) |

Singular optional objects are always present but may be `null`.

## Pagination

Bulk endpoints use cursor-based pagination. Include `cursor` and `limit` query parameters:

| Parameter | Description |
|-----------|-------------|
| `cursor` | Opaque cursor string from previous response's `meta.cursor` |
| `limit` | Maximum number of items per page (implementer may cap this) |

The response `meta` object contains:

| Field | Description |
|-------|-------------|
| `cursor` | Cursor for the next page |
| `prevCursor` | Cursor for the previous page |
| `hasNext` | Whether more pages exist |
| `hasPrev` | Whether a previous page exists |
| `limit` | Actual page size used |
| `estimatedTotal` | Approximate total item count |

## Versioning

The API version is embedded in the URL path (`/v1/`). Major version increments (breaking changes) produce a new path segment (`/v2/`). Minor and patch changes are backward-compatible and do not change the version segment.

### Api-Version Response Header

Implementers SHOULD return an `Api-Version` response header containing the highest
released per-API specification version fully implemented by the server:

```http
Api-Version: 1.2.0
```

The value is a SemVer string matching the `info.version` of the specification release
the implementer conforms to (e.g., Product API `1.2.0`). Each API is versioned
independently, so the header value reflects the specific API being called.

This header provides operational visibility (logging, debugging, support tickets)
and allows clients to detect which minor-version features an implementer supports.
Clients MUST NOT rely on this header for behavioral branching — the URL path (`/v1/`)
remains the only contract-level version indicator.

See [GOVERNANCE.md](../GOVERNANCE.md) for the full versioning policy.

## Deprecation Lifecycle

When a major API version is superseded (e.g., `/v2/` replaces `/v1/`), implementers
signal the transition using standard HTTP headers. The deprecation period is at least
**24 months** (see [GOVERNANCE.md](../GOVERNANCE.md) §6).

### Headers

Implementers SHOULD include these headers on every response to deprecated version endpoints:

| Header | Format | RFC | Purpose |
|--------|--------|-----|---------|
| `Deprecation` | `@<unix-timestamp>` (Structured Field integer date) | [RFC 9745](https://www.rfc-editor.org/rfc/rfc9745) | When the version was/will be deprecated |
| `Sunset` | `<HTTP-date>` | [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594) | When the version will be removed |
| `Link` | `<url>; rel="deprecation"` | [RFC 9745](https://www.rfc-editor.org/rfc/rfc9745) | Migration documentation |
| `Link` | `<url>; rel="sunset"` | [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594) | Sunset documentation |

> **Note**: `Deprecation` and `Sunset` use different date formats by design.
> `Deprecation` uses a Structured Field integer date (Unix timestamp), while `Sunset`
> uses the standard HTTP-date format.

### Example

```http
HTTP/1.1 200 OK
Api-Version: 1.4.0
Deprecation: @1830297600
Sunset: Tue, 01 Jan 2030 00:00:00 GMT
Link: <https://api.example.com/docs/migration/v2>; rel="deprecation"
Content-Type: application/json
```

### Scope

Deprecation applies to the **entire major version** (`/v1/`), not to individual endpoints.
Individual endpoints within a stable major version are never sunsetted independently —
deprecated operations remain available for the lifetime of their major version.

Also mark deprecated endpoints with `deprecated: true` in the OpenAPI specification
so that tooling (code generators, documentation, linters) can surface the deprecation.
