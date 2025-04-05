#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { searchProperties } from './services/sparqlService.js';

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
    const result = await searchProperties(LAND_REGISTRY_ENDPOINT, params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('Property Price MCP Server started');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
