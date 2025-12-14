// Generated from combined ontology

/**
 * BS7666 address
 * BS7666Address structure containing paon, saon, street, town, locality, district, county and postcode.
 */
export interface BS7666Address {
  /**
   * County
   * Name of a geographic area which comprises either a current of former county in England of Wales or a Unitary Authority.
   */
  county?: string;
  /**
   * District
   * Name of an administrative district in England and Wales. An administrative district also covers the London boroughs, unitary authorities and for the purposes of Land Registry the Isles of Scilly parishes.
   */
  district?: string;
}

/**
 * Address
 * Super Class for Address implementations
 */
export interface Address {
}

/**
 * Estate type concept
 * EstateTypeConcept Class in which specific instances are defined using a skos structure
 */
export interface EstateTypeConcept {
  estateTypeNotation?: any;
  notation?: any;
  prefLabel?: any;
  topConceptOf?: any;
}

/**
 * Property type concept
 * PropertyTypeConcept Class in which specific instances are defined using a skos structure
 */
export interface PropertyTypeConcept {
}

/**
 * Record status concept
 * RecordStatusConcept Class in which specific instances are defined using a skos structure.
 */
export interface RecordStatusConcept {
  notation?: any;
  prefLabel?: any;
  topConceptOf?: any;
  recordStatusNotation?: any;
  definition?: any;
}

/**
 * Transaction
 * Transaction Class which may have multiple TransactionRecords datatype
 */
export interface Transaction {
}

/**
 * TransactionRecord
 * TransactionRecord Class which is a single record belonging to a Transaction.
 */
export interface TransactionRecord {
}

/**
 * Transaction category
 * The class of Price Paid Transaction Categories
 */
export interface TransactionCategory {
}

export const combined = {
  PropertyTypeNotationDatatype: 'http://landregistry.data.gov.uk/def/common/PropertyTypeNotationDatatype',
  BS7666Address: 'http://landregistry.data.gov.uk/def/common/BS7666Address',
  Address: 'http://landregistry.data.gov.uk/def/common/Address',
  county: 'http://landregistry.data.gov.uk/def/common/county',
  district: 'http://landregistry.data.gov.uk/def/common/district',
  freehold: 'http://landregistry.data.gov.uk/def/common/freehold',
  EstateTypeConcept: 'http://landregistry.data.gov.uk/def/common/EstateTypeConcept',
  estateTypeConceptScheme: 'http://landregistry.data.gov.uk/def/common/estateTypeConceptScheme',
  leasehold: 'http://landregistry.data.gov.uk/def/common/leasehold',
  EstateTypeNotationDatatype: 'http://landregistry.data.gov.uk/def/common/EstateTypeNotationDatatype',
  PropertyTypeConcept: 'http://landregistry.data.gov.uk/def/common/PropertyTypeConcept',
  change: 'http://landregistry.data.gov.uk/def/ppi/change',
  RecordStatusConcept: 'http://landregistry.data.gov.uk/def/ppi/RecordStatusConcept',
  recordStatusConceptScheme: 'http://landregistry.data.gov.uk/def/ppi/recordStatusConceptScheme',
  add: 'http://landregistry.data.gov.uk/def/ppi/add',
  TransactionIdDatatype: 'http://landregistry.data.gov.uk/def/ppi/TransactionIdDatatype',
  RecordStatusNotationDatatype: 'http://landregistry.data.gov.uk/def/ppi/RecordStatusNotationDatatype',
  Transaction: 'http://landregistry.data.gov.uk/def/ppi/Transaction',
  TransactionRecord: 'http://landregistry.data.gov.uk/def/ppi/TransactionRecord',
  TransactionCategoryNotationDatatype: 'http://landregistry.data.gov.uk/def/ppi/TransactionCategoryNotationDatatype',
  TransactionCategory: 'http://landregistry.data.gov.uk/def/ppi/TransactionCategory',
};
