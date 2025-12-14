// Import the constants
import { combined } from './combined.generated';

// Create the common and ppi constants from the combined object
// by extracting only the relevant URIs
export const common = {
  PropertyTypeNotationDatatype: combined.PropertyTypeNotationDatatype,
  BS7666Address: combined.BS7666Address,
  Address: combined.Address,
  county: combined.county,
  district: combined.district,
  freehold: combined.freehold,
  EstateTypeConcept: combined.EstateTypeConcept,
  estateTypeConceptScheme: combined.estateTypeConceptScheme,
  leasehold: combined.leasehold,
  EstateTypeNotationDatatype: combined.EstateTypeNotationDatatype,
  PropertyTypeConcept: combined.PropertyTypeConcept,
};

export const ppi = {
  change: combined.change,
  RecordStatusConcept: combined.RecordStatusConcept,
  recordStatusConceptScheme: combined.recordStatusConceptScheme,
  add: combined.add,
  TransactionIdDatatype: combined.TransactionIdDatatype,
  RecordStatusNotationDatatype: combined.RecordStatusNotationDatatype,
  Transaction: combined.Transaction,
  TransactionRecord: combined.TransactionRecord,
  TransactionCategoryNotationDatatype: combined.TransactionCategoryNotationDatatype,
  TransactionCategory: combined.TransactionCategory,
};

// Export the combined constants
export { combined };

// Export the interfaces from the combined file
export type {
  BS7666Address,
  Address,
  EstateTypeConcept,
  PropertyTypeConcept,
  RecordStatusConcept,
  Transaction,
  TransactionRecord,
  TransactionCategory
} from './combined.generated';
