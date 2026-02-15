#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { searchProperties } from './services/sparqlService.js';
import { lookupPostcodes } from './services/postcodeService.js';
import { logInfo, logError, logMcpRequest, logMcpResponse, logMcpError } from './utils/logger.js';
import { PostcodeLookupParamsSchema } from './models/postcodes.js';

const LAND_REGISTRY_ENDPOINT = 'https://landregistry.data.gov.uk/landregistry/query';

const server = new McpServer({
  name: 'property-prices-mcp',
  version: '1.0.0',
});

const searchPropertyPricesInputSchema: z.ZodTypeAny = z.object({
  postcode: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  propertyType: z.enum(['detached', 'semi-detached', 'terraced', 'flat', 'other']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  sortBy: z.enum(['date', 'price']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const lookupPostcodesInputSchema: z.ZodTypeAny = z.object({
  postcode: z.string().optional(),
  easting: z.number().optional(),
  northing: z.number().optional(),
  limit: z.number().int().positive().max(500).optional(),
  radiusMeters: z.number().positive().max(200000).optional(),
  includeSelf: z.boolean().optional(),
  adminDistrict: z.string().optional(),
});

type ToolResponse = {
  content: Array<{
    type: 'text';
    text: string;
  }>;
};

type RegisterToolCompat = {
  registerTool: (
    name: string,
    config: {
      description: string;
      inputSchema: z.ZodTypeAny;
    },
    cb: (params: Record<string, unknown>) => Promise<ToolResponse>
  ) => unknown;
};

const registerTool = (server as unknown as RegisterToolCompat).registerTool.bind(server);

// Configure the property prices search tool
registerTool(
  'search-property-prices',
  {
    description:
      'Search HM Land Registry price-paid data. Provide either `postcode` or both `street` and `city` (case-insensitive; uppercased for the query). Optional filters: `minPrice`/`maxPrice` (GBP), `propertyType` (detached | semi-detached | terraced | flat | other), `fromDate`/`toDate` (YYYY-MM-DD), `limit`/`offset` (pagination), `sortBy` (date | price), `sortOrder` (asc | desc). Returns JSON: `{ properties: [{ price, date, postcode, propertyType, street, city, paon?, saon? }], total, offset, limit }`, where `paon` is the Primary Addressable Object Name (e.g., house number/name) and `saon` is the Secondary Addressable Object Name (e.g., flat/unit/apartment).',
    inputSchema: searchPropertyPricesInputSchema,
  },
  async (params: Record<string, unknown>) => {
    const startTime = Date.now();
    let responseStatus = 200;

    try {
      // Log the MCP tool request
      logMcpRequest('MCP tool invoked: search-property-prices', {
        toolName: 'search-property-prices',
        params,
      });

      // Normalize params by removing null values
      const normalizedParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== null)
      );

      // Note: sparqlService will automatically convert street and city values to uppercase
      // to handle Land Registry data's case sensitivity requirements
      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, normalizedParams);

      // Log the successful MCP response
      const responseTime = Date.now() - startTime;
      logMcpResponse('MCP tool completed: search-property-prices', {
        toolName: 'search-property-prices',
        params,
        responseStatus,
        responseTime,
        resultCount: result.properties.length,
        totalResults: result.total,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      responseStatus = 500;
      const responseTime = Date.now() - startTime;

      // Log MCP error
      logMcpError('MCP tool failed: search-property-prices', {
        toolName: 'search-property-prices',
        params,
        responseStatus,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return error response to the client
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }
);

// Postcode lookup and nearest-neighbour tool backed by the Code-Point Open dataset
registerTool(
  'lookup-postcodes',
  {
    description:
      'Look up UK postcodes (Code-Point Open) and find nearest neighbours using OSGB36 eastings/northings. Provide either `postcode` or both `easting` and `northing` as the center. Optional: `radiusMeters` (meters), `limit` (default 10), `includeSelf` (default false), `adminDistrict` filter. Returns `{ center, postcodes: [{ postcode, easting, northing, positionalQuality, countryCode, adminDistrictCode, distanceMeters }], total }`. Requires a local database built from the bundled `codepo_gb` CSVs via `npm run build:postcodes`.',
    inputSchema: lookupPostcodesInputSchema,
  },
  async (rawParams: Record<string, unknown>) => {
    const startTime = Date.now();
    let responseStatus = 200;
    try {
      logMcpRequest('MCP tool invoked: lookup-postcodes', {
        toolName: 'lookup-postcodes',
        params: rawParams,
      });

      const params = PostcodeLookupParamsSchema.parse(rawParams);
      const result = lookupPostcodes(params);

      const responseTime = Date.now() - startTime;
      logMcpResponse('MCP tool completed: lookup-postcodes', {
        toolName: 'lookup-postcodes',
        params,
        responseStatus,
        responseTime,
        resultCount: result.postcodes.length,
        totalResults: result.total,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      responseStatus = 500;
      const responseTime = Date.now() - startTime;

      logMcpError('MCP tool failed: lookup-postcodes', {
        toolName: 'lookup-postcodes',
        params: rawParams,
        responseStatus,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { error: error instanceof Error ? error.message : String(error) },
              null,
              2
            ),
          },
        ],
      };
    }
  }
);

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logInfo('Property Price MCP Server started', { service: 'property-prices-mcp' });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logInfo('Property Price MCP Server shutting down', { service: 'property-prices-mcp' });
      process.exit(0);
    });
  } catch (error) {
    logError('Failed to start Property Price MCP Server', {
      error: error instanceof Error ? error.message : String(error),
      service: 'property-prices-mcp',
    });
    process.exit(1);
  }
}

main();
