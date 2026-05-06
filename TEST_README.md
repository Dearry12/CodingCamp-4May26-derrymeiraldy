# StorageManager Unit Tests

## Overview

This document describes the unit tests for the StorageManager component, which provides a centralized interface for Local Storage operations with error handling.

## Test Framework

- **Framework**: Vitest v1.0.0
- **Environment**: happy-dom (simulates browser environment)
- **Test File**: `js/storage-manager.test.js`

## Running Tests

```bash
# Install dependencies
npm install

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Test Coverage

### 1. Availability Checks (2 tests)
- ✓ Detects available storage
- ✓ Detects unavailable storage

### 2. Get Operations (7 tests)
- ✓ Gets string values
- ✓ Gets and parses JSON objects
- ✓ Gets and parses JSON arrays
- ✓ Returns null for non-existent keys
- ✓ Returns null when storage is unavailable
- ✓ Handles malformed JSON gracefully
- ✓ Handles errors during get operation

### 3. Set Operations (10 tests)
- ✓ Sets string values
- ✓ Sets and serializes objects
- ✓ Sets and serializes arrays
- ✓ Sets and serializes numbers
- ✓ Sets and serializes booleans
- ✓ Returns false when storage is unavailable
- ✓ Handles quota exceeded error (QuotaExceededError)
- ✓ Handles quota exceeded error (code 22)
- ✓ Handles quota exceeded error (code 1014)
- ✓ Handles generic storage errors

### 4. Remove Operations (3 tests)
- ✓ Removes items
- ✓ Does not call removeItem when storage is unavailable
- ✓ Handles errors during remove operation

### 5. JSON Serialization/Deserialization (6 tests)
- ✓ Handles complex nested objects
- ✓ Handles null values
- ✓ Handles undefined by converting to null
- ✓ Handles empty strings
- ✓ Handles empty objects
- ✓ Handles empty arrays

### 6. Error Handling (4 tests)
- ✓ Shows storage warning for generic errors
- ✓ Shows quota error for QuotaExceededError
- ✓ Only shows storage warning once
- ✓ Handles missing warning banner gracefully

### 7. Integration Tests (3 tests)
- ✓ Handles complete set-get-remove cycle
- ✓ Handles multiple keys independently
- ✓ Overwrites existing values

## Requirements Coverage

The tests validate the following requirements from the spec:

- **Requirement 6.1**: Storage using Local Storage API ✓
- **Requirement 6.6**: Warning message when Local Storage unavailable ✓
- **Requirement 6.7**: Continue with in-memory state when storage unavailable ✓
- **Requirement 6.8**: Handle quota exceeded errors gracefully ✓

## Test Statistics

- **Total Tests**: 35
- **Test Suites**: 7
- **All Tests Passing**: ✓

## Key Test Scenarios

### Error Handling
The tests verify that StorageManager properly handles:
- Storage unavailability (private browsing mode)
- Quota exceeded errors (multiple error codes)
- Generic storage errors
- Malformed JSON data
- Missing DOM elements

### Data Types
The tests verify correct serialization/deserialization for:
- Strings (including empty strings)
- Numbers
- Booleans
- Objects (including nested objects)
- Arrays (including empty arrays)
- Null values
- Undefined values

### Edge Cases
- Empty strings are preserved
- Malformed JSON returns raw string
- Multiple keys operate independently
- Values can be overwritten
- Warning banner only shows once
- Missing DOM elements don't cause errors

## Implementation Notes

The StorageManager is exported as an ES6 module from `js/storage-manager.js` to enable testing while maintaining compatibility with the existing `js/app.js` implementation.

The test suite uses mocked localStorage to ensure tests are:
- Fast (no actual disk I/O)
- Reliable (no browser dependencies)
- Isolated (no side effects between tests)
