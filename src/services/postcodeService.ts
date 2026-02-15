import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { PostcodeLookupParams, PostcodeRecord, PostcodeDistance } from '../models/postcodes.js';
import { logInfo } from '../utils/logger.js';

const DEFAULT_DB_PATH = path.join(process.cwd(), 'data', 'postcodes.sqlite');
const DEFAULT_RADIUS = 5000; // meters, used when radiusMeters is not provided
const MAX_RADIUS = 200000; // safeguard to avoid runaway expansion (200km)

let dbInstance: Database.Database | null = null;
let dbPathInUse: string | null = null;

interface PostcodeRow {
  postcode: string;
  positional_quality: number;
  easting: number;
  northing: number;
  country_code: string;
  nhs_regional_ha_code: string;
  nhs_ha_code: string;
  admin_county_code: string;
  admin_district_code: string;
  admin_ward_code: string;
}

function resolveDbPath(customPath?: string): string {
  return path.resolve(customPath || process.env.POSTCODE_DB_PATH || DEFAULT_DB_PATH);
}

function getDb(dbPath?: string): Database.Database {
  const resolvedPath = resolveDbPath(dbPath);
  if (dbInstance && dbPathInUse === resolvedPath) {
    return dbInstance;
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Postcode database not found at ${resolvedPath}. Run "npm run build:postcodes" to generate it.`
    );
  }

  dbInstance?.close();
  dbInstance = new Database(resolvedPath, { readonly: true });
  dbPathInUse = resolvedPath;
  return dbInstance;
}

function normalizePostcode(postcode: string): string {
  return postcode.trim().toUpperCase();
}

function mapRow(row: PostcodeRow): PostcodeRecord {
  return {
    postcode: row.postcode,
    positionalQuality: row.positional_quality,
    easting: row.easting,
    northing: row.northing,
    countryCode: row.country_code,
    nhsRegionalHaCode: row.nhs_regional_ha_code,
    nhsHaCode: row.nhs_ha_code,
    adminCountyCode: row.admin_county_code,
    adminDistrictCode: row.admin_district_code,
    adminWardCode: row.admin_ward_code,
  };
}

export function getPostcodeRecord(
  postcode: string,
  options?: { dbPath?: string }
): PostcodeRecord | null {
  const db = getDb(options?.dbPath);
  const normalized = normalizePostcode(postcode);
  const row = db
    .prepare(
      `SELECT postcode, positional_quality, easting, northing, country_code, nhs_regional_ha_code,
              nhs_ha_code, admin_county_code, admin_district_code, admin_ward_code
       FROM postcodes WHERE postcode = ?`
    )
    .get(normalized) as PostcodeRow | undefined;

  return row ? mapRow(row) : null;
}

function queryByRadius(
  db: Database.Database,
  centerE: number,
  centerN: number,
  radius: number,
  adminDistrict?: string,
  limit: number = 2000
): PostcodeRecord[] {
  const minX = centerE - radius;
  const maxX = centerE + radius;
  const minY = centerN - radius;
  const maxY = centerN + radius;

  const sql = `
    SELECT p.postcode, p.positional_quality, p.easting, p.northing, p.country_code,
           p.nhs_regional_ha_code, p.nhs_ha_code, p.admin_county_code,
           p.admin_district_code, p.admin_ward_code
    FROM postcodes_rtree r
    JOIN postcodes p ON p.rowid = r.id
    WHERE r.maxX >= ? AND r.minX <= ? AND r.maxY >= ? AND r.minY <= ?
    ${adminDistrict ? 'AND p.admin_district_code = ?' : ''}
    LIMIT ?`;

  const params = adminDistrict
    ? [minX, maxX, minY, maxY, adminDistrict, limit]
    : [minX, maxX, minY, maxY, limit];

  const rows = db.prepare(sql).all(...params) as PostcodeRow[];
  return rows.map(mapRow);
}

export function lookupPostcodes(
  params: PostcodeLookupParams,
  options?: { dbPath?: string }
): { center: PostcodeRecord; postcodes: PostcodeDistance[]; total: number } {
  const db = getDb(options?.dbPath);

  const limit = params.limit ?? 10;
  const includeSelf = params.includeSelf ?? false;
  const adminDistrict = params.adminDistrict;

  let center: PostcodeRecord;
  if (params.postcode) {
    const record = getPostcodeRecord(params.postcode, options);
    if (!record) {
      throw new Error(`Postcode not found: ${normalizePostcode(params.postcode)}`);
    }
    center = record;
  } else {
    center = {
      postcode: '',
      positionalQuality: 0,
      easting: params.easting!,
      northing: params.northing!,
      countryCode: '',
      nhsRegionalHaCode: '',
      nhsHaCode: '',
      adminCountyCode: '',
      adminDistrictCode: '',
      adminWardCode: '',
    };
  }

  const centerE = center.easting;
  const centerN = center.northing;

  let radius = params.radiusMeters ?? DEFAULT_RADIUS;
  let candidates: PostcodeRecord[] = [];

  // Expand search radius until we have enough candidates or hit MAX_RADIUS
  while (candidates.length < limit && radius <= MAX_RADIUS) {
    candidates = queryByRadius(db, centerE, centerN, radius, adminDistrict);
    if (params.radiusMeters) break; // caller provided explicit radius; don't expand
    if (candidates.length < limit) {
      radius *= 2;
    }
  }

  const withDistance: PostcodeDistance[] = candidates
    .map(record => {
      const dx = record.easting - centerE;
      const dy = record.northing - centerN;
      const distanceMeters = Math.sqrt(dx * dx + dy * dy);
      return { ...record, distanceMeters };
    })
    .filter(record => {
      if (
        !includeSelf &&
        params.postcode &&
        record.postcode === normalizePostcode(params.postcode)
      ) {
        return false;
      }
      if (params.radiusMeters !== undefined && record.distanceMeters > params.radiusMeters) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const limited = withDistance.slice(0, limit);

  logInfo('Postcode lookup completed', {
    searchPostcode: params.postcode ? normalizePostcode(params.postcode) : undefined,
    easting: params.easting,
    northing: params.northing,
    limit,
    radiusUsed: radius,
    adminDistrict,
    totalFound: withDistance.length,
  });

  return {
    center,
    postcodes: limited,
    total: withDistance.length,
  };
}
