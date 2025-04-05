# Property Price Search MCP Server

A Model Context Protocol (MCP) server that allows users to search for property prices by postcode using the HM Land Registry's SPARQL endpoint.

## Features

- Search property prices by postcode or street/city combination
- Filter results by price range, property type, and date range
- Connect to HM Land Registry's public SPARQL endpoint
- Implements MCP stdio transport for IDE integration
- TypeScript implementation with full type safety
- Comprehensive test suite
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

### Command Line Interface

```bash
property-prices-mcp
```

### As a Library

```typescript
import { McpClient } from '@modelcontextprotocol/sdk/client';

const client = new McpClient();
const result = await client.resource('property-prices').query({
  postcode: 'SW1A 1AA',
  minPrice: 1000000,
  propertyType: 'flat',
  limit: 5,
});

console.log(result);
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
  propertyType: string;
  newBuild: boolean;
  tenure: string;
  paon: string;
  saon?: string;
  street: string;
  locality?: string;
  town: string;
  district: string;
  county: string;
  postcode: string;
}

interface SearchResponse {
  results: PropertyPrice[];
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
   npm test                  # Run all tests
   npm run test:unit        # Run unit tests only
   npm run test:integration # Run integration tests only
   ```

5. Start in development mode:
   ```bash
   npm run dev
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
