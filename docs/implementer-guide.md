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
| Trade Item API | `read:tradeitems`, `write:tradeitems` |
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

All APIs return errors using the [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807) format with content type `application/problem+json`.

When the error has no extra semantics beyond the HTTP status code, the `type` field is set to `about:blank` and `title` matches the standard HTTP status phrase:

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "No product found with manufacturer GLN '1234567890123' and product number 'XYZ'"
}
```

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

See [GOVERNANCE.md](../GOVERNANCE.md) for the full versioning policy.
