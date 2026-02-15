# Skill: Land Registry SPARQL (Low-Level Bash)

Use this skill when you want direct, controllable access to the Land Registry SPARQL endpoint and postcode-neighbour data.

## Workflow

1. If input includes a postcode, normalize it:
   - `tools/postcode.sh normalize "<postcode>"`
2. Validate it before building a query:
   - `tools/postcode.sh validate "<postcode>"`
3. Compose SPARQL directly (do not rely on wrappers).
4. Execute query:
   - `tools/query_raw.sh --query "..."`
   - or `tools/query_raw.sh --query-file ./examples/postcode_sales.rq`
5. Parse `results.bindings` in returned JSON.

## Nearby Postcodes

To enrich a search area around a location:

```bash
tools/nearby_postcodes.sh --postcode "CT2 8ET" --radius-meters 2000 --limit 25
```

Use returned postcodes to drive follow-up SPARQL queries.

## Error Handling Guidance

- If endpoint call fails, retry once with a longer timeout.
- If still failing, return a clear error with status and query context.
- If postcode validation fails, ask for corrected input.

## Design Intent

- Keep tools primitive and composable.
- Let the LLM decide filtering, query shapes, and post-processing.
