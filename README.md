# Property Price Search MCP Server

A Model Context Protocol (MCP) server that allows users to search for property prices by postcode using the HM Land Registry's SPARQL endpoint.

## Features

- Search property prices by postcode or street/city combination
- Filter results by price range, property type, and date range
- Connect to HM Land Registry's public SPARQL endpoint
- Implements MCP stdio transport for IDE integration
- TypeScript implementation with full type safety
- Comprehensive test suite
- Local postcode lookup & nearest-neighbour tool using Ordnance Survey Code-Point Open (downloaded separately)
- CLI interface for direct usage

## Prerequisites

- Node.js >= 18
- npm >= 7

## Installation

### Global Installation

```bash
npm install -g property-prices-mcp
```

### Local Installation

```bash
npm install property-prices-mcp
```

## Usage

### As an MCP Server

This server is designed to be used with MCP clients (like Claude Desktop, IDEs with MCP support, etc.). Configure your MCP client to use this server via stdio transport:

```json
{
  "mcpServers": {
    "property-prices": {
      "command": "property-prices-mcp"
    }
  }
}
```

Once connected, you can use the `search-property-prices` tool with the following parameters:

```json
{
  "postcode": "SW1A 1AA",
  "minPrice": 1000000,
  "propertyType": "flat",
  "limit": 5
}
```

You can also use the `lookup-postcodes` tool (built on Ordnance Survey Code-Point Open) to resolve postcodes and find nearby postcodes:

```json
{
  "postcode": "SW1A 1AA",
  "radiusMeters": 2000,
  "limit": 5
}
```

> Note: The Code-Point Open CSVs are not bundled. Download them once, then build the local postcode database:
> - `npm run setup:postcodes` (downloads + builds), or
> - `npm run fetch:codepo` then `npm run build:postcodes`
>
> Manual download: https://api.os.uk/downloads/v1/products/CodePointOpen/downloads?area=GB&format=CSV&redirect
> Contains Ordnance Survey data © Crown copyright and database right, Royal Mail data © Royal Mail copyright and database right, and National Statistics data © Crown copyright and database right.

### Command Line Interface

For testing or direct usage:

```bash
property-prices-mcp
```

## Usage Notes

### Case Sensitivity

The UK Land Registry data is case-sensitive for street names and city names. However, this MCP automatically converts these parameters to uppercase before sending to the Land Registry API, so you can use any case in your searches.

Example:

```
"Cherry Drive" and "CHERRY DRIVE" will both work correctly.
```

## Search Parameters

The server accepts the following search parameters:

| Parameter    | Type   | Description                                            | Default |
| ------------ | ------ | ------------------------------------------------------ | ------- |
| postcode     | string | UK postcode to search                                  | -       |
| street       | string | Street name                                            | -       |
| city         | string | City name                                              | -       |
| minPrice     | number | Minimum property price                                 | -       |
| maxPrice     | number | Maximum property price                                 | -       |
| propertyType | string | One of: detached, semi-detached, terraced, flat, other | -       |
| fromDate     | string | Start date (YYYY-MM-DD)                                | -       |
| toDate       | string | End date (YYYY-MM-DD)                                  | -       |
| limit        | number | Maximum number of results                              | 10      |
| offset       | number | Number of results to skip                              | 0       |
| sortBy       | string | Sort by 'date' or 'price'                              | 'date'  |
| sortOrder    | string | Sort order 'asc' or 'desc'                             | 'desc'  |

## Response Format

The API returns results in the following format:

```typescript
interface PropertyPrice {
  price: number;
  date: string;
  postcode: string;
  propertyType: 'detached' | 'semi-detached' | 'terraced' | 'flat' | 'other';
  street: string;
  city: string;
  paon?: string;
  saon?: string;
}

interface SearchResponse {
  properties: PropertyPrice[];
  total: number;
  offset: number;
  limit: number;
}
```

## Error Handling

The server returns standard HTTP status codes:

- 200: Successful request
- 400: Invalid parameters
- 404: No results found
- 500: Server error

Error responses include a message explaining the error:

```json
{
  "error": "Invalid postcode format"
}
```

## Development

1. Clone the repository:

   ```bash
   git clone https://github.com/joemclo/property-prices-mcp.git
   cd property-prices-mcp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Run tests:

   ```bash
   npm test                  # Run unit tests (fast, mocked)
   npm run test:unit        # Run unit tests only
   npm run test:e2e         # Run e2e tests (requires internet, hits real API)
   npm run test:all         # Run all tests including e2e
   ```

   **Note**: E2E tests make real API calls to the HM Land Registry SPARQL endpoint and are skipped by default. They require internet connectivity and may fail in sandboxed environments.

5. Start in development mode:
   ```bash
   npm run dev
   ```

## Testing

This project uses a three-tier testing approach:

### Test Structure

```
src/__tests__/
├── unit/              # Unit tests (fast, all mocked)
│   ├── queries.test.ts
│   ├── sparqlService.test.ts
│   └── mcpTool.test.ts
└── e2e/               # End-to-end tests (slow, real API calls)
    └── propertySearch.e2e.test.ts
```

### Running Tests

- **Unit tests** (default): Fast tests with mocked dependencies
  ```bash
  npm test           # or npm run test:unit
  ```

- **E2E tests**: Real API calls to HM Land Registry
  ```bash
  npm run test:e2e
  ```

  Note: E2E tests are skipped by default and require:
  - Internet connectivity
  - Access to https://landregistry.data.gov.uk
  - Setting `RUN_E2E_TESTS=true` environment variable

- **All tests**: Run both unit and e2e tests
  ```bash
  npm run test:all
  ```

### Manual Testing

For ad-hoc testing with real data:
```bash
npm run test-mcp
```

## Troubleshooting

### Common Issues

1. **SPARQL Endpoint Connection Issues**

   - Check your internet connection
   - Verify the HM Land Registry endpoint is available
   - Ensure your IP is not being rate limited

2. **Invalid Postcode Format**

   - Ensure postcodes are in the correct UK format
   - Remove any extra spaces
   - Use uppercase letters

3. **No Results Found**
   - Try broadening your search criteria
   - Check if the date range is too narrow
   - Verify the postcode exists

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
