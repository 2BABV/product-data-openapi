# Stock API

The Stock API provides real-time stock availability and quantity information for trade items.

## Overview

This API allows clients to query stock levels for specific trade items identified by supplier GLN and supplier item number.

## Key Features

- **Real-time stock information**: Get current available quantity
- **Availability status**: Boolean flag indicating if item can be ordered
- **Supplier-specific queries**: Query by supplier GLN and item number

## Endpoints

### Get Stock Information
`GET /suppliers/{supplierIdGln}/items/{supplierItemNumber}/stock`

Returns stock availability and quantity for a specific trade item.

## Response Structure

The API returns:
- `quantity`: Available stock quantity (decimal, minimum 0)
- `available`: Boolean indicating if item is available for order
- `supplierIdGln`: The supplier GLN from the request
- `supplierItemNumber`: The supplier item number from the request

## Business Rules

- Quantity is always >= 0
- Quantity uses up to 4 decimal places for precision
- `available` flag may be false even if quantity > 0 (e.g., item discontinued)
- `available` flag should be true if quantity > 0 and item is orderable

## Authentication

The API supports two authentication methods:
- OAuth 2.0 Client Credentials (scope: `read:stock`)
- API Key (header: `X-API-Key`)

## Examples

See the OpenAPI specification for detailed request/response examples.
