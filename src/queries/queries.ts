/**
 * SPARQL query definitions for property price data retrieval.
 */

/**
 * Generate SPARQL query for searching properties by postcode.
 */
export function getPostcodeQuery(postcode: string): string {
  return `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX sr: <http://data.ordnancesurvey.co.uk/ontology/spatialrelations/>
    PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
    PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    
    SELECT ?amount ?date ?paon ?saon ?street ?town ?county ?postcode ?propertyType ?estateType ?newBuild ?category
    WHERE {
      ?transx lrppi:propertyAddress ?addr ;
              lrppi:pricePaid ?amount ;
              lrppi:transactionDate ?date ;
              lrppi:propertyType ?propertyType ;
              lrppi:transactionCategory/skos:prefLabel ?category .
              
      ?addr lrcommon:postcode "${postcode.replace(/"/g, '\\"')}" .
      
      OPTIONAL { ?addr lrcommon:paon ?paon }
      OPTIONAL { ?addr lrcommon:saon ?saon }
      OPTIONAL { ?addr lrcommon:street ?street }
      OPTIONAL { ?addr lrcommon:town ?town }
      OPTIONAL { ?addr lrcommon:county ?county }
      OPTIONAL { ?transx lrppi:estateType ?estateType }
      OPTIONAL { ?transx lrppi:newBuild ?newBuild }
    }
    ORDER BY DESC(?date)
    LIMIT 100
  `;
}

/**
 * Add date filter clauses to a SPARQL query.
 */
export function addDateFilters(query: string, startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) {
    return query;
  }

  // Find the position of the closing brace of the WHERE block
  const whereEndIndex = query.lastIndexOf('}');
  const orderByIndex = query.indexOf('ORDER BY');

  if (whereEndIndex === -1 || orderByIndex === -1 || whereEndIndex > orderByIndex) {
    return query;
  }

  // Build the filter clauses
  const filterParts: string[] = [];
  if (startDate) {
    filterParts.push(`      FILTER(?date >= "${startDate}"^^xsd:date)`);
  }
  if (endDate) {
    filterParts.push(`      FILTER(?date <= "${endDate}"^^xsd:date)`);
  }

  // Insert the filters just before the closing brace of the WHERE block
  return (
    query.substring(0, whereEndIndex) +
    '\n' +
    filterParts.join('\n') +
    '\n    ' +
    query.substring(whereEndIndex)
  );
}

/**
 * Generate SPARQL query for searching properties by address details.
 */
export function getAddressQuery(
  streetName: string,
  city: string,
  houseNumber?: string,
  postcode?: string
): string {
  let query = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX sr: <http://data.ordnancesurvey.co.uk/ontology/spatialrelations/>
    PREFIX ukhpi: <http://landregistry.data.gov.uk/def/ukhpi/>
    PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>

    SELECT ?paon ?saon ?street ?town ?county ?postcode ?amount ?date ?category ?propertyType ?estateType ?newBuild
    WHERE
    {
      ?addr lrcommon:street "${streetName.replace(/"/g, '\\"')}"^^xsd:string ;
            lrcommon:town "${city.replace(/"/g, '\\"')}"^^xsd:string .
  `;

  if (houseNumber) {
    query += `      ?addr lrcommon:paon "${houseNumber.replace(/"/g, '\\"')}"^^xsd:string .\n`;
  }

  if (postcode) {
    query += `      ?addr lrcommon:postcode "${postcode.replace(/"/g, '\\"')}"^^xsd:string .\n`;
  }

  query += `
      ?transx lrppi:propertyAddress ?addr ;
              lrppi:pricePaid ?amount ;
              lrppi:transactionDate ?date ;
              lrppi:transactionCategory/skos:prefLabel ?category ;
              lrppi:propertyType ?propertyType .

      OPTIONAL {?addr lrcommon:county ?county}
      OPTIONAL {?addr lrcommon:paon ?paon}
      OPTIONAL {?addr lrcommon:saon ?saon}
      OPTIONAL {?addr lrcommon:postcode ?postcode}
      OPTIONAL {?transx lrppi:estateType ?estateType}
      OPTIONAL {?transx lrppi:newBuild ?newBuild}
    }
    ORDER BY DESC(?date)
    LIMIT 100
  `;

  return query;
}
