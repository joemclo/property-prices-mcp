# Land Registry Skill Lab

This folder contains a low-level, bash-first toolkit for querying UK property price-paid data and nearby postcodes.

It is intentionally unopinionated: the LLM/user composes SPARQL queries directly.

## Tools

- `tools/query_raw.sh` - Send raw SPARQL to the HM Land Registry endpoint.
- `tools/postcode.sh` - Normalize and validate UK postcodes.
- `tools/nearby_postcodes.sh` - Query nearby postcodes from the local Code-Point Open SQLite database.

## Requirements

- `bash`
- `curl`
- `jq`
- `sqlite3` (for nearby postcode lookups)

For `nearby_postcodes.sh`, build the local postcode DB first:

```bash
npm run setup:postcodes
```

## Quick Start

Normalize a postcode:

```bash
./experiments/land-registry-skill/tools/postcode.sh normalize "ct2 8et"
```

Validate a postcode:

```bash
./experiments/land-registry-skill/tools/postcode.sh validate "CT2 8ET"
```

Run a raw SPARQL query:

```bash
./experiments/land-registry-skill/tools/query_raw.sh \
  --query-file ./experiments/land-registry-skill/examples/postcode_sales.rq
```

Find nearby postcodes from a center postcode:

```bash
./experiments/land-registry-skill/tools/nearby_postcodes.sh \
  --postcode "CT2 8ET" \
  --radius-meters 1500 \
  --limit 20
```

## Notes

- `query_raw.sh` returns endpoint JSON unchanged.
- `nearby_postcodes.sh` returns JSON in the same high-level shape as the MCP `lookup-postcodes` tool.
- Endpoint override for SPARQL calls:

```bash
LAND_REGISTRY_ENDPOINT="https://landregistry.data.gov.uk/landregistry/query" \
  ./experiments/land-registry-skill/tools/query_raw.sh --query-file ./my-query.rq
```
