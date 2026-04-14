# Best practices (OpenAPI 3.1 / JSON Schema)

1. [Naming Conventions](#naming-conventions)
   - [Schema and Component Names](#schema-and-component-names)
   - [File Names](#file-names)
   - [Property Naming](#property-naming)
   - [Array/List Naming Conventions](#arraylist-naming-conventions)
   - [Enum Values](#enum-values)
   - [Path and Operation IDs](#path-and-operation-ids)
   - [Examples](#examples)
2. [OpenAPI 3.1 / JSON Schema 2020-12](#openapi-31--json-schema-2020-12)
   - [Nullable Fields](#nullable-fields)
   - [Examples in Schemas vs Parameters](#examples-in-schemas-vs-parameters)
  - [Extensible Object Models](#extensible-object-models)
   - [Type Validation](#type-validation)
   - [Composition Patterns](#composition-patterns)
3. [Pagination Strategies](#pagination-strategies)
   - [Cursor-Based Pagination (Recommended)](#cursor-based-pagination-recommended)
   - [Why Cursor > Offset Pagination](#why-cursor--offset-pagination)
   - [Implementation Pattern](#implementation-pattern)
4. [Enums](#enums)
   - [When to Use Separate Enum Files](#when-to-use-separate-enum-files)
   - [When to Keep Enums Inline](#when-to-keep-enums-inline)
   - [Benefits](#benefits)
5. [DTO and Domain Objects in OpenAPI REST Services](#dto-and-domain-objects-in-openapi-rest-services)
   - [Domain Objects (Entities/Models)](#domain-objects-entitiesmodels)
   - [DTOs (Data Transfer Objects)](#dtos-data-transfer-objects)
   - [Key Benefits](#key-benefits)
   
## Naming conventions

### Schema and Component Names
- **PascalCase** for schema names: `UserProfile`, `ProductDetail`, `OrderStatus`
- **camelCase** for property names: `firstName`, `createdAt`, `isActive`
- **kebab-case** for path parameters: `/users/{user-id}/orders/{order-id}`

### File Names
- **PascalCase** for schema files: `UserProfile.yaml`, `ProductDetail.yaml`, `Price.yaml`
- **kebab-case** for parameter files: `cursor.yaml`, `limit.yaml`, `sort-order.yaml`
- **kebab-case** for response files: `400-bad-request.yaml`, `404-not-found.yaml`
- **kebab-case** for path files: `trade-items.yaml`, `netprices-by-item-number.yaml`
- **PascalCase** for component references: `#/components/schemas/UserProfile`

### Property Naming
- Use **descriptive, meaningful names**: `emailAddress` not `email`
- Avoid abbreviations: `identifier` not `id` (unless universally understood)
- Boolean properties should be **questions**: `isActive`, `hasPermission`, `canEdit`

### Array/List Naming Conventions
- Use plural nouns for array properties: `users`, `productDetails`, `orderStatuses`
- Be descriptive: `emailAddresses` not `emails`
- For nested objects: `userProfiles`, `shippingAddresses`

### Enum Values
- **SCREAMING_SNAKE_CASE** for enum values: `PENDING`, `IN_PROGRESS`, `COMPLETED`
- Or **kebab-case** for readability: `pending`, `in-progress`, `completed`

### Path and Operation IDs
- **camelCase** for operationId: `getUserById`, `createNewOrder`
- **kebab-case** for paths: `/v1/user-profiles`

### Examples
````yaml
components:
  schemas:
    UserProfile:
      type: object
      properties:
        firstName:
          type: string
        isActive:
          type: boolean
        accountStatus:
          $ref: '#/components/schemas/AccountStatus'
       emailAddresses:
          type: array
          items:
            $ref: '#/components/schemas/EmailAddress'

    AccountStatus:
      type: string
      enum:
        - ACTIVE
        - SUSPENDED
        - PENDING_VERIFICATION
    EmailAddress:
      type: object
      properties:
        address:
          type: string
        isPrimary:
          type: boolean
````

These conventions ensure consistency and improve code generation across different programming languages.

## OpenAPI 3.1 / JSON Schema 2020-12

This project uses **OpenAPI 3.1** which aligns with **JSON Schema 2020-12**. This brings important changes from OpenAPI 3.0.

### Nullable Fields

Use type arrays for nullable fields instead of the deprecated `nullable` keyword:

```yaml
# ✅ CORRECT - OpenAPI 3.1 / JSON Schema 2020-12
propertyName:
  type: ["string", "null"]
  description: Optional field that can be null

# ❌ INCORRECT - OpenAPI 3.0 only (deprecated)
propertyName:
  type: string
  nullable: true
```

### Examples in Schemas vs Parameters

**For Schemas** - Use `examples` array (plural):
```yaml
# ✅ CORRECT - Schema examples array (plural)
type: object
properties:
  name:
    type: string
examples:
  - name: "Example 1"
  - name: "Example 2"

# ❌ DEPRECATED - Avoid example (singular) for schemas
example:
  name: "Example"
```

**For Parameters** - Use `example` (singular) OR `examples` (plural object):
```yaml
# ✅ CORRECT - Parameter example (simple, singular)
name: cursor
in: query
schema:
  type: string
example: "eyJpZCI6MTIzfQ=="

# ✅ ALSO CORRECT - Parameter examples (named examples object)
name: status
in: query
schema:
  type: string
examples:
  active:
    value: "active"
    summary: Active status
  pending:
    value: "pending"
    summary: Pending status
```

### Extensible Object Models

Allow additional properties so object payloads can evolve without breaking existing clients. This applies to top-level envelopes, metadata objects, domain models, and nested models. Clients must accept and ignore unknown properties.

Examples should document the currently known fields clearly, but they do not define a closed-world contract. Additional fields may appear in responses over time.

```yaml
# ✅ CORRECT - Allow additive fields for compatibility
type: object
required:
  - id
  - name
properties:
  id:
    type: string
  name:
    type: string
```

### Type Validation

Include validation constraints and format hints:

```yaml
# ✅ CORRECT - Include validation constraints
productId:
  type: string
  minLength: 1
  maxLength: 35
  pattern: "^[A-Z0-9-]+$"
  examples:
    - "PROD-12345"

# ETIM-converted numeric field — use format: decimal and multipleOf: 0.0001
# See design-decisions.md for the full string-to-number conversion rules
price:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999999999.9999
  examples:
    - 19.99

email:
  type: string
  format: email
  examples:
    - "user@example.com"

createdAt:
  type: string
  format: date-time
  examples:
    - "2025-12-02T10:30:00Z"
```

**Common format values:**
- `date-time` - ISO 8601 date-time
- `date` - ISO 8601 date
- `email` - Email address
- `uri` - URI reference
- `uuid` - UUID string
- `decimal` - Code-generator hint for exact decimal types (non-standard; see [design decisions](product-data-openapi-design-decisions.md#format-decimal--code-generator-hint))

### Composition Patterns

Use `anyOf`, `oneOf`, `allOf` for schema composition:

```yaml
# ✅ Use const over single-value enum for literal values
type:
  const: "product"

# ✅ Use oneOf for mutually exclusive options
identifier:
  oneOf:
    - $ref: '#/components/schemas/Gln'
    - $ref: '#/components/schemas/Duns'

# ✅ Use allOf for combining schemas
ProductResponse:
  allOf:
    - $ref: '#/components/schemas/BaseResponse'
    - type: object
      properties:
        data:
          $ref: '#/components/schemas/Product'
```

## Pagination Strategies

### Cursor-Based Pagination (Recommended)

**Always use cursor-based pagination** for list endpoints. This project exclusively uses the `data` + `meta` pattern with opaque cursors.

#### Standard Response Structure
```yaml
type: object
required:
  - data
  - meta
properties:
  data:
    type: array
    description: Array of items in the current page
    items:
      $ref: ../domain/YourDomainObject.yaml
  meta:
    $ref: ../../../../shared/schemas/common/CursorPaginationMetadata.yaml
examples:
  - data:
      - id: "123"
        name: "Item 1"
    meta:
      cursor: "eyJpZCI6MTIzfQ=="
      prevCursor: "eyJpZCI6MTAwfQ=="
      hasNext: true
      hasPrev: true
      limit: 100
      estimatedTotal: 245
```

#### Standard Query Parameters
- `cursor` (string, optional): Opaque cursor for fetching the next/previous page
- `limit` (integer, optional): Maximum number of items per page (default: 100, max: 1000)

### Why Cursor > Offset Pagination

| Issue | Offset-Based (`page=2&size=50`) | Cursor-Based (`cursor=xyz&limit=50`) |
|-------|----------------------------------|---------------------------------------|
| **Consistency** | ❌ Duplicates/missing items if data changes between requests | ✅ Stable results even with concurrent mutations |
| **Performance** | ❌ `OFFSET 10000 LIMIT 50` scans 10,050 rows | ✅ `WHERE id > cursor LIMIT 50` uses indexes efficiently |
| **Deep Pagination** | ❌ Exponentially slower (page 1000 scans 50K rows) | ✅ Constant O(1) performance at any depth |
| **Database Load** | ❌ High cost for large offsets | ✅ Minimal cost, index-based lookups |
| **Real-time Data** | ❌ Page counts/totals become stale instantly | ✅ `estimatedTotal` acknowledges approximate nature |
| **Scalability** | ❌ Cannot disable expensive COUNT queries | ✅ `estimatedTotal` optional, can be cached/sampled |

#### Real-World Example

**Problem with offset pagination:**
```
Request 1: GET /items?page=1&size=10  → Returns items 1-10
[New item inserted at position 3]
Request 2: GET /items?page=2&size=10  → Returns items 11-20
                                         ❌ Item 10 appears in BOTH pages!
```

**Cursor pagination prevents this:**
```
Request 1: GET /items?limit=10        → Returns items 1-10, cursor=item_10_id
[New item inserted at position 3]
Request 2: GET /items?cursor=item_10_id&limit=10 
                                         ✅ Returns items 11-20 (after item_10_id)
```

### Implementation Pattern

#### 1. Query Parameters (Reusable)
```yaml
# shared/parameters/query/cursor.yaml
name: cursor
in: query
required: false
schema:
  type: string
description: Opaque cursor for pagination
example: "eyJpZCI6MTIzLCJzb3J0IjoiY3JlYXRlZEF0In0="

# shared/parameters/query/limit.yaml
name: limit
in: query
required: false
schema:
  type: integer
  minimum: 1
  maximum: 1000
  default: 100
description: Maximum number of items to return
example: 100
```

#### 2. Metadata Schema (Reusable)
```yaml
# shared/schemas/common/CursorPaginationMetadata.yaml
type: object
required:
  - hasNext
  - limit
properties:
  cursor:
    type: ["string", "null"]
    description: Cursor for fetching the next page
  prevCursor:
    type: ["string", "null"]
    description: Cursor for fetching the previous page
  hasNext:
    type: boolean
    description: Whether more items exist after this page
  hasPrev:
    type: boolean
    description: Whether items exist before this page
  limit:
    type: integer
    description: Maximum items per page used for this request
  estimatedTotal:
    type: ["integer", "null"]
    description: Approximate total count (may be cached/sampled for performance)
```

#### 3. Filtering Parameters (Separate from Pagination)

Filters like `mutationDate`, `selectionId`, `status` are **query filters**, not pagination concerns:

```yaml
# Good: Clear separation of concerns
GET /trade-items?selectionId=abc123&mutationDate=2025-11-01&cursor=xyz&limit=100
                 ↑ Filter criteria ↑              ↑ Pagination ↑
```

**Benefits:**
- Filters define *which* items to include
- Pagination controls *how* to traverse the filtered set
- Cursor encodes both filter state and position (opaque to client)

### Best Practices Summary

✅ **DO:**
- Use cursor-based pagination for all list endpoints
- Use `data` + `meta` response structure
- Make cursors opaque (base64-encoded JSON, encrypted tokens, etc.)
- Include `hasNext`/`hasPrev` flags instead of total page counts
- Provide `estimatedTotal` when useful (but acknowledge it's approximate)
- Keep pagination parameters (`cursor`, `limit`) separate from filters
- Document that cursors are opaque and should not be parsed by clients

❌ **DON'T:**
- Use offset-based pagination (`page`, `pageNumber`, `pageSize`)
- Expose cursor internals (let clients construct their own cursors)
- Calculate exact totals for large datasets (use estimates)
- Mix pagination and filtering concerns in a single parameter
- Promise stable `totalPages` or `totalElements` for real-time data

## Enums

### **✅ When to Use Separate Enum Files:**

1. **Reusable across multiple schemas** (like your unit codes)
2. **Large enums** (50+ values) that clutter the main schema
3. **Domain-specific enums** that need detailed documentation
4. **Frequently changing enums** that benefit from version control isolation

### **❌ When to Keep Enums Inline:**

1. **Small, schema-specific enums** (2-5 values)
2. **Tightly coupled to a single property**
3. **Unlikely to be reused**

### **🔧 Benefits You'll Get:**

1. **DRY Principle** - No duplicate enum definitions
2. **Consistency** - Same enum used everywhere maintains data integrity
3. **Maintainability** - Update in one place, reflected everywhere
4. **Documentation** - Better descriptions for complex domain enums
5. **Validation** - Centralized enum validation rules
6. **Code Generation** - Cleaner generated client code


## DTO and Domain Objects in OpenAPI REST Services
### Domain Objects (Entities/Models)

- Core business objects that represent real-world concepts
- Contain business logic and validation rules
- Database entities with full data structure
- Internal to your application/service
### DTOs (Data Transfer Objects)

- Simple data containers for API communication
- No business logic, only data transfer
- Tailored for specific API endpoints and use cases
- External-facing representations

### Key Benefits
1. Security - Hide internal fields from API consumers
2. Flexibility - Change internal structure without breaking API
3. Performance - Only transfer necessary data
4. Versioning - Support multiple API versions simultaneously
5. Validation - Different validation rules for different operations
6. Documentation - Clear, purpose-specific API documentation

```markdown
schemas/
├── requests/
│   ├── CreateUserRequest.yaml
│   └── UpdateUserRequest.yaml
├── responses/
│   ├── UserResponse.yaml
│   └── UserSummary.yaml
├── common/
│   ├── ProblemDetails.yaml
│   └── CursorPaginationMetadata.yaml
└── domain/
  └── # Internal domain schemas (not referenced in OpenAPI)
```
