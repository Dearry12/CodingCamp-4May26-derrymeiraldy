import { describe, it, expect } from 'vitest';
import { PomodoroTimer } from './pomodoro-timer.js';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for PomodoroTimer
 * Feature: dashboard-interactive-enhancements
 */
describe('PomodoroTimer - Property-Based Tests', () => {
  // Create a mock storage manager for testing
  const createMockStorage = () => ({
    get: () => null,
    set: () => true,
    remove: () => true,
    isAvailable: () => true,
  });

  /**
   * Property 3: Duration Validation Range
   * **Validates: Requirements 3.2**
   * 
   * For any integer value, the timer duration validator SHALL accept the value
   * if and only if it is between 1 and 120 inclusive, rejecting all values outside this range.
   */
  describe('Property 3: Duration Validation Range', () => {
    it('should accept all integers in range [1, 120] and reject all others', () => {
      const timer = new PomodoroTimer(createMockStorage());

      // Generator for integers in the valid range [1, 120]
      const validDurationArbitrary = fc.integer({ min: 1, max: 120 });

      fc.assert(
        fc.property(validDurationArbitrary, (duration) => {
          // All values in [1, 120] should be accepted
          expect(timer.validateDuration(duration)).toBe(true);
        }),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('should reject all integers below 1', () => {
      const timer = new PomodoroTimer(createMockStorage());

      // Generator for integers below 1 (negative and zero)
      const belowRangeArbitrary = fc.integer({ max: 0 });

      fc.assert(
        fc.property(belowRangeArbitrary, (duration) => {
          // All values <= 0 should be rejected
          expect(timer.validateDuration(duration)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject all integers above 120', () => {
      const timer = new PomodoroTimer(createMockStorage());

      // Generator for integers above 120
      const aboveRangeArbitrary = fc.integer({ min: 121 });

      fc.assert(
        fc.property(aboveRangeArbitrary, (duration) => {
          // All values >= 121 should be rejected
          expect(timer.validateDuration(duration)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject all non-integer numbers', () => {
      const timer = new PomodoroTimer(createMockStorage());

      // Generator for non-integer numbers (floats with fractional parts)
      const nonIntegerArbitrary = fc.double({ 
        noNaN: true,
        noDefaultInfinity: true
      }).filter(n => !Number.isInteger(n));

      fc.assert(
        fc.property(nonIntegerArbitrary, (duration) => {
          // All non-integer numbers should be rejected
          expect(timer.validateDuration(duration)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject non-numeric values', () => {
      const timer = new PomodoroTimer(createMockStorage());

      // Generator for non-numeric values
      const nonNumericArbitrary = fc.oneof(
        fc.string(),
        fc.constant(null),
        fc.constant(undefined),
        fc.constant(NaN),
        fc.boolean(),
        fc.object(),
        fc.array(fc.anything())
      );

      fc.assert(
        fc.property(nonNumericArbitrary, (duration) => {
          // All non-numeric values should be rejected
          expect(timer.validateDuration(duration)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle boundary values correctly', () => {
      const timer = new PomodoroTimer(createMockStorage());

      // Test exact boundaries
      expect(timer.validateDuration(1)).toBe(true);    // Lower boundary - valid
      expect(timer.validateDuration(120)).toBe(true);  // Upper boundary - valid
      expect(timer.validateDuration(0)).toBe(false);   // Just below lower - invalid
      expect(timer.validateDuration(121)).toBe(false); // Just above upper - invalid
    });

    it('should validate consistently for the same input', () => {
      const timer = new PomodoroTimer(createMockStorage());

      // Generator for any integer
      const anyIntegerArbitrary = fc.integer();

      fc.assert(
        fc.property(anyIntegerArbitrary, (duration) => {
          // Validation should be deterministic - same input gives same result
          const firstResult = timer.validateDuration(duration);
          const secondResult = timer.validateDuration(duration);
          expect(firstResult).toBe(secondResult);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle special numeric values', () => {
      const timer = new PomodoroTimer(createMockStorage());

      // Test special numeric values
      expect(timer.validateDuration(Infinity)).toBe(false);
      expect(timer.validateDuration(-Infinity)).toBe(false);
      expect(timer.validateDuration(NaN)).toBe(false);
      expect(timer.validateDuration(0)).toBe(false);
      expect(timer.validateDuration(-0)).toBe(false);
    });

    it('should reject string representations of numbers', () => {
      const timer = new PomodoroTimer(createMockStorage());

      // Generator for string representations of valid numbers
      const numericStringArbitrary = fc.integer({ min: 1, max: 120 })
        .map(n => String(n));

      fc.assert(
        fc.property(numericStringArbitrary, (duration) => {
          // String representations should be rejected (type safety)
          expect(timer.validateDuration(duration)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should partition input space correctly', () => {
      const timer = new PomodoroTimer(createMockStorage());

      // Generator for any number
      const anyNumberArbitrary = fc.oneof(
        fc.integer({ max: 0 }),           // Below range
        fc.integer({ min: 1, max: 120 }), // In range
        fc.integer({ min: 121 }),         // Above range
        fc.double().filter(n => !Number.isInteger(n)) // Non-integers
      );

      fc.assert(
        fc.property(anyNumberArbitrary, (duration) => {
          const isValid = timer.validateDuration(duration);
          const isInRange = Number.isInteger(duration) && duration >= 1 && duration <= 120;
          
          // Validation result should match whether value is in valid range
          expect(isValid).toBe(isInRange);
        }),
        { numRuns: 100 }
      );
    });
  });
});
