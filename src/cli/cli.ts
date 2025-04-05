import { searchProperties } from '../services/sparqlService.js';

const LAND_REGISTRY_ENDPOINT = 'https://landregistry.data.gov.uk/landregistry/query';

async function main() {
  const postcode = process.argv[2];
  if (!postcode) {
    console.error('Please provide a postcode as an argument');
    console.error('Usage: node dist/cli.js <postcode>');
    process.exit(1);
  }

  console.log(`Searching for properties in postcode: ${postcode}`);

  try {
    const result = await searchProperties(LAND_REGISTRY_ENDPOINT, {
      postcode,
      limit: 10,
      offset: 0,
      sortBy: 'date',
      sortOrder: 'desc',
    });

    console.log('Search results:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response: Response }).response;
      if (response && response.text) {
        console.error('Response:', await response.text());
      }
    }
  }
}

main().catch(console.error);
