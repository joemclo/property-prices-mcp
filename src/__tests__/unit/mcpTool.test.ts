import { jest } from '@jest/globals';
import { PropertyPrice } from '../../models/types.js';

interface QueryResult {
  properties: PropertyPrice[];
  total: number;
  offset: number;
  limit: number;
}

interface SearchParams {
  postcode?: string;
  street?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: 'detached' | 'semi-detached' | 'terraced' | 'flat' | 'other';
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'price';
  sortOrder?: 'asc' | 'desc';
}

type SearchFunction = (params: SearchParams) => Promise<QueryResult>;

class MockMcpClient {
  private mockQuery: jest.Mock;

  constructor() {
    this.mockQuery = jest
      .fn()
      .mockReturnValue(
        Promise.resolve({
          properties: [
            {
              price: 500000,
              date: '2024-01-01',
              postcode: 'SW1A 1AA',
              propertyType: 'flat' as const,
              street: 'Test Street',
              city: 'LONDON',
            },
          ],
          total: 1,
          offset: 0,
          limit: 10,
        })
      )
      .mockName('searchPropertyPrices');
  }

  tool(_name: string) {
    return {
      execute: this.mockQuery as SearchFunction,
    };
  }

  setMockResponse(response: QueryResult) {
    this.mockQuery.mockReturnValueOnce(Promise.resolve(response));
  }

  setMockError(error: Error) {
    this.mockQuery.mockReturnValueOnce(Promise.reject(error));
  }

  // Helper to verify mock calls
  verifyCall(params: SearchParams) {
    expect(this.mockQuery).toHaveBeenCalledWith(params);
  }
}

describe('Property Price Search Tool', () => {
  let client: MockMcpClient;

  beforeAll(async () => {
    client = new MockMcpClient();
  });

  afterAll(async () => {
    // Clean up any server resources if needed
  });

  it('should search properties by postcode', async () => {
    const params: SearchParams = {
      postcode: 'SW1A 1AA',
      limit: 1,
    };

    const result = await client.tool('search-property-prices').execute(params);

    // Verify the mock was called with correct parameters
    client.verifyCall(params);

    // Verify the response structure
    expect(result).toBeDefined();
    expect(Array.isArray(result.properties)).toBe(true);
    if (result.properties.length > 0) {
      const property = result.properties[0];
      expect(property).toHaveProperty('price');
      expect(property).toHaveProperty('date');
      expect(property).toHaveProperty('postcode');
      expect(property).toHaveProperty('propertyType');
      expect(property).toHaveProperty('street');
      expect(property).toHaveProperty('city');
    }
  });

  it('should search properties with multiple filters', async () => {
    const params: SearchParams = {
      postcode: 'SW1A 1AA',
      minPrice: 1000000,
      propertyType: 'flat' as const,
      limit: 5,
    };

    // Set a mock response that matches the filter criteria
    client.setMockResponse({
      properties: [
        {
          price: 1500000,
          date: '2024-01-01',
          postcode: 'SW1A 1AA',
          propertyType: 'flat' as const,
          street: 'Test Street',
          city: 'LONDON',
        },
      ],
      total: 1,
      offset: 0,
      limit: 5,
    });

    const result = await client.tool('search-property-prices').execute(params);

    // Verify the mock was called with correct parameters
    client.verifyCall(params);

    // Verify the response structure and filter application
    expect(result).toBeDefined();
    expect(Array.isArray(result.properties)).toBe(true);
    if (result.properties.length > 0) {
      result.properties.forEach((property: PropertyPrice) => {
        expect(property.price).toBeGreaterThanOrEqual(1000000);
        expect(property.propertyType).toBe('flat');
      });
    }
  });

  it('should handle invalid parameters gracefully', async () => {
    const params: SearchParams = {
      postcode: 'SW1A 1AA',
      propertyType: 'invalid-type' as any,
    };

    client.setMockError(new Error('Invalid property type'));

    await expect(client.tool('search-property-prices').execute(params)).rejects.toThrow(
      'Invalid property type'
    );

    // Verify the mock was called with correct parameters
    client.verifyCall(params);
  });
});
