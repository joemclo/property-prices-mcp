# RDF to TypeScript Integration Plan

This document outlines the step-by-step process for implementing TypeScript type generation from RDF ontologies, specifically for the Land Registry data sources used in the property-prices-mcp project.

## Overview

The goal is to create a system that can:

1. Fetch RDF schema definitions from URIs like `http://landregistry.data.gov.uk/def/common/`
2. Parse these definitions to understand properties, classes, and relationships
3. Generate TypeScript interfaces and types from them
4. Integrate with our SPARQL query generation process to provide type safety

## Prerequisites

- Node.js v14+
- TypeScript v4.5+
- npm or yarn package manager

## Step 1: Install Required Dependencies

```bash
# Core RDF libraries
npm install @rdfjs/data-model rdf-js @rdfjs/types

# RDF fetching and parsing
npm install @rdfjs/fetch-lite @rdfjs/formats-common

# SPARQL utilities
npm install sparqljs

# Optional: RDFJS query engine and utilities
npm install rdf-sparql-builder
```

## Step 2: Create the Type Generation Script

Create a new file `scripts/generate-rdf-types.ts`:

```typescript
import { rdfFetch } from '@rdfjs/fetch-lite';
import * as fs from 'fs';
import * as path from 'path';
import * as N3 from 'n3';
import '@rdfjs/formats-common';

// Ontology URLs we want to process
const ONTOLOGY_URLS = [
  'http://landregistry.data.gov.uk/def/common/',
  'http://landregistry.data.gov.uk/def/ppi/',
];

// Predicates we're interested in for generating types
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
const RDFS_COMMENT = 'http://www.w3.org/2000/01/rdf-schema#comment';
const RDFS_DOMAIN = 'http://www.w3.org/2000/01/rdf-schema#domain';
const RDFS_RANGE = 'http://www.w3.org/2000/01/rdf-schema#range';

async function fetchOntology(url: string): Promise<N3.Store> {
  console.log(`Fetching ontology from ${url}...`);
  const response = await rdfFetch(url);
  const dataset = await response.dataset();

  // Convert to N3.Store for easier querying
  const store = new N3.Store();
  for (const quad of dataset) {
    store.add(quad);
  }

  return store;
}

function extractNamespace(url: string): string {
  // Extract the namespace prefix from the URL
  const parts = url.split('/');
  const name = parts[parts.length - 2] || parts[parts.length - 3];
  return name.toLowerCase();
}

function typeMap(rdfType: string): string {
  // Map RDF types to TypeScript types
  const map: Record<string, string> = {
    'http://www.w3.org/2001/XMLSchema#string': 'string',
    'http://www.w3.org/2001/XMLSchema#integer': 'number',
    'http://www.w3.org/2001/XMLSchema#decimal': 'number',
    'http://www.w3.org/2001/XMLSchema#float': 'number',
    'http://www.w3.org/2001/XMLSchema#double': 'number',
    'http://www.w3.org/2001/XMLSchema#boolean': 'boolean',
    'http://www.w3.org/2001/XMLSchema#date': 'Date',
    'http://www.w3.org/2001/XMLSchema#dateTime': 'Date',
  };

  return map[rdfType] || 'any';
}

function generateInterfaceName(uri: string): string {
  const name = uri.split(/[/#]/).pop() || '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function generateTypeScript(store: N3.Store, namespace: string): string {
  let output = `// Generated from ${namespace} ontology\n\n`;

  // Find all classes
  const classes = store.getSubjects(RDF_TYPE, 'http://www.w3.org/2002/07/owl#Class', null);

  for (const classNode of classes) {
    if (classNode.termType !== 'NamedNode') continue;

    const className = generateInterfaceName(classNode.value);
    output += `export interface ${className} {\n`;

    // Find properties for this class
    const properties = store.getSubjects(RDFS_DOMAIN, classNode, null);

    for (const property of properties) {
      if (property.termType !== 'NamedNode') continue;

      const propertyName = property.value.split(/[/#]/).pop() || '';
      const labelQuads = store.getQuads(property, RDFS_LABEL, null, null);
      const commentQuads = store.getQuads(property, RDFS_COMMENT, null, null);

      // Add JSDoc
      if (labelQuads.length > 0 || commentQuads.length > 0) {
        output += '  /**\n';
        if (labelQuads.length > 0) {
          output += `   * ${labelQuads[0].object.value}\n`;
        }
        if (commentQuads.length > 0) {
          output += `   * ${commentQuads[0].object.value}\n`;
        }
        output += '   */\n';
      }

      // Determine property type
      let propertyType = 'any';
      const rangeQuads = store.getQuads(property, RDFS_RANGE, null, null);
      if (rangeQuads.length > 0 && rangeQuads[0].object.termType === 'NamedNode') {
        propertyType = typeMap(rangeQuads[0].object.value);
      }

      output += `  ${propertyName}?: ${propertyType};\n`;
    }

    output += '}\n\n';
  }

  // Generate namespace object
  output += `export const ${namespace} = {\n`;

  const predicates = store
    .getSubjects(null, null, null)
    .filter(subject => subject.termType === 'NamedNode');

  for (const predicate of predicates) {
    const name = predicate.value.split(/[/#]/).pop() || '';
    if (name) {
      output += `  ${name}: '${predicate.value}',\n`;
    }
  }

  output += '};\n';

  return output;
}

async function main() {
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'src/types/rdf');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Process each ontology
    for (const url of ONTOLOGY_URLS) {
      const store = await fetchOntology(url);
      const namespace = extractNamespace(url);
      const typeScript = generateTypeScript(store, namespace);

      // Write the TypeScript file
      const outputPath = path.join(outputDir, `${namespace}.ts`);
      fs.writeFileSync(outputPath, typeScript);
      console.log(`Generated types for ${namespace} at ${outputPath}`);
    }

    // Generate index.ts to export all types
    const namespaces = ONTOLOGY_URLS.map(extractNamespace);
    const indexContent =
      namespaces.map(namespace => `export * from './${namespace}';`).join('\n') + '\n';

    fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent);
    console.log('Generated index.ts');

    console.log('RDF type generation complete!');
  } catch (error) {
    console.error('Error generating RDF types:', error);
    process.exit(1);
  }
}

main();
```

## Step 3: Add Script to package.json

Add the script to your package.json:

```json
{
  "scripts": {
    "generate-rdf-types": "ts-node scripts/generate-rdf-types.ts"
  }
}
```

## Step 4: Create Factory Utilities for RDF Terms

Create a file `src/utils/rdf-factory.ts`:

```typescript
import dataFactory from '@rdfjs/data-model';
import namespace from '@rdfjs/namespace';
import { common } from '../types/rdf';
import { ppi } from '../types/rdf';

// Create namespace factories
export const ns = {
  rdf: namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  rdfs: namespace('http://www.w3.org/2000/01/rdf-schema#'),
  xsd: namespace('http://www.w3.org/2001/XMLSchema#'),
  lrcommon: namespace('http://landregistry.data.gov.uk/def/common/'),
  lrppi: namespace('http://landregistry.data.gov.uk/def/ppi/'),
  skos: namespace('http://www.w3.org/2004/02/skos/core#'),
};

// Define helper functions
export const createVariable = (name: string) => dataFactory.variable(name);
export const createLiteral = (value: string, datatype?: string) => {
  if (datatype) {
    return dataFactory.literal(value, dataFactory.namedNode(datatype));
  }
  return dataFactory.literal(value);
};

export const createTypedLiteral = (value: string, datatype: string) => {
  return dataFactory.literal(value, dataFactory.namedNode(datatype));
};

export const createStringLiteral = (value: string) => {
  return createTypedLiteral(value, ns.xsd('string'));
};

export const createDateLiteral = (value: string) => {
  return createTypedLiteral(value, ns.xsd('date'));
};

export const createBlankNode = () => dataFactory.blankNode();
```

## Step 5: Modify Your SPARQL Query Builder

Update your existing query builder in `src/queries/queries.ts` to use the generated types and factories:

```typescript
import { Parser, Generator } from 'sparqljs';
import { ns, createVariable, createStringLiteral, createDateLiteral } from '../utils/rdf-factory';

/**
 * Generate SPARQL query for searching properties by postcode using sparqljs.
 */
export function getPostcodeQueryWithSparqlJs(postcode: string): string {
  // Define variables
  const amount = createVariable('amount');
  const date = createVariable('date');
  const paon = createVariable('paon');
  const saon = createVariable('saon');
  const street = createVariable('street');
  const town = createVariable('town');
  const county = createVariable('county');
  const postcodeVar = createVariable('postcode');
  const propertyType = createVariable('propertyType');
  const estateType = createVariable('estateType');
  const newBuild = createVariable('newBuild');
  const category = createVariable('category');
  const transx = createVariable('transx');
  const addr = createVariable('addr');
  const b0 = createBlankNode();

  // Define the query structure
  const query = {
    type: 'query',
    queryType: 'SELECT',
    prefixes: {
      rdf: ns.rdf('').value,
      rdfs: ns.rdfs('').value,
      xsd: ns.xsd('').value,
      lrppi: ns.lrppi('').value,
      lrcommon: ns.lrcommon('').value,
      skos: ns.skos('').value,
    },
    variables: [
      amount,
      date,
      paon,
      saon,
      street,
      town,
      county,
      postcodeVar,
      propertyType,
      estateType,
      newBuild,
      category,
    ],
    where: [
      {
        type: 'values',
        values: [
          {
            [postcodeVar.value]: createStringLiteral(postcode),
          },
        ],
      },
      {
        type: 'bgp',
        triples: [
          {
            subject: transx,
            predicate: ns.lrppi('propertyAddress'),
            object: addr,
          },
          {
            subject: transx,
            predicate: ns.lrppi('pricePaid'),
            object: amount,
          },
          {
            subject: transx,
            predicate: ns.lrppi('transactionDate'),
            object: date,
          },
          {
            subject: transx,
            predicate: ns.lrppi('propertyType'),
            object: propertyType,
          },
          {
            subject: transx,
            predicate: ns.lrppi('transactionCategory'),
            object: b0,
          },
          {
            subject: b0,
            predicate: ns.skos('prefLabel'),
            object: category,
          },
          {
            subject: addr,
            predicate: ns.lrcommon('postcode'),
            object: postcodeVar,
          },
        ],
      },
      // ... and more for optional patterns
    ],
    limit: 100,
    order: [
      {
        expression: date,
        descending: true,
      },
    ],
  };

  // Generate SPARQL from the JSON object
  const generator = new Generator();
  return generator.stringify(query);
}
```

## Step 6: Create an Alternate Implementation Using rdf-sparql-builder

For a more fluent API, create a helper in `src/queries/builder.ts`:

```typescript
import * as sparql from 'rdf-sparql-builder';
import { ns, createVariable, createStringLiteral } from '../utils/rdf-factory';

export function buildPostcodeQuery(postcode: string): string {
  // Define variables
  const amount = createVariable('amount');
  const date = createVariable('date');
  const paon = createVariable('paon');
  const saon = createVariable('saon');
  const street = createVariable('street');
  const town = createVariable('town');
  const county = createVariable('county');
  const postcodeVar = createVariable('postcode');
  const propertyType = createVariable('propertyType');
  const estateType = createVariable('estateType');
  const newBuild = createVariable('newBuild');
  const category = createVariable('category');
  const transx = createVariable('transx');
  const addr = createVariable('addr');

  // Build query
  const query = sparql
    .select([
      amount,
      date,
      paon,
      saon,
      street,
      town,
      county,
      postcodeVar,
      propertyType,
      estateType,
      newBuild,
      category,
    ])
    .prefix({
      rdf: ns.rdf('').value,
      rdfs: ns.rdfs('').value,
      xsd: ns.xsd('').value,
      lrppi: ns.lrppi('').value,
      lrcommon: ns.lrcommon('').value,
      skos: ns.skos('').value,
    })
    .where([
      // Set the postcode value
      [postcodeVar, sparql.equals, createStringLiteral(postcode)],

      // Main property data
      [transx, ns.lrppi('propertyAddress'), addr],
      [transx, ns.lrppi('pricePaid'), amount],
      [transx, ns.lrppi('transactionDate'), date],
      [transx, ns.lrppi('propertyType'), propertyType],
      [transx, ns.lrppi('transactionCategory'), [ns.skos('prefLabel'), category]],
      [addr, ns.lrcommon('postcode'), postcodeVar],
    ])
    .optional([[addr, ns.lrcommon('paon'), paon]])
    .optional([[addr, ns.lrcommon('saon'), saon]])
    .optional([[addr, ns.lrcommon('street'), street]])
    .optional([[addr, ns.lrcommon('town'), town]])
    .optional([[addr, ns.lrcommon('county'), county]])
    .optional([[transx, ns.lrppi('estateType'), estateType]])
    .optional([[transx, ns.lrppi('newBuild'), newBuild]])
    .limit(100)
    .orderBy(date, 'DESC');

  return query.toString();
}
```

## Step 7: Running the Implementation

1. Run the type generation script:

   ```bash
   npm run generate-rdf-types
   ```

2. Check the generated type files in `src/types/rdf/`

3. Update your main query functions to use the typed implementations.

## Step 8: Testing

Create a test file to validate that the generated SPARQL queries work as expected:

```typescript
import { getPostcodeQueryWithSparqlJs } from '../src/queries/queries';
import { buildPostcodeQuery } from '../src/queries/builder';

describe('SPARQL Query Generation', () => {
  test('should generate postcode query with sparqljs', () => {
    const query = getPostcodeQueryWithSparqlJs('AB10 1AA');
    expect(query).toContain('PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>');
    expect(query).toContain('WHERE');
    expect(query).toContain('VALUES ?postcode { "AB10 1AA"^^xsd:string }');
  });

  test('should generate postcode query with rdf-sparql-builder', () => {
    const query = buildPostcodeQuery('AB10 1AA');
    expect(query).toContain('PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>');
    expect(query).toContain('WHERE');
    expect(query).toContain('?postcode = "AB10 1AA"^^xsd:string');
  });
});
```

## Conclusion

Following these steps will implement a type-safe SPARQL query generation system based on RDF ontologies. The implementation:

1. Automatically generates TypeScript interfaces from RDF ontologies
2. Provides factory functions for creating RDF terms
3. Offers two approaches to building SPARQL queries:
   - Direct JSON construction with sparqljs
   - Fluent API with rdf-sparql-builder
4. Ensures type-safety throughout the query construction process

This approach allows for better maintenance, documentation through types, and reduced errors in SPARQL query construction.
