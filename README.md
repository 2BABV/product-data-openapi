# Product Data OpenAPI

**Website**: [product-data-openapi.2ba.nl](https://product-data-openapi.2ba.nl/)

This repository contains the OpenAPI 3.1 specifications for the Product Data OpenAPI ecosystem. It provides comprehensive API documentation for multiple domains including product information, trade items, pricing data, and ETIM classification standards.

## Why API?

Why an API next to the ETIM xChange JSON file?

The ETIM xChange V2.0 is a monolithic catalog file format (~404 fields, 17 levels deep) designed for periodic full-catalog batch transfers. The OpenAPI spec in this repo transforms it into a REST API that solves 7 problems the file format can't:

 1. Granular access — Query one product/tradeitem/price instead of downloading the entire catalog
 2. Incremental sync — mutationDateTime filter enables delta-only transfers instead of full exports
 3. Domain decomposition — 4 focused APIs (Product, TradeItem, Supplier, Manufacturer), instead of one monolithic tree
 4. Proper data types — 112 string-encoded numeric fields converted to real number types with format: decimal for code generation
 5. SDK generation — OpenAPI enables auto-generated clients (C#, Java, etc.) with strongly-typed models
 6. Real-time operations — Net price calculation and stock availability have no file-format equivalent
 7. Governed evolution — SemVer, 24-month deprecation, CI-enforced compatibility checks
 8. Flexibility and extensibility —  You can extend and add properties and services without breaking the standard.

**The punchline**: the API's open schema design is an industry governance accelerator — it decouples the pace of innovation from the pace of adoption. They're complementary: xChange is the canonical model for full-catalog exchange; the API is a projection optimized for programmatic consumption.

## Purpose

The repository serves as the central source of truth for API specifications used across the branch, enabling:

- **Standardized API Documentation**: Consistent OpenAPI 3.1 specifications across all services
- **Code Generation**: Support for automatic client and server code generation
- **Contract-First Development**: API-first approach ensuring consistent interfaces
- **Cross-Domain Integration**: Unified specifications for product data, pricing, and classification systems

## Repository Structure

The repository is organized into domain-specific API specifications with shared components for common schemas, parameters, and responses. Each API domain maintains its own OpenAPI specification while leveraging reusable components from the shared library.

## Documentation

### Getting Started
- [Initial Setup](docs/initial-setup.md) - How to set up and work with the OpenAPI specifications
- [Best Practices](docs/best-practices.md) - Guidelines for maintaining and extending the specifications
- [Design decisions](docs/product-data-openapi-design-decisions.md) - General design decisions API vs ETIM xChange, including shared identifier patterns such as `TechnicalId`, `selectionId`, and `pricingRef`

### API Documentation
- [Product API](openapi/apis/product/README.md) - Core product information and catalog management
- [Trade Item API](openapi/apis/tradeitem/README.md) - Trade item specifications and relationships
- [Net Price API](openapi/apis/netprice/README.md) - Pricing and commercial data management

### Published Documentation (GitHub Pages)

Interactive HTML documentation and downloadable OpenAPI bundles are published automatically:

| Resource | URL |
|----------|-----|
| Landing page | `https://product-data-openapi.2ba.nl/` |
| Product API (latest) | `https://product-data-openapi.2ba.nl/product/latest/product.html` |
| Trade Item API (latest) | `https://product-data-openapi.2ba.nl/tradeitem/latest/tradeitem.html` |

The landing page includes a version selector for accessing historical release snapshots and downloadable YAML bundles.

### Releases

APIs are versioned independently using prefixed Git tags (`product/vX.Y.Z`, `tradeitem/vX.Y.Z`). Each release creates:

- A **GitHub Release** with YAML bundle + HTML doc as downloadable artifacts
- A **versioned snapshot** on GitHub Pages at `/{api}/v{version}/`
- Updated `versions.json` for the version selector

See [GOVERNANCE.md](GOVERNANCE.md) §7 for the full release process and [CHANGELOG](openapi/apis/product/CHANGELOG.md) for release history.

### Development Guidelines
- [Copilot Instructions](.github/copilot-instructions.md) - GitHub Copilot configuration for this repository
- [Release Process](docs/releasing.md) - Step-by-step release and tagging procedure
