import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { getPostcodeRecord, lookupPostcodes } from '../../services/postcodeService.js';
import { PostcodeLookupParamsSchema } from '../../models/postcodes.js';

function createTempDb(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postcode-db-'));
  const dbPath = path.join(tmpDir, 'postcodes.sqlite');
  const db = new Database(dbPath);

  db.exec(`
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
    CREATE VIRTUAL TABLE postcodes_rtree USING rtree(id, minX, maxX, minY, maxY);
  `);

  const insertPostcode = db.prepare(`
    INSERT INTO postcodes (
      postcode, positional_quality, easting, northing, country_code,
      nhs_regional_ha_code, nhs_ha_code, admin_county_code, admin_district_code, admin_ward_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRtree = db.prepare(
    `INSERT INTO postcodes_rtree (id, minX, maxX, minY, maxY) VALUES (?, ?, ?, ?, ?)`
  );

  const rows = [
    ['AA1 1AA', 10, 1000, 1000, 'C1', 'NR1', 'NH1', 'AC1', 'AD1', 'AW1'],
    ['AA1 1AB', 10, 1005, 1005, 'C1', 'NR1', 'NH1', 'AC1', 'AD1', 'AW1'],
    ['AA1 1AC', 10, 1200, 1200, 'C1', 'NR1', 'NH1', 'AC1', 'AD2', 'AW2'],
  ];

  for (const row of rows) {
    const info = insertPostcode.run(...row);
    insertRtree.run(info.lastInsertRowid, row[2], row[2], row[3], row[3]);
  }

  db.close();
  return dbPath;
}

describe('postcodeService', () => {
  const dbPath = createTempDb();

  it('gets a postcode record', () => {
    const record = getPostcodeRecord('aa1 1aa', { dbPath });
    expect(record).toBeTruthy();
    expect(record?.postcode).toBe('AA1 1AA');
    expect(record?.adminDistrictCode).toBe('AD1');
  });

  it('finds nearest postcodes within a radius', () => {
    const params = PostcodeLookupParamsSchema.parse({
      postcode: 'AA1 1AA',
      limit: 2,
      radiusMeters: 50,
      includeSelf: false,
    });

    const result = lookupPostcodes(params, { dbPath });
    expect(result.postcodes).toHaveLength(1);
    expect(result.postcodes[0].postcode).toBe('AA1 1AB');
    expect(result.postcodes[0].distanceMeters).toBeGreaterThan(0);
  });

  it('filters by admin district', () => {
    const params = PostcodeLookupParamsSchema.parse({
      postcode: 'AA1 1AA',
      limit: 5,
      adminDistrict: 'AD2',
      radiusMeters: 5000,
    });

    const result = lookupPostcodes(params, { dbPath });
    expect(result.postcodes.map(p => p.postcode)).toEqual(['AA1 1AC']);
  });
});
