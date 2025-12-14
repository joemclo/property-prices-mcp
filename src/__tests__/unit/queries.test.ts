import { getPostcodeQuery, getAddressQuery, addDateFilters } from '../../queries/queries.js';

describe('queries', () => {
  describe('getPostcodeQuery', () => {
    it('should generate a valid SPARQL query for postcode search', () => {
      const query = getPostcodeQuery('PL6 8RU');

      // Check essential parts of the query
      expect(query).toContain('PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>');
      expect(query).toContain('PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>');
      expect(query).toContain(
        'SELECT ?amount ?date ?paon ?saon ?street ?town ?county ?postcode ?propertyType ?estateType ?newBuild ?category'
      );
      expect(query).toContain('VALUES ?postcode {"PL6 8RU"^^xsd:string}');
      expect(query).toContain('ORDER BY DESC(?date)');
      expect(query).toContain('LIMIT 100');
    });

    it('should escape special characters in postcode', () => {
      const query = getPostcodeQuery('PL6 8RU"');
      expect(query).toContain('VALUES ?postcode {"PL6 8RU\\""^^xsd:string}');
    });
  });

  describe('getAddressQuery', () => {
    it('should generate a valid SPARQL query for street and city search', () => {
      const query = getAddressQuery('charlton ROAD', 'HARROW');

      // Check essential parts of the query
      expect(query).toContain('PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>');
      expect(query).toContain('PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>');
      expect(query).toContain(
        'SELECT ?paon ?saon ?street ?town ?county ?postcode ?amount ?date ?category ?propertyType ?estateType ?newBuild'
      );
      expect(query).toContain('VALUES ?street {"charlton ROAD"^^xsd:string}');
      expect(query).toContain('VALUES ?town {"HARROW"^^xsd:string}');
      expect(query).toContain('ORDER BY DESC(?date)');
      expect(query).toContain('LIMIT 100');
    });

    it('should include house number when provided', () => {
      const query = getAddressQuery('charlton ROAD', 'HARROW', '123');
      expect(query).toContain('lrcommon:paon "123"^^xsd:string');
    });

    it('should include postcode when provided', () => {
      const query = getAddressQuery('charlton ROAD', 'HARROW', undefined, 'gh5 9UX');
      expect(query).toContain('lrcommon:postcode "gh5 9UX"^^xsd:string');
    });

    it('should escape special characters in address fields', () => {
      const query = getAddressQuery('charlton "ROAD"', 'HARROW');
      expect(query).toContain('VALUES ?street {"charlton \\"ROAD\\""^^xsd:string}');
    });
  });

  describe('addDateFilters', () => {
    const baseQuery = `
      SELECT ?amount ?date
      WHERE {
        ?transx lrppi:pricePaid ?amount ;
                lrppi:transactionDate ?date .
      }
      ORDER BY DESC(?date)
    `;

    it('should add start date filter', () => {
      const query = addDateFilters(baseQuery, '2023-01-01', undefined);
      expect(query).toContain('FILTER(?date >= "2023-01-01"^^xsd:date)');
      expect(query).not.toContain('FILTER(?date <= ');
    });

    it('should add end date filter', () => {
      const query = addDateFilters(baseQuery, undefined, '2023-12-31');
      expect(query).toContain('FILTER(?date <= "2023-12-31"^^xsd:date)');
      expect(query).not.toContain('FILTER(?date >= ');
    });

    it('should add both start and end date filters', () => {
      const query = addDateFilters(baseQuery, '2023-01-01', '2023-12-31');
      expect(query).toContain('FILTER(?date >= "2023-01-01"^^xsd:date)');
      expect(query).toContain('FILTER(?date <= "2023-12-31"^^xsd:date)');
    });

    it('should preserve original query structure', () => {
      const query = addDateFilters(baseQuery, '2023-01-01', '2023-12-31');
      expect(query).toContain('SELECT ?amount ?date');
      expect(query).toContain('ORDER BY DESC(?date)');
    });

    it('should return original query when no dates provided', () => {
      const query = addDateFilters(baseQuery, undefined, undefined);
      expect(query).toBe(baseQuery);
    });

    it('should handle malformed queries gracefully', () => {
      const malformedQuery = 'SELECT * WHERE { ?s ?p ?o }'; // No ORDER BY
      const query = addDateFilters(malformedQuery, '2023-01-01', '2023-12-31');
      expect(query).toBe(malformedQuery); // Should return original query unchanged
    });
  });
});
