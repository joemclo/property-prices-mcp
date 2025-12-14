import { jest } from '@jest/globals';
import { searchProperties, querySparql, parsePropertyPrice } from '../../services/sparqlService.js';
import { SearchParams } from '../../models/types.js';

describe('sparqlService', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/sparql-results+json',
          'Content-Length': '1000',
        }),
        json: () =>
          Promise.resolve({
            results: {
              bindings: [
                {
                  amount: { value: '500000' },
                  date: { value: '2024-01-01' },
                  postcode: { value: 'SW1A 1AA' },
                  propertyType: {
                    value: 'http://landregistry.data.gov.uk/def/common/flat-maisonette',
                  },
                  street: { value: 'Test Street' },
                  town: { value: 'LONDON' },
                  paon: { value: '10' },
                  saon: { value: 'Apt 2' },
                },
              ],
            },
          }),
      })
    );
    (global as any).fetch = mockFetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete (global as any).fetch;
  });

  describe('querySparql', () => {
    it('should make a successful SPARQL query', async () => {
      const endpoint = 'https://example.com/sparql';
      const query = 'SELECT * WHERE { ?s ?p ?o }';
      const result = await querySparql(endpoint, query);

      expect(mockFetch).toHaveBeenCalledWith(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/sparql-results+json',
        },
        body: 'query=SELECT+*+WHERE+%7B+%3Fs+%3Fp+%3Fo+%7D',
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        amount: { value: '500000' },
        date: { value: '2024-01-01' },
        postcode: { value: 'SW1A 1AA' },
        propertyType: { value: 'http://landregistry.data.gov.uk/def/common/flat-maisonette' },
        street: { value: 'Test Street' },
        town: { value: 'LONDON' },
        paon: { value: '10' },
        saon: { value: 'Apt 2' },
      });
    });

    it('should handle query errors', async () => {
      const endpoint = 'https://example.com/sparql';
      const query = 'SELECT * WHERE { ?s ?p ?o }';
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve('Invalid query'),
          headers: new Headers(),
        })
      );

      await expect(querySparql(endpoint, query)).rejects.toThrow('HTTP error 400: Invalid query');
    });
  });

  describe('parsePropertyPrice', () => {
    it('should parse a valid binding', () => {
      const binding = {
        amount: { value: '500000' },
        date: { value: '2024-01-01' },
        postcode: { value: 'SW1A 1AA' },
        propertyType: { value: 'http://landregistry.data.gov.uk/def/common/flat-maisonette' },
        street: { value: 'Test Street' },
        town: { value: 'LONDON' },
        paon: { value: '10' },
        saon: { value: 'Apt 2' },
      };

      const result = parsePropertyPrice(binding);
      expect(result).toEqual({
        price: 500000,
        date: '2024-01-01',
        postcode: 'SW1A 1AA',
        propertyType: 'flat',
        street: 'Test Street',
        city: 'LONDON',
        paon: '10',
        saon: 'Apt 2',
      });
    });

    it('should throw error for invalid binding', () => {
      const binding = {
        amount: { value: '500000' },
        // Missing required fields
      };

      expect(() => parsePropertyPrice(binding)).toThrow(
        'Missing required property data in SPARQL response'
      );
    });
  });

  describe('searchProperties', () => {
    const validEndpoint = 'http://example.com/sparql';
    const validParams = {
      postcode: 'SW1A 1AA',
    };

    it('should throw error for invalid endpoint URL', async () => {
      await expect(searchProperties('invalid-url', validParams)).rejects.toThrow(
        'Invalid endpoint URL'
      );
    });

    it('should throw error when neither postcode nor street/city provided', async () => {
      await expect(searchProperties(validEndpoint, {})).rejects.toThrow(
        'Either postcode or street and city must be provided'
      );
    });

    it('should throw error when only street is provided without city', async () => {
      await expect(searchProperties(validEndpoint, { street: 'High Street' })).rejects.toThrow(
        'Either postcode or street and city must be provided'
      );
    });

    it('should throw error for negative minPrice', async () => {
      await expect(
        searchProperties(validEndpoint, { ...validParams, minPrice: -100 })
      ).rejects.toThrow('minPrice must be non-negative');
    });

    it('should throw error for negative maxPrice', async () => {
      await expect(
        searchProperties(validEndpoint, { ...validParams, maxPrice: -100 })
      ).rejects.toThrow('maxPrice must be non-negative');
    });

    it('should throw error when minPrice is greater than maxPrice', async () => {
      await expect(
        searchProperties(validEndpoint, { ...validParams, minPrice: 200000, maxPrice: 100000 })
      ).rejects.toThrow('minPrice cannot be greater than maxPrice');
    });

    it('should throw error for negative offset', async () => {
      await expect(searchProperties(validEndpoint, { ...validParams, offset: -1 })).rejects.toThrow(
        'offset must be non-negative'
      );
    });

    it('should throw error for non-positive limit', async () => {
      await expect(searchProperties(validEndpoint, { ...validParams, limit: 0 })).rejects.toThrow(
        'limit must be positive'
      );
    });

    it('should execute a complete search', async () => {
      const endpoint = 'https://example.com/sparql';
      const params: SearchParams = {
        postcode: 'SW1A 1AA',
        limit: 10,
        offset: 0,
      };

      const result = await searchProperties(endpoint, params);

      expect(result.properties).toHaveLength(1);
      expect(result.properties[0]).toEqual({
        price: 500000,
        date: '2024-01-01',
        postcode: 'SW1A 1AA',
        propertyType: 'flat',
        street: 'Test Street',
        city: 'LONDON',
        paon: '10',
        saon: 'Apt 2',
      });
      expect(result.total).toBe(1);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(10);
    });
  });
});
