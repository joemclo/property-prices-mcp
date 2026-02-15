# AGENT GUIDE

This project exposes a Model Context Protocol (MCP) server that lets agents search UK HM Land Registry price-paid data.

- **Prereqs**: Node.js >= 20, npm >= 7.
- **How to run**: build with `npm run build`, then start the MCP server via `property-prices-mcp` (bin) or `node dist/index.js`. In development you can run `npm run dev` to start via ts-node; `npm run start` runs the compiled server.
- **MCP config**: register a server named `property-prices` with `command: "property-prices-mcp"` (or `"node"`, `args: ["./dist/index.js"]`). Transport is stdio only.
- **Available tools**:
  - `search-property-prices`. Request parameters (all optional unless noted):
    - `postcode` (string) _or_ both `street` + `city` (strings) are required.
    - `minPrice`, `maxPrice` (numbers, GBP), `propertyType` (`detached | semi-detached | terraced | flat | other`), `fromDate`, `toDate` (`YYYY-MM-DD`), `limit` (default 10), `offset` (default 0), `sortBy` (`date | price`, default `date`), `sortOrder` (`asc | desc`, default `desc`).
  - `lookup-postcodes`. Request parameters (all optional unless noted):
    - `postcode` (string) _or_ both `easting` + `northing` (numbers) are required.
    - `radiusMeters`, `limit`, `includeSelf`, `adminDistrict` filters.
    - Limits: `limit` max 500, `radiusMeters` max 200000.
    - Requires a local Code-Point Open DB: `npm run setup:postcodes` (or `npm run fetch:codepo` then `npm run build:postcodes`).
- **Behavior**: street/city are uppercased automatically for the case-sensitive SPARQL endpoint. Filters for price/type are applied after the query. Sorting/pagination happen in-process. Tool returns a JSON payload with `properties`, `total`, `offset`, `limit`.
- **Best prompts**: ask for a search with clear filters, e.g. “Find up to 5 flats on Carlton Road in London between £300k–£500k sold in 2023, sorted by price descending.”
- **Limitations**: E2E queries hit `https://landregistry.data.gov.uk/landregistry/query` and require network access; slow or unavailable endpoints will surface as tool errors. Only price-paid data is exposed; no rental info.
- **CLI**: `property-prices-mcp` runs the server; `npm run cli` runs the CLI entrypoint in `dist/cli.js`.
- **Testing**: fast unit tests with `npm test` / `npm run test:unit`; live tests with `RUN_E2E_TESTS=true npm run test:e2e` (needs internet); `npm run test:all` runs everything; `npm run test-mcp` runs a manual MCP smoke test.
- **Typecheck**: `npm run typecheck`.
- **Lint/format**: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`.
