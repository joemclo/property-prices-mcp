import 'isomorphic-fetch';
import { SearchParams, SearchResponse, PropertyPrice, PropertyType } from '../models/types.js';
import { getPostcodeQuery, getAddressQuery, addDateFilters } from '../queries/queries.js';

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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/sparql-results+json',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as SparqlResponse;
  return data.results.bindings;
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
    console.warn(`Unknown property type URI: ${propertyTypeUri}, defaulting to 'other'`);
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

  let query: string;

  if (params.postcode) {
    query = getPostcodeQuery(params.postcode);
  } else {
    query = getAddressQuery(params.street!, params.city!);
  }

  // Add date filters if provided
  if (params.fromDate || params.toDate) {
    query = addDateFilters(query, params.fromDate, params.toDate);
  }

  const results = await querySparql(endpoint, query);
  const properties = results.map(parsePropertyPrice);

  // Apply price filters in memory since they're not part of the base query
  let filteredProperties = properties;
  if (params.minPrice !== undefined) {
    filteredProperties = filteredProperties.filter(p => p.price >= params.minPrice!);
  }
  if (params.maxPrice !== undefined) {
    filteredProperties = filteredProperties.filter(p => p.price <= params.maxPrice!);
  }
  if (params.propertyType) {
    filteredProperties = filteredProperties.filter(
      p => p.propertyType.toLowerCase() === params.propertyType!.toLowerCase()
    );
  }

  // Apply sorting
  if (params.sortBy) {
    const sortField = params.sortBy === 'price' ? 'price' : 'date';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    filteredProperties.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * sortOrder;
      if (a[sortField] > b[sortField]) return 1 * sortOrder;
      return 0;
    });
  }

  // Apply pagination
  const offset = params.offset || 0;
  const limit = params.limit || 10;
  const paginatedProperties = filteredProperties.slice(offset, offset + limit);

  return {
    properties: paginatedProperties,
    total: filteredProperties.length,
    offset,
    limit,
  };
}
