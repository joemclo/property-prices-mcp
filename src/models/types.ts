import { z } from 'zod';

export const PropertyTypeSchema = z.enum([
  'detached',
  'semi-detached',
  'terraced',
  'flat',
  'other',
]);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const SearchParamsSchema = z.object({
  postcode: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  propertyType: PropertyTypeSchema.optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  sortBy: z.enum(['date', 'price']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

export interface PropertyPrice {
  price: number;
  date: string;
  postcode: string;
  propertyType: PropertyType;
  street: string;
  city: string;
  paon?: string;
  saon?: string;
}

export interface SearchResponse {
  properties: PropertyPrice[];
  total: number;
  offset: number;
  limit: number;
}
