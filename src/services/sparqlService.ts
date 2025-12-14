import { SearchParams, SearchResponse, PropertyPrice, PropertyType } from '../models/types.js';
import { getPostcodeQuery, getAddressQuery, addDateFilters } from '../queries/queries.js';
import { logSparqlRequest, logSparqlResponse, logSparqlError, logInfo, logWarn } from '../utils/logger.js';

interface SparqlBinding {
  amount?: { value: string };
  date?: { value: string };
  postcode?: { value: string };
  propertyType?: { value: string };
  street?: { value: string };
  town?: { value: string };
  county?: { value: string };
  paon?: { value: string };
  saon?: { value: string };
  category?: { value: string };
  estateType?: { value: string };
  newBuild?: { value: string };
  count?: { value: string };
}

interface SparqlResponse {
  results: {
    bindings: SparqlBinding[];
  };
}

export async function querySparql(endpoint: string, query: string): Promise<SparqlBinding[]> {
  const params = new URLSearchParams();
  params.append('query', query);
  const body = params.toString();

  const startTime = Date.now();
  let responseStatus = 0;
  let responseTime = 0;

  try {
    // Log the SPARQL request
    logSparqlRequest('SPARQL request sent', {
      endpoint,
      query,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/sparql-results+json',
      },
      body,
    });

    responseStatus = response.status;
    responseTime = Date.now() - startTime;

    if (!response.ok) {
      const text = await response.text();
      const errorMessage = `HTTP error ${response.status}: ${text}`;

      // Log the error
      logSparqlError('SPARQL request failed', {
        endpoint,
        query,
        responseStatus,
        responseTime,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }

    const data = (await response.json()) as SparqlResponse;

    // Extract a sample binding for logging purposes
    const sampleBinding = data.results.bindings.length > 0 ? data.results.bindings[0] : null;

    // Log the successful response with sample data
    logSparqlResponse('SPARQL response received', {
      endpoint,
      query,
      responseStatus,
      responseTime,
      resultCount: data.results.bindings.length,
      sampleRawData: sampleBinding ? JSON.stringify(sampleBinding) : 'No results',
    });

    return data.results.bindings;
  } catch (error) {
    responseTime = Date.now() - startTime;

    // Log any other errors that might occur
    logSparqlError('SPARQL request failed with exception', {
      endpoint,
      query,
      responseStatus,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

function mapPropertyType(propertyTypeUri: string): PropertyType {
  const uriToType: Record<string, PropertyType> = {
    'http://landregistry.data.gov.uk/def/common/detached': 'detached',
    'http://landregistry.data.gov.uk/def/common/semi-detached': 'semi-detached',
    'http://landregistry.data.gov.uk/def/common/terraced': 'terraced',
    'http://landregistry.data.gov.uk/def/common/flat-maisonette': 'flat',
  };

  const mappedType = uriToType[propertyTypeUri];
  if (!mappedType) {
    logWarn('Unknown property type URI, defaulting to "other"', { propertyTypeUri });
  }
  return mappedType || 'other';
}

export function parsePropertyPrice(binding: SparqlBinding): PropertyPrice {
  if (!binding.amount || !binding.date || !binding.propertyType) {
    throw new Error('Missing required property data in SPARQL response');
  }

  return {
    price: parseInt(binding.amount.value),
    date: binding.date.value,
    postcode: binding.postcode?.value || '',
    propertyType: mapPropertyType(binding.propertyType.value),
    street: binding.street?.value || '',
    city: binding.town?.value || '',
  };
}

export async function searchProperties(
  endpoint: string,
  params: SearchParams
): Promise<SearchResponse> {
  // Validate endpoint
  if (!endpoint || !endpoint.startsWith('http')) {
    throw new Error('Invalid endpoint URL');
  }

  // Validate required parameters
  if (!params.postcode && (!params.street || !params.city)) {
    throw new Error('Either postcode or street and city must be provided');
  }

  // Validate numeric parameters
  if (params.minPrice !== undefined && params.minPrice < 0) {
    throw new Error('minPrice must be non-negative');
  }
  if (params.maxPrice !== undefined && params.maxPrice < 0) {
    throw new Error('maxPrice must be non-negative');
  }
  if (
    params.minPrice !== undefined &&
    params.maxPrice !== undefined &&
    params.minPrice > params.maxPrice
  ) {
    throw new Error('minPrice cannot be greater than maxPrice');
  }

  // Validate pagination parameters
  if (params.offset !== undefined && params.offset < 0) {
    throw new Error('offset must be non-negative');
  }
  if (params.limit !== undefined && params.limit <= 0) {
    throw new Error('limit must be positive');
  }

  // Normalize street and city to uppercase for SPARQL queries
  // (Land Registry data appears to be case-sensitive)
  const normalizedParams = { ...params };
  if (normalizedParams.street) {
    normalizedParams.street = normalizedParams.street.toUpperCase();
  }
  if (normalizedParams.city) {
    normalizedParams.city = normalizedParams.city.toUpperCase();
  }

  let query: string;

  if (normalizedParams.postcode) {
    query = getPostcodeQuery(normalizedParams.postcode);
  } else {
    query = getAddressQuery(normalizedParams.street!, normalizedParams.city!);
  }

  // Add date filters if provided
  if (normalizedParams.fromDate || normalizedParams.toDate) {
    query = addDateFilters(query, normalizedParams.fromDate, normalizedParams.toDate);
  }

  const results = await querySparql(endpoint, query);
  const properties = results.map(parsePropertyPrice);

  // Log a sample of the parsed properties to diagnose street/city issues
  if (properties.length > 0) {
    logInfo('Sample parsed property data', {
      searchType: normalizedParams.postcode ? 'postcode' : 'street/city',
      searchParams: {
        postcode: normalizedParams.postcode,
        street: normalizedParams.street,
        city: normalizedParams.city,
      },
      firstProperty: {
        price: properties[0].price,
        date: properties[0].date,
        postcode: properties[0].postcode,
        propertyType: properties[0].propertyType,
        street: properties[0].street,
        city: properties[0].city,
      },
    });
  }

  // Apply price filters in memory since they're not part of the base query
  let filteredProperties = properties;
  if (normalizedParams.minPrice !== undefined) {
    filteredProperties = filteredProperties.filter(p => p.price >= normalizedParams.minPrice!);
  }
  if (normalizedParams.maxPrice !== undefined) {
    filteredProperties = filteredProperties.filter(p => p.price <= normalizedParams.maxPrice!);
  }
  if (normalizedParams.propertyType) {
    filteredProperties = filteredProperties.filter(
      p => p.propertyType.toLowerCase() === normalizedParams.propertyType!.toLowerCase()
    );
  }

  // Apply sorting
  if (normalizedParams.sortBy) {
    const sortField = normalizedParams.sortBy === 'price' ? 'price' : 'date';
    const sortOrder = normalizedParams.sortOrder === 'asc' ? 1 : -1;
    filteredProperties.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * sortOrder;
      if (a[sortField] > b[sortField]) return 1 * sortOrder;
      return 0;
    });
  }

  // Apply pagination
  const offset = normalizedParams.offset || 0;
  const limit = normalizedParams.limit || 10;
  const paginatedProperties = filteredProperties.slice(offset, offset + limit);

  return {
    properties: paginatedProperties,
    total: filteredProperties.length,
    offset,
    limit,
  };
}
