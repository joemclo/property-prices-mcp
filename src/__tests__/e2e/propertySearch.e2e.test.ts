/**
 * End-to-end tests for property search functionality.
 * These tests make real API calls to the HM Land Registry SPARQL endpoint.
 *
 * NOTE: These tests are skipped by default in CI environments.
 * Run them explicitly with: npm run test:e2e
 *
 * These tests may fail in sandboxed environments where external HTTP requests are blocked.
 */

import { searchProperties } from '../../services/sparqlService.js';

const LAND_REGISTRY_ENDPOINT = 'https://landregistry.data.gov.uk/landregistry/query';

// Skip these tests if running in CI or sandboxed environment
const runE2ETests = process.env.RUN_E2E_TESTS === 'true';
const describeE2E = runE2ETests ? describe : describe.skip;

describeE2E('Property Search E2E Tests', () => {
  // Increase timeout for real API calls
  jest.setTimeout(30000);

  describe('Postcode search', () => {
    it('should find properties by postcode', async () => {
      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, {
        postcode: 'PL6 8RU',
        limit: 10,
      });

      expect(result.properties).toBeDefined();
      expect(result.properties.length).toBeGreaterThan(0);
      expect(result.properties.every(p => p.street === 'PATTINSON DRIVE')).toBe(true);
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe('Street and city search', () => {
    it('should find properties by street and city', async () => {
      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, {
        street: 'CARLTON ROAD',
        city: 'LONDON',
        limit: 10,
      });

      expect(result.properties).toBeDefined();
      expect(result.properties.length).toBeGreaterThan(0);
    });
  });

  describe('Filtering', () => {
    it('should filter by property type', async () => {
      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, {
        street: 'CARLTON ROAD',
        city: 'LONDON',
        propertyType: 'flat',
        limit: 10,
      });

      expect(result.properties).toBeDefined();
      if (result.properties.length > 0) {
        expect(result.properties.every(p => p.propertyType === 'flat')).toBe(true);
      }
    });

    it('should filter by price range', async () => {
      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, {
        street: 'CARLTON ROAD',
        city: 'LONDON',
        minPrice: 300000,
        maxPrice: 500000,
        limit: 10,
      });

      expect(result.properties).toBeDefined();
      if (result.properties.length > 0) {
        expect(result.properties.every(p => p.price >= 300000 && p.price <= 500000)).toBe(true);
      }
    });

    it('should filter by date range', async () => {
      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, {
        street: 'CARLTON ROAD',
        city: 'LONDON',
        fromDate: '2023-01-01',
        toDate: '2023-12-31',
        limit: 10,
      });

      expect(result.properties).toBeDefined();
      if (result.properties.length > 0) {
        expect(
          result.properties.every(p => {
            const date = new Date(p.date);
            return date >= new Date('2023-01-01') && date <= new Date('2023-12-31');
          })
        ).toBe(true);
      }
    });
  });

  describe('Sorting', () => {
    it('should sort by price descending', async () => {
      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, {
        street: 'CARLTON ROAD',
        city: 'LONDON',
        sortBy: 'price',
        sortOrder: 'desc',
        limit: 10,
      });

      expect(result.properties).toBeDefined();
      if (result.properties.length > 1) {
        const prices = result.properties.map(p => p.price);
        const sortedPrices = [...prices].sort((a, b) => b - a);
        expect(prices).toEqual(sortedPrices);
      }
    });
  });

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, {
        street: 'CARLTON ROAD',
        city: 'LONDON',
        limit: 5,
        offset: 0,
      });

      expect(result.properties).toBeDefined();
      expect(result.properties.length).toBeLessThanOrEqual(5);
      expect(result.limit).toBe(5);
      expect(result.offset).toBe(0);
    });

    it('should handle offset parameter', async () => {
      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, {
        street: 'CARLTON ROAD',
        city: 'LONDON',
        limit: 5,
        offset: 5,
      });

      expect(result.properties).toBeDefined();
      expect(result.limit).toBe(5);
      expect(result.offset).toBe(5);
    });
  });

  describe('Combined filters', () => {
    it('should handle multiple filters simultaneously', async () => {
      const result = await searchProperties(LAND_REGISTRY_ENDPOINT, {
        street: 'CARLTON ROAD',
        city: 'LONDON',
        propertyType: 'flat',
        minPrice: 300000,
        maxPrice: 500000,
        fromDate: '2023-01-01',
        sortBy: 'price',
        sortOrder: 'desc',
        limit: 5,
      });

      expect(result.properties).toBeDefined();
      if (result.properties.length > 0) {
        expect(
          result.properties.every(
            p =>
              p.propertyType === 'flat' &&
              p.price >= 300000 &&
              p.price <= 500000 &&
              new Date(p.date) >= new Date('2023-01-01')
          )
        ).toBe(true);
      }
    });
  });
});
