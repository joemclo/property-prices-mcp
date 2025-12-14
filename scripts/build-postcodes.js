import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_DIR = path.join(__dirname, '..', 'codepo_gb', 'Data', 'CSV');
const OUTPUT_DB = path.join(__dirname, '..', 'data', 'postcodes.sqlite');

function ensurePaths() {
  if (!fs.existsSync(CSV_DIR)) {
    throw new Error(
      [
        `CSV directory not found: ${CSV_DIR}`,
        ``,
        `To build the postcode database, download Ordnance Survey Code-Point Open and extract it so you have:`,
        `  codepo_gb/Data/CSV/*.csv`,
        ``,
        `Options:`,
        `  - Run: npm run fetch:codepo`,
        `  - Or download manually from:`,
        `    https://api.os.uk/downloads/v1/products/CodePointOpen/downloads?area=GB&format=CSV&redirect`,
      ].join('\n')
    );
  }
  fs.mkdirSync(path.dirname(OUTPUT_DB), { recursive: true });
}

function parseCsvLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

async function buildDatabase() {
  ensurePaths();
  const start = Date.now();
  console.log('🗂️  Building postcode database...');
  console.log(` - Source CSV dir: ${CSV_DIR}`);
  console.log(` - Output DB: ${OUTPUT_DB}`);

  const db = new Database(OUTPUT_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  db.exec(`
    DROP TABLE IF EXISTS postcodes;
    DROP TABLE IF EXISTS postcodes_rtree;

    CREATE TABLE postcodes (
      postcode TEXT PRIMARY KEY,
      positional_quality INTEGER,
      easting INTEGER,
      northing INTEGER,
      country_code TEXT,
      nhs_regional_ha_code TEXT,
      nhs_ha_code TEXT,
      admin_county_code TEXT,
      admin_district_code TEXT,
      admin_ward_code TEXT
    );

    CREATE VIRTUAL TABLE postcodes_rtree USING rtree(
      id,
      minX, maxX,
      minY, maxY
    );

    CREATE INDEX idx_postcodes_easting_northing ON postcodes(easting, northing);
    CREATE INDEX idx_postcodes_admin_district ON postcodes(admin_district_code);
  `);

  const insertPostcode = db.prepare(`
    INSERT OR REPLACE INTO postcodes (
      postcode,
      positional_quality,
      easting,
      northing,
      country_code,
      nhs_regional_ha_code,
      nhs_ha_code,
      admin_county_code,
      admin_district_code,
      admin_ward_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRtree = db.prepare(`
    INSERT INTO postcodes_rtree (id, minX, maxX, minY, maxY)
    VALUES (?, ?, ?, ?, ?)
  `);

  const files = fs
    .readdirSync(CSV_DIR)
    .filter(f => f.toLowerCase().endsWith('.csv'))
    .sort();

  let totalRows = 0;
  db.exec('BEGIN');

  for (const file of files) {
    const filePath = path.join(CSV_DIR, file);
    console.log(`   • Ingesting ${file}`);

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line) continue;
      const cols = parseCsvLine(line);
      if (cols.length < 10) {
        console.warn(`Skipping malformed line in ${file}: ${line}`);
        continue;
      }

      const postcode = cols[0].trim().toUpperCase();
      if (!postcode) continue;

      const positionalQuality = Number(cols[1] || 0);
      const easting = Number(cols[2] || 0);
      const northing = Number(cols[3] || 0);
      const countryCode = cols[4] || '';
      const nhsRegional = cols[5] || '';
      const nhsHa = cols[6] || '';
      const adminCounty = cols[7] || '';
      const adminDistrict = cols[8] || '';
      const adminWard = cols[9] || '';

      const info = insertPostcode.run(
        postcode,
        positionalQuality,
        easting,
        northing,
        countryCode,
        nhsRegional,
        nhsHa,
        adminCounty,
        adminDistrict,
        adminWard
      );

      insertRtree.run(info.lastInsertRowid, easting, easting, northing, northing);
      totalRows++;
    }
  }

  db.exec('COMMIT');
  db.close();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`✅ Postcode database built with ${totalRows.toLocaleString()} rows in ${elapsed}s`);
  console.log(`   Location: ${OUTPUT_DB}`);
}

buildDatabase().catch(err => {
  console.error('❌ Failed to build postcode database:', err);
  process.exit(1);
});
