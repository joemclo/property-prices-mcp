# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-06

### Changed

- Updated `@modelcontextprotocol/sdk` from 1.8.0 to 1.21.0
- Updated `winston` from 3.17.0 to 3.18.3
- Updated `zod` from 3.22.4 to 3.24.1
- Replaced `console.warn` with proper logger in sparqlService.ts
- Updated Jest configuration to only run tests from source directory

### Fixed

- Fixed TypeScript build configuration to exclude test files from compilation output
- Fixed Jest configuration to prevent running tests from dist directory
- Updated test assertions to match current SPARQL query format (VALUES syntax)

### Removed

- Removed duplicate ESLint configuration (.eslintrc.json) - now using eslint.config.js only
- Removed redundant fetch dependencies (isomorphic-fetch and node-fetch) - using native Node.js fetch

## [1.0.0] - 2024-04-03

### Added

- Initial release
- Property price search functionality using HM Land Registry SPARQL endpoint
- MCP server implementation
- CLI interface
- Filtering by postcode, street, city, price range, property type, and date range
- Sorting and pagination support
- TypeScript implementation with full type safety
- Jest testing setup
- ESLint and Prettier configuration
- Comprehensive documentation
