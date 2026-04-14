# NetPrice API Domain Model

## Overview

The NetPrice API manages customer-specific pricing, price lists, and discount structures for personalized pricing strategies. It provides advanced pricing calculations based on customer relationships, volume commitments, and commercial agreements.

**Net prices are calculated/derived resources**, not stored data, so having them as a separate resource is the right REST approach:

### **Why This Works:**

1. **Separate Concern** - Net prices are computed (from list price - discounts + surcharges)
2. **Different Lifecycle** - Trade items are stored entities, net prices are calculations
3. **Business Logic Separation** - The calculation logic is independent from trade item CRUD operations

### **REST Pattern You're Using:**
```
GET /netprices/{supplierGln}/{tradeItemId}
```

This is actually a **good REST design** because:
- ✅ Represents a **calculated/virtual resource**
- ✅ Clearly different from `/tradeitems` (stored data)
- ✅ Requires both `supplierGln` and `tradeItemId` for calculation context
- ✅ Read-only by nature (you calculate, not store)

### **Real-World Analogy:**
Similar to:
- `/search` - virtual resource from query
- `/reports` - generated from data
- `/calculations` - computed results

**Your architecture is sound!** The naming clearly indicates this is a special, calculated resource distinct from regular trade item prices. Keep it as is! 👍


## Domain Model

### NetPrice Resource Flow

```mermaid
graph TD
    A[Client Request] -->|GET /netprices/supplierGln/tradeItemId| B[NetPrice API]
    B -->|Requires| C[Supplier GLN]
    B -->|Requires| D[Trade Item ID]
    B -->|Optional| E[Quantity]
    B -->|Optional| F[Currency Code]
    
    B -->|Calculates| G[Net Price]
    
    G -->|Based on| H[List Price]
    G -->|Applies| I[Discounts]
    G -->|Applies| J[Surcharges]
    G -->|Considers| K[Volume Commitments]
    G -->|Considers| L[Customer Agreements]
    
    G -->|Returns| M[NetPriceResponse]
    
    style G fill:#4CAF50,color:#fff
    style M fill:#2196F3,color:#fff
    style B fill:#FF9800,color:#fff
```

### NetPrice Response Structure

```mermaid
classDiagram
    class NetPriceResponse {
        +Price netPrice
    }
    
    class Price {
        +number amount
        +number minimum
        +number maximum
        +number multipleOf
        +string format
    }
    
    class PriceQuantity {
        +number quantity
        +number minimum
        +number maximum
        +number multipleOf
    }
    
    class CurrencyCode {
        +string code
        +string default
        +string standard
    }
    
    NetPriceResponse --> Price : contains
    NetPriceResponse ..> PriceQuantity : calculated for
    NetPriceResponse ..> CurrencyCode : expressed in
```

### NetPrice Calculation Context

```mermaid
erDiagram
    NETPRICE ||--|| TRADE_ITEM : "calculated for"
    NETPRICE ||--|| SUPPLIER : "provided by"
    NETPRICE }o--|| CURRENCY : "expressed in"
    NETPRICE }o--o| QUANTITY : "based on"
    
    NETPRICE {
        decimal netPrice
        string calculatedAt
    }
    
    TRADE_ITEM {
        string tradeItemId
        decimal grossListPrice
        string priceUnit
    }
    
    SUPPLIER {
        string gln
        string organizationName
    }
    
    CURRENCY {
        string code
        string defaultValue
    }
    
    QUANTITY {
        decimal amount
        string unit
    }
```

### Request/Response Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as NetPrice API
    participant PC as Price Calculator
    participant TI as Trade Item Service
    participant PS as Price Service
    
    C->>API: GET /netprices/{supplierGln}/{tradeItemId}?quantity=100&currency=EUR
    API->>API: Validate Parameters
    
    alt Invalid Parameters
        API-->>C: 400 Bad Request
    end
    
    API->>TI: Get Trade Item Details
    
    alt Trade Item Not Found
        TI-->>API: Not Found
        API-->>C: 404 Not Found
    end
    
    TI-->>API: Trade Item Data
    API->>PS: Get Base Pricing
    PS-->>API: List Price + Discounts
    
    API->>PC: Calculate Net Price
    Note over PC: Apply Volume Discounts<br/>Apply Surcharges<br/>Apply Customer Agreements
    PC-->>API: Calculated Net Price
    
    API->>API: Format Response
    API-->>C: 200 OK NetPriceResponse
```

### Key Characteristics

- **Virtual Resource**: Net prices are calculated on-demand, not stored
- **Context-Dependent**: Requires supplier GLN and trade item ID
- **Quantity-Aware**: Supports volume-based pricing
- **Multi-Currency**: Defaults to EUR, supports ISO 4217 codes
- **High Precision**: Uses 4 decimal places (0.0001 precision)
- **Read-Only**: GET operations only (no POST/PUT/DELETE)
- **Business Logic**: Incorporates discounts, surcharges, and customer agreements

## Related Documentation

- [TradeItem API Documentation](../tradeitem/README.md)
- [Product API Documentation](../product/README.md)
- [Best Practices](../../../docs/best-practices.md)