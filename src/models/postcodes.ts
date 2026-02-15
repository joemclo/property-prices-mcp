import { z } from 'zod';

export interface PostcodeRecord {
  postcode: string;
  positionalQuality: number;
  easting: number;
  northing: number;
  countryCode: string;
  nhsRegionalHaCode: string;
  nhsHaCode: string;
  adminCountyCode: string;
  adminDistrictCode: string;
  adminWardCode: string;
}

export interface PostcodeDistance extends PostcodeRecord {
  distanceMeters: number;
}

export const PostcodeLookupParamsSchema = z
  .object({
    postcode: z.string().optional(),
    easting: z.number().optional(),
    northing: z.number().optional(),
    limit: z.number().int().positive().max(500).default(10),
    radiusMeters: z.number().positive().max(200000).optional(),
    includeSelf: z.boolean().optional(),
    adminDistrict: z.string().optional(),
  })
  .refine(
    data =>
      data.postcode || (typeof data.easting === 'number' && typeof data.northing === 'number'),
    { message: 'Provide a postcode or both easting and northing' }
  );

export type PostcodeLookupParams = z.infer<typeof PostcodeLookupParamsSchema>;

export interface PostcodeLookupResult {
  center: PostcodeRecord;
  postcodes: PostcodeDistance[];
  total: number;
}
