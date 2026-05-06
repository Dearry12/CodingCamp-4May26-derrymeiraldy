import { describe, it, expect } from 'vitest';
import { TaskValidator } from './task-validator.js';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for TaskValidator
 * Feature: dashboard-interactive-enhancements
 */
describe('TaskValidator - Property-Based Tests', () => {
  /**
   * Property 1: Duplicate Detection with Normalization
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.6**
   * 
   * For any task text and any existing task list, when checking for duplicates,
   * the validator SHALL detect a duplicate if and only if the normalized
   * (trimmed, lowercase) task text matches any existing task's normalized text,
   * regardless of the existing task's completion status.
   */
  describe('Property 1: Duplicate Detection with Normalization', () => {
    const validator = new TaskValidator();

    // Generator for task objects with varied casing and whitespace
    const taskArbitrary = fc.record({
      id: fc.string(),
      text: fc.string({ minLength: 1, maxLength: 50 }),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
    });

    // Generator for whitespace variations
    const whitespaceArbitrary = fc.oneof(
      fc.constant(''),
      fc.constant(' '),
      fc.constant('  '),
      fc.constant('\t'),
      fc.constant('\n'),
      fc.constant(' \t\n '),
      fc.constant('   ')
    );

    // Generator for case variations of a string
    const caseVariationArbitrary = (text) => fc.oneof(
      fc.constant(text.toLowerCase()),
      fc.constant(text.toUpperCase()),
      fc.constant(text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()),
      fc.constant(text.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join(''))
    );

    it('should detect duplicates regardless of case differences', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tasks, index) => {
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Create case variations of the existing task text
            const variations = [
              existingTask.text.toLowerCase(),
              existingTask.text.toUpperCase(),
              existingTask.text.charAt(0).toUpperCase() + existingTask.text.slice(1).toLowerCase()
            ];

            // All case variations should be detected as duplicates
            variations.forEach(variation => {
              const result = validator.isDuplicate(variation, tasks);
              expect(result).toBe(true);
            });
          }
        ),
        { numRuns: 100, verbose: true }
      );
    });

    it('should detect duplicates regardless of leading/trailing whitespace', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          whitespaceArbitrary,
          whitespaceArbitrary,
          (tasks, index, leadingWs, trailingWs) => {
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Add whitespace variations
            const withWhitespace = leadingWs + existingTask.text + trailingWs;
            
            // Should be detected as duplicate
            const result = validator.isDuplicate(withWhitespace, tasks);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect duplicates with combined case and whitespace variations', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          whitespaceArbitrary,
          whitespaceArbitrary,
          (tasks, index, leadingWs, trailingWs) => {
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Create variations with both case and whitespace changes
            const variations = [
              leadingWs + existingTask.text.toLowerCase() + trailingWs,
              leadingWs + existingTask.text.toUpperCase() + trailingWs,
              leadingWs + existingTask.text + trailingWs
            ];

            // All variations should be detected as duplicates
            variations.forEach(variation => {
              const result = validator.isDuplicate(variation, tasks);
              expect(result).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect duplicates regardless of completion status', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          fc.boolean(),
          (task, newCompletionStatus) => {
            // Create a task list with the task in one completion status
            const tasks = [task];
            
            // Try to add the same task text (should be duplicate regardless of completion status)
            const result = validator.isDuplicate(task.text, tasks);
            
            // Should always be detected as duplicate
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not detect non-duplicates as duplicates', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (tasks, newText) => {
            // Normalize the new text
            const normalizedNew = newText.trim().toLowerCase();
            
            // Check if it actually matches any existing task
            const actuallyExists = tasks.some(task => 
              task.text.trim().toLowerCase() === normalizedNew
            );
            
            // The validator's result should match the actual existence
            const result = validator.isDuplicate(newText, tasks);
            expect(result).toBe(actuallyExists);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty task lists correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (text) => {
            // Empty task list should never have duplicates
            const result = validator.isDuplicate(text, []);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate method returns correct error for duplicates', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          whitespaceArbitrary,
          whitespaceArbitrary,
          (tasks, index, leadingWs, trailingWs) => {
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Create a variation with case and whitespace changes
            const variation = leadingWs + existingTask.text.toUpperCase() + trailingWs;
            
            // Validate should detect duplicate and return appropriate error
            const result = validator.validate(variation, tasks);
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('This task already exists');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should normalize text consistently', () => {
      fc.assert(
        fc.property(
          fc.string(),
          whitespaceArbitrary,
          whitespaceArbitrary,
          (text, leadingWs, trailingWs) => {
            // Create variations of the same text
            const variation1 = leadingWs + text + trailingWs;
            const variation2 = text.toUpperCase();
            const variation3 = leadingWs + text.toLowerCase() + trailingWs;
            
            // All should normalize to the same value
            const normalized1 = validator.normalizeText(variation1);
            const normalized2 = validator.normalizeText(variation2);
            const normalized3 = validator.normalizeText(variation3);
            
            // If the base text is the same, normalized versions should match
            expect(normalized1).toBe(text.trim().toLowerCase());
            expect(normalized2).toBe(text.trim().toLowerCase());
            expect(normalized3).toBe(text.trim().toLowerCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in task text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== ''),
          whitespaceArbitrary,
          whitespaceArbitrary,
          (text, leadingWs, trailingWs) => {
            // Create a task with non-empty text (after trimming)
            const task = {
              id: '1',
              text: text,
              completed: false,
              createdAt: Date.now()
            };
            
            // Create a variation with whitespace and case changes
            const variation = leadingWs + text.toUpperCase() + trailingWs;
            
            // Should always detect as duplicate since both normalize to the same non-empty value
            const result = validator.isDuplicate(variation, [task]);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple tasks with similar but different text', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ''),
            { minLength: 2, maxLength: 5 }
          ).map(texts => {
            // Ensure all texts are unique after normalization
            const uniqueTexts = [...new Set(texts.map(t => t.trim().toLowerCase()))];
            return uniqueTexts.map((text, i) => ({
              id: String(i),
              text: text,
              completed: false,
              createdAt: Date.now() + i
            }));
          }),
          fc.integer({ min: 0, max: 4 }),
          (tasks, index) => {
            if (tasks.length === 0) return;
            
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Should detect as duplicate
            expect(validator.isDuplicate(existingTask.text, tasks)).toBe(true);
            
            // A completely different text should not be duplicate
            const differentText = existingTask.text + '_different_suffix_xyz';
            expect(validator.isDuplicate(differentText, tasks)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be case-insensitive for various character sets', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (text) => {
            const task = {
              id: '1',
              text: text,
              completed: false,
              createdAt: Date.now()
            };
            
            // Test with uppercase and lowercase variations
            const upperVariation = text.toUpperCase();
            const lowerVariation = text.toLowerCase();
            
            // Both should be detected as duplicates
            expect(validator.isDuplicate(upperVariation, [task])).toBe(true);
            expect(validator.isDuplicate(lowerVariation, [task])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with only whitespace differences', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ''),
          fc.array(whitespaceArbitrary, { minLength: 0, maxLength: 3 }),
          fc.array(whitespaceArbitrary, { minLength: 0, maxLength: 3 }),
          (baseText, leadingWsList, trailingWsList) => {
            // Create multiple tasks with same text but different whitespace
            const tasks = leadingWsList.map((leadingWs, i) => ({
              id: String(i),
              text: leadingWs + baseText + (trailingWsList[i] || ''),
              completed: false,
              createdAt: Date.now() + i
            }));
            
            if (tasks.length === 0) {
              tasks.push({
                id: '0',
                text: baseText,
                completed: false,
                createdAt: Date.now()
              });
            }
            
            // Any variation with the same base text should be detected as duplicate
            const testVariation = '  ' + baseText + '\t\n';
            expect(validator.isDuplicate(testVariation, tasks)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Task List Invariant on Duplicate Rejection
   * **Validates: Requirements 4.5**
   * 
   * For any task list and any duplicate task text, when attempting to add
   * the duplicate task, the task list SHALL remain completely unchanged
   * (same tasks, same order, same properties).
   */
  describe('Property 2: Task List Invariant on Duplicate Rejection', () => {
    const validator = new TaskValidator();

    // Generator for task objects
    const taskArbitrary = fc.record({
      id: fc.string(),
      text: fc.string({ minLength: 1, maxLength: 50 }),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
    });

    it('should leave task list completely unchanged when duplicate is rejected', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tasks, index) => {
            // Pick a task from the list to duplicate
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Create a deep copy of the original task list
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Attempt to validate the duplicate task
            const result = validator.validate(existingTask.text, tasks);
            
            // Validation should fail
            expect(result.valid).toBe(false);
            expect(result.error).toBe('This task already exists');
            
            // Task list should remain completely unchanged
            expect(tasks).toEqual(originalTasks);
            expect(tasks.length).toBe(originalTasks.length);
            
            // Verify each task is unchanged
            tasks.forEach((task, i) => {
              expect(task.id).toBe(originalTasks[i].id);
              expect(task.text).toBe(originalTasks[i].text);
              expect(task.completed).toBe(originalTasks[i].completed);
              expect(task.createdAt).toBe(originalTasks[i].createdAt);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should leave task list unchanged with case variations of duplicate', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tasks, index) => {
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Create case variation
            const duplicateText = existingTask.text.toUpperCase();
            
            // Create a deep copy of the original task list
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Attempt to validate the duplicate
            const result = validator.validate(duplicateText, tasks);
            
            // Should be rejected as duplicate
            expect(result.valid).toBe(false);
            
            // Task list should remain unchanged
            expect(tasks).toEqual(originalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should leave task list unchanged with whitespace variations of duplicate', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          fc.oneof(
            fc.constant('  '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant('   ')
          ),
          (tasks, index, whitespace) => {
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Create whitespace variation
            const duplicateText = whitespace + existingTask.text + whitespace;
            
            // Create a deep copy of the original task list
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Attempt to validate the duplicate
            const result = validator.validate(duplicateText, tasks);
            
            // Should be rejected as duplicate
            expect(result.valid).toBe(false);
            
            // Task list should remain unchanged
            expect(tasks).toEqual(originalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should leave task list unchanged with combined case and whitespace variations', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tasks, index) => {
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Create combined variation
            const duplicateText = '  ' + existingTask.text.toLowerCase() + '\t';
            
            // Create a deep copy of the original task list
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Attempt to validate the duplicate
            const result = validator.validate(duplicateText, tasks);
            
            // Should be rejected as duplicate
            expect(result.valid).toBe(false);
            
            // Task list should remain unchanged
            expect(tasks).toEqual(originalTasks);
            expect(tasks.length).toBe(originalTasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate task list even when checking isDuplicate directly', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tasks, index) => {
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Create a deep copy of the original task list
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Call isDuplicate (should not mutate)
            const isDupe = validator.isDuplicate(existingTask.text, tasks);
            
            // Should detect duplicate
            expect(isDupe).toBe(true);
            
            // Task list should remain unchanged
            expect(tasks).toEqual(originalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve task order when duplicate is rejected', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tasks, index) => {
            if (tasks.length < 2) return;
            
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Store original order (task IDs)
            const originalOrder = tasks.map(t => t.id);
            
            // Attempt to validate duplicate
            validator.validate(existingTask.text, tasks);
            
            // Order should be preserved
            const currentOrder = tasks.map(t => t.id);
            expect(currentOrder).toEqual(originalOrder);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all task properties when duplicate is rejected', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tasks, index) => {
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Store all original properties
            const originalProperties = tasks.map(t => ({
              id: t.id,
              text: t.text,
              completed: t.completed,
              createdAt: t.createdAt
            }));
            
            // Attempt to validate duplicate
            validator.validate(existingTask.text, tasks);
            
            // All properties should be preserved
            tasks.forEach((task, i) => {
              expect(task.id).toBe(originalProperties[i].id);
              expect(task.text).toBe(originalProperties[i].text);
              expect(task.completed).toBe(originalProperties[i].completed);
              expect(task.createdAt).toBe(originalProperties[i].createdAt);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty task list without mutation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (text) => {
            const tasks = [];
            const originalTasks = [...tasks];
            
            // Validate with empty list (should pass, not a duplicate)
            const result = validator.validate(text, tasks);
            
            // Task list should remain empty
            expect(tasks).toEqual(originalTasks);
            expect(tasks.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not add or remove tasks when duplicate is rejected', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tasks, index) => {
            // Pick a task from the list
            const targetIndex = index % tasks.length;
            const existingTask = tasks[targetIndex];
            
            // Store original length
            const originalLength = tasks.length;
            
            // Attempt to validate duplicate
            validator.validate(existingTask.text, tasks);
            
            // Length should remain the same
            expect(tasks.length).toBe(originalLength);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain task list integrity across multiple duplicate rejections', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 5 }),
          (tasks) => {
            // Create a deep copy of the original task list
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Attempt to add each existing task again (all should be rejected)
            tasks.forEach(task => {
              const result = validator.validate(task.text, tasks);
              expect(result.valid).toBe(false);
            });
            
            // Task list should remain completely unchanged after all rejections
            expect(tasks).toEqual(originalTasks);
            expect(tasks.length).toBe(originalTasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Text Normalization is Idempotent
   * **Validates: Requirements 4.2, 4.3**
   * 
   * For any task text, applying the normalization function (trim and lowercase)
   * multiple times SHALL produce the same result as applying it once.
   */
  describe('Property 12: Text Normalization is Idempotent', () => {
    const validator = new TaskValidator();

    it('should produce the same result when normalizing text multiple times', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (text) => {
            // Apply normalization once
            const normalizedOnce = validator.normalizeText(text);
            
            // Apply normalization twice
            const normalizedTwice = validator.normalizeText(normalizedOnce);
            
            // Apply normalization three times
            const normalizedThrice = validator.normalizeText(normalizedTwice);
            
            // All should be equal (idempotent property)
            expect(normalizedOnce).toBe(normalizedTwice);
            expect(normalizedTwice).toBe(normalizedThrice);
            expect(normalizedOnce).toBe(normalizedThrice);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent with varied casing', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (text) => {
            // Create case variations
            const upperCase = text.toUpperCase();
            const lowerCase = text.toLowerCase();
            const mixedCase = text.split('').map((c, i) => 
              i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
            ).join('');
            
            // Normalize each variation
            const normalizedUpper = validator.normalizeText(upperCase);
            const normalizedLower = validator.normalizeText(lowerCase);
            const normalizedMixed = validator.normalizeText(mixedCase);
            
            // Apply normalization again to each result
            const doubleNormalizedUpper = validator.normalizeText(normalizedUpper);
            const doubleNormalizedLower = validator.normalizeText(normalizedLower);
            const doubleNormalizedMixed = validator.normalizeText(normalizedMixed);
            
            // All should be equal (idempotent)
            expect(normalizedUpper).toBe(doubleNormalizedUpper);
            expect(normalizedLower).toBe(doubleNormalizedLower);
            expect(normalizedMixed).toBe(doubleNormalizedMixed);
            
            // All variations should normalize to the same value
            expect(normalizedUpper).toBe(normalizedLower);
            expect(normalizedLower).toBe(normalizedMixed);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent with varied whitespace', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.oneof(
            fc.constant(''),
            fc.constant(' '),
            fc.constant('  '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant(' \t\n '),
            fc.constant('   ')
          ),
          fc.oneof(
            fc.constant(''),
            fc.constant(' '),
            fc.constant('  '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant(' \t\n '),
            fc.constant('   ')
          ),
          (text, leadingWs, trailingWs) => {
            // Create whitespace variation
            const withWhitespace = leadingWs + text + trailingWs;
            
            // Normalize once
            const normalizedOnce = validator.normalizeText(withWhitespace);
            
            // Normalize the result again
            const normalizedTwice = validator.normalizeText(normalizedOnce);
            
            // Should be equal (idempotent)
            expect(normalizedOnce).toBe(normalizedTwice);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent with combined case and whitespace variations', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.oneof(
            fc.constant('  '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant('   ')
          ),
          fc.oneof(
            fc.constant('  '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant('   ')
          ),
          (text, leadingWs, trailingWs) => {
            // Create combined variation (case + whitespace)
            const variation = leadingWs + text.toUpperCase() + trailingWs;
            
            // Normalize once
            const normalizedOnce = validator.normalizeText(variation);
            
            // Normalize twice
            const normalizedTwice = validator.normalizeText(normalizedOnce);
            
            // Normalize three times
            const normalizedThrice = validator.normalizeText(normalizedTwice);
            
            // All should be equal (idempotent)
            expect(normalizedOnce).toBe(normalizedTwice);
            expect(normalizedTwice).toBe(normalizedThrice);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent with special characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          (text) => {
            // Normalize once
            const normalizedOnce = validator.normalizeText(text);
            
            // Normalize multiple times
            const normalizedTwice = validator.normalizeText(normalizedOnce);
            const normalizedThrice = validator.normalizeText(normalizedTwice);
            const normalizedFourTimes = validator.normalizeText(normalizedThrice);
            
            // All should be equal (idempotent)
            expect(normalizedOnce).toBe(normalizedTwice);
            expect(normalizedTwice).toBe(normalizedThrice);
            expect(normalizedThrice).toBe(normalizedFourTimes);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent with empty and whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant(' '),
            fc.constant('  '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant(' \t\n '),
            fc.constant('   \t\n   ')
          ),
          (text) => {
            // Normalize once
            const normalizedOnce = validator.normalizeText(text);
            
            // Normalize twice
            const normalizedTwice = validator.normalizeText(normalizedOnce);
            
            // Should be equal (idempotent)
            expect(normalizedOnce).toBe(normalizedTwice);
            
            // Should be empty string
            expect(normalizedOnce).toBe('');
            expect(normalizedTwice).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent with unicode characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          (text) => {
            // Add some unicode characters to the text
            const unicodeText = text + '你好' + 'مرحبا' + '🎉';
            
            // Normalize once
            const normalizedOnce = validator.normalizeText(unicodeText);
            
            // Normalize twice
            const normalizedTwice = validator.normalizeText(normalizedOnce);
            
            // Should be equal (idempotent)
            expect(normalizedOnce).toBe(normalizedTwice);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent regardless of input type variations', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.integer({ min: 1, max: 5 }),
          (text, iterations) => {
            // Apply normalization multiple times
            let result = text;
            for (let i = 0; i < iterations; i++) {
              result = validator.normalizeText(result);
            }
            
            // Apply one more time
            const finalResult = validator.normalizeText(result);
            
            // Should be equal (idempotent after first normalization)
            expect(result).toBe(finalResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain idempotence with extreme whitespace patterns', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.array(
            fc.oneof(
              fc.constant(' '),
              fc.constant('\t'),
              fc.constant('\n')
            ),
            { minLength: 0, maxLength: 10 }
          ),
          fc.array(
            fc.oneof(
              fc.constant(' '),
              fc.constant('\t'),
              fc.constant('\n')
            ),
            { minLength: 0, maxLength: 10 }
          ),
          (text, leadingWsArray, trailingWsArray) => {
            // Create extreme whitespace pattern
            const leadingWs = leadingWsArray.join('');
            const trailingWs = trailingWsArray.join('');
            const withWhitespace = leadingWs + text + trailingWs;
            
            // Normalize once
            const normalizedOnce = validator.normalizeText(withWhitespace);
            
            // Normalize twice
            const normalizedTwice = validator.normalizeText(normalizedOnce);
            
            // Should be equal (idempotent)
            expect(normalizedOnce).toBe(normalizedTwice);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent with mixed content (alphanumeric, symbols, whitespace)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.oneof(
            fc.constant('  '),
            fc.constant('\t\n'),
            fc.constant('   \t\n   ')
          ),
          (text, whitespace) => {
            // Create mixed content
            const mixed = whitespace + text + whitespace;
            
            // Normalize once
            const normalizedOnce = validator.normalizeText(mixed);
            
            // Normalize twice
            const normalizedTwice = validator.normalizeText(normalizedOnce);
            
            // Normalize three times
            const normalizedThrice = validator.normalizeText(normalizedTwice);
            
            // All should be equal (idempotent)
            expect(normalizedOnce).toBe(normalizedTwice);
            expect(normalizedTwice).toBe(normalizedThrice);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
