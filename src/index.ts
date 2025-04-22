#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { searchProperties } from './services/sparqlService.js';
import { logInfo, logError, logMcpRequest, logMcpResponse, logMcpError } from './utils/logger.js';

const LAND_REGISTRY_ENDPOINT = 'https://landregistry.data.gov.uk/landregistry/query';

const server = new McpServer({
  name: 'property-prices-mcp',
  version: '1.0.0',
});

// Configure the property prices search tool
server.tool(
  'search-property-prices',
  {
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
  },
  async params => {
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
