import { searchProperties } from './services/sparqlService.js';
import { SearchParams, SearchResponse } from './models/types.js';

const LAND_REGISTRY_ENDPOINT = 'https://landregistry.data.gov.uk/landregistry/query';

interface TestCase {
  name: string;
  params: SearchParams;
  validate: (result: SearchResponse) => string[];
  debug?: boolean;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Basic postcode search',
    params: {
      postcode: 'PL6 8RU',
      limit: 10,
    },
    validate: result => {
      const errors = [];
      if (!result.properties || result.properties.length === 0) {
        errors.push('No properties found');
      }
      if (!result.properties?.every(p => p.street === 'PATTINSON DRIVE')) {
        errors.push('Not all properties are on Pattinson Drive');
      }
      return errors;
    },
  },
  {
    name: 'Street and city search',
    params: {
      street: 'CARLTON ROAD',
      city: 'LONDON',
      limit: 10,
    },
    validate: result => {
      const errors = [];
      if (!result.properties || result.properties.length === 0) {
        errors.push('No properties found');
      }
      return errors;
    },
  },
  {
    name: 'Property type filter (flats)',
    params: {
      street: 'CARLTON ROAD',
      city: 'LONDON',
      propertyType: 'flat',
      limit: 10,
    },
    validate: result => {
      const errors = [];
      if (!result.properties?.every(p => p.propertyType === 'flat')) {
        errors.push('Non-flat properties found in results');
      }
      return errors;
    },
  },
  {
    name: 'Price range filter',
    params: {
      street: 'CARLTON ROAD',
      city: 'LONDON',
      minPrice: 300000,
      maxPrice: 500000,
      limit: 10,
    },
    validate: result => {
      const errors = [];
      if (!result.properties?.every(p => p.price >= 300000 && p.price <= 500000)) {
        errors.push('Properties outside price range found');
      }
      return errors;
    },
  },
  {
    name: 'Date range filter (2023)',
    params: {
      street: 'CARLTON ROAD',
      city: 'LONDON',
      fromDate: '2023-01-01',
      toDate: '2023-12-31',
      limit: 10,
    },
    validate: result => {
      const errors = [];
      if (
        !result.properties?.every(p => {
          const date = new Date(p.date);
          console.log('Property date:', p.date, 'parsed as:', date);
          return date >= new Date('2023-01-01') && date <= new Date('2023-12-31');
        })
      ) {
        errors.push('Properties outside date range found');
      }
      return errors;
    },
    debug: true,
  },
  {
    name: 'Sort by price descending',
    params: {
      street: 'CARLTON ROAD',
      city: 'LONDON',
      sortBy: 'price',
      sortOrder: 'desc',
      limit: 10,
    },
    validate: result => {
      const errors = [];
      const prices = result.properties?.map(p => p.price);
      const sortedPrices = [...prices].sort((a, b) => b - a);
      if (JSON.stringify(prices) !== JSON.stringify(sortedPrices)) {
        errors.push('Results not properly sorted by price descending');
      }
      return errors;
    },
  },
  {
    name: 'Pagination',
    params: {
      street: 'CARLTON ROAD',
      city: 'LONDON',
      limit: 5,
      offset: 5,
    },
    validate: result => {
      const errors = [];
      if (result.properties?.length > 5) {
        errors.push('More results than limit returned');
      }
      return errors;
    },
  },
  {
    name: 'Combined filters',
    params: {
      street: 'CARLTON ROAD',
      city: 'LONDON',
      propertyType: 'flat',
      minPrice: 300000,
      maxPrice: 500000,
      fromDate: '2023-01-01',
      sortBy: 'price',
      sortOrder: 'desc',
      limit: 5,
    },
    validate: result => {
      const errors = [];
      if (
        !result.properties?.every(
          p =>
            p.propertyType === 'flat' &&
            p.price >= 300000 &&
            p.price <= 500000 &&
            new Date(p.date) >= new Date('2023-01-01')
        )
      ) {
        errors.push("Properties found that don't match all filters");
      }
      return errors;
    },
  },
];

async function runTests() {
  console.log('Starting MCP test suite...\n');
  let passCount = 0;
  let failCount = 0;

  for (const testCase of TEST_CASES) {
    try {
      console.log(`Running test: ${testCase.name}`);
      console.log('Parameters:', JSON.stringify(testCase.params, null, 2));

      // Add debug logging for the SPARQL query if debug is enabled
      const originalFetch = global.fetch;
      if (testCase.debug) {
        global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          if (typeof input === 'string' && init?.body) {
            console.log('\nSPARQL Query:');
            const params = new URLSearchParams(init.body.toString());
            console.log(decodeURIComponent(params.get('query') || ''));
            console.log('\nFull request URL:', input);
            console.log('Request body:', init.body);
          }
          return originalFetch(input, init);
        };
      }

      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, testCase.params);

      // Restore original fetch if we modified it
      if (testCase.debug) {
        global.fetch = originalFetch;
      }

      console.log('Found', result.properties.length, 'properties out of', result.total, 'total');
      if (testCase.debug) {
        console.log('\nFirst result:', JSON.stringify(result.properties[0], null, 2));
      }

      const errors = testCase.validate(result);

      if (errors.length === 0) {
        console.log('✅ Test passed\n');
        passCount++;
      } else {
        console.log('❌ Test failed:');
        errors.forEach(error => console.log(`   - ${error}`));
        console.log();
        failCount++;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('❌ Test failed with error:', message);
      console.log();
      failCount++;
    }
  }

  console.log('Test suite complete!');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${TEST_CASES.length}`);
}

runTests().catch(console.error);
