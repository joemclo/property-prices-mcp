# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Upgraded `@modelcontextprotocol/sdk` to `1.26.0` and migrated tool registration to `registerTool` for compatibility with newer SDK typings.
- Updated development dependencies to current patch/minor releases (TypeScript, ESLint, Prettier, ts-jest, and related tooling).
- Raised minimum supported Node.js version from 18 to 20.
- Added a `files` allowlist in `package.json` to reduce published package contents.

### Fixed

- Fixed ESLint type-aware parsing for test files by introducing `tsconfig.eslint.json`.
- Moved ignore rules into flat ESLint config and removed deprecated `.eslintignore`.
- Excluded generated RDF TypeScript files from linting noise.

## [1.1.0] - 2025-12-12

### Changed

- **Updated `@modelcontextprotocol/sdk` from 1.8.0 to 1.24.3** (fixes DNS rebinding security vulnerability)
- Switched build system from `tsc` to `esbuild` for faster transpilation without type checking
- Added separate `npm run typecheck` command for type checking
- Updated `winston` from 3.17.0 to 3.18.3
- Updated `zod` from 3.22.4 to 3.24.1
- Replaced `console.warn` with proper logger in sparqlService.ts
- Updated Jest configuration to only run tests from source directory
- Disabled TypeScript declaration file generation due to MCP SDK 1.24.x memory issues (see [typescript-sdk#985](https://github.com/modelcontextprotocol/typescript-sdk/issues/985))

### Added

- Added `esbuild` for fast TypeScript transpilation
- Added `build.js` custom build script
- Added `npm run typecheck` for type checking with `tsc --noEmit`

### Fixed

- Fixed TypeScript build configuration to exclude test files from compilation output
- Fixed Jest configuration to prevent running tests from dist directory
- Updated test assertions to match current SPARQL query format (VALUES syntax)
- Fixed security vulnerability in @modelcontextprotocol/sdk (DNS rebinding protection)

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
