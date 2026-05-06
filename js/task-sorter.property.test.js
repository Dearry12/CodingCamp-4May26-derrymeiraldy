import { describe, it, expect } from 'vitest';
import { TaskSorter } from './task-sorter.js';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for TaskSorter
 * Feature: dashboard-interactive-enhancements
 */
describe('TaskSorter - Property-Based Tests', () => {
  /**
   * Property 5: Sort by Date Oldest Produces Ascending Order
   * **Validates: Requirements 5.2**
   * 
   * For any task list, when sorted by date oldest first, the resulting list
   * SHALL be ordered such that for all adjacent tasks, the earlier task's
   * createdAt timestamp is less than or equal to the later task's createdAt timestamp.
   */
  describe('Property 5: Sort by Date Oldest Produces Ascending Order', () => {
    // Mock storage manager for TaskSorter
    const mockStorage = {
      get: () => null,
      set: () => true,
      remove: () => {},
      isAvailable: () => true
    };
    
    const sorter = new TaskSorter(mockStorage);

    // Generator for task objects with varied timestamps
    const taskArbitrary = fc.record({
      id: fc.string(),
      text: fc.string({ minLength: 1, maxLength: 50 }),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
    });

    it('should produce ascending timestamp order for any task list', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort by date oldest first using the public API
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_OLDEST);
            
            // Verify ascending order: for all adjacent pairs, earlier <= later
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeLessThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce ascending order when using sort method with DATE_OLDEST option', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort using the main sort method
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_OLDEST);
            
            // Verify ascending order
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeLessThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with identical timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 9999999999999 }),
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (timestamp, tasks) => {
            // Set all tasks to the same timestamp
            const tasksWithSameTimestamp = tasks.map(task => ({
              ...task,
              createdAt: timestamp
            }));
            
            // Sort by date oldest
            const sorted = sorter.sort(tasksWithSameTimestamp, TaskSorter.SortOption.DATE_OLDEST);
            
            // All timestamps should be equal
            sorted.forEach(task => {
              expect(task.createdAt).toBe(timestamp);
            });
            
            // Verify ascending order property still holds (all equal)
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeLessThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty task list', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (tasks) => {
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_OLDEST);
            
            // Empty list should remain empty
            expect(sorted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single task', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          (task) => {
            const sorted = sorter.sort([task], TaskSorter.SortOption.DATE_OLDEST);
            
            // Single task list should remain unchanged
            expect(sorted.length).toBe(1);
            expect(sorted[0]).toEqual(task);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all task properties during sort', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Sort by date oldest
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_OLDEST);
            
            // All original tasks should be present with all properties intact
            expect(sorted.length).toBe(tasks.length);
            
            // Verify each task from original list is in sorted list
            tasks.forEach(originalTask => {
              const foundTask = sorted.find(t => 
                t.id === originalTask.id &&
                t.text === originalTask.text &&
                t.completed === originalTask.completed &&
                t.createdAt === originalTask.createdAt
              );
              expect(foundTask).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with minimum and maximum timestamps', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Add tasks with extreme timestamps
            const minTimestamp = 1000000000000;
            const maxTimestamp = 9999999999999;
            
            const tasksWithExtremes = [
              { id: 'min', text: 'Min task', completed: false, createdAt: minTimestamp },
              ...tasks,
              { id: 'max', text: 'Max task', completed: false, createdAt: maxTimestamp }
            ];
            
            // Sort by date oldest
            const sorted = sorter.sort(tasksWithExtremes, TaskSorter.SortOption.DATE_OLDEST);
            
            // First task should have minimum timestamp
            expect(sorted[0].createdAt).toBe(minTimestamp);
            
            // Last task should have maximum timestamp
            expect(sorted[sorted.length - 1].createdAt).toBe(maxTimestamp);
            
            // Verify ascending order
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeLessThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the original task array', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Create a deep copy of the original array
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Sort by date oldest using the public API
            sorter.sort(tasks, TaskSorter.SortOption.DATE_OLDEST);
            
            // Original array should remain unchanged
            expect(tasks).toEqual(originalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with mixed completion status', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 20 }),
          (tasks) => {
            // Sort by date oldest
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_OLDEST);
            
            // Verify ascending timestamp order regardless of completion status
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeLessThanOrEqual(sorted[i + 1].createdAt);
            }
            
            // Verify all tasks are present
            expect(sorted.length).toBe(tasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results for the same input', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Sort the same list twice
            const sorted1 = sorter.sort([...tasks], TaskSorter.SortOption.DATE_OLDEST);
            const sorted2 = sorter.sort([...tasks], TaskSorter.SortOption.DATE_OLDEST);
            
            // Results should be identical
            expect(sorted1).toEqual(sorted2);
            
            // Both should be in ascending order
            for (let i = 0; i < sorted1.length - 1; i++) {
              expect(sorted1[i].createdAt).toBeLessThanOrEqual(sorted1[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with sequential timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 9999999990000 }),
          fc.integer({ min: 5, max: 15 }),
          (startTimestamp, count) => {
            // Create tasks with sequential timestamps in random order
            const tasks = Array.from({ length: count }, (_, i) => ({
              id: String(i),
              text: `Task ${i}`,
              completed: false,
              createdAt: startTimestamp + i * 1000
            }));
            
            // Shuffle the tasks
            const shuffled = [...tasks].sort(() => Math.random() - 0.5);
            
            // Sort by date oldest
            const sorted = sorter.sort(shuffled, TaskSorter.SortOption.DATE_OLDEST);
            
            // Should be in sequential order
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeLessThanOrEqual(sorted[i + 1].createdAt);
            }
            
            // First should have the earliest timestamp
            expect(sorted[0].createdAt).toBe(startTimestamp);
            
            // Last should have the latest timestamp
            expect(sorted[sorted.length - 1].createdAt).toBe(startTimestamp + (count - 1) * 1000);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle already sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks in ascending order
            const preSorted = [...tasks].sort((a, b) => a.createdAt - b.createdAt);
            
            // Sort again by date oldest
            const sorted = sorter.sort(preSorted, TaskSorter.SortOption.DATE_OLDEST);
            
            // Should still be in ascending order
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeLessThanOrEqual(sorted[i + 1].createdAt);
            }
            
            // Should match the pre-sorted order
            expect(sorted.map(t => t.createdAt)).toEqual(preSorted.map(t => t.createdAt));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle reverse sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks in descending order (reverse)
            const reverseSorted = [...tasks].sort((a, b) => b.createdAt - a.createdAt);
            
            // Sort by date oldest (should reverse the order)
            const sorted = sorter.sort(reverseSorted, TaskSorter.SortOption.DATE_OLDEST);
            
            // Should be in ascending order
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeLessThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Sort by Date Newest Produces Descending Order
   * **Validates: Requirements 5.3**
   * 
   * For any task list, when sorted by date newest first, the resulting list
   * SHALL be ordered such that for all adjacent tasks, the earlier task's
   * createdAt timestamp is greater than or equal to the later task's createdAt timestamp.
   */
  describe('Property 6: Sort by Date Newest Produces Descending Order', () => {
    // Mock storage manager for TaskSorter
    const mockStorage = {
      get: () => null,
      set: () => true,
      remove: () => {},
      isAvailable: () => true
    };
    
    const sorter = new TaskSorter(mockStorage);

    // Generator for task objects with varied timestamps
    const taskArbitrary = fc.record({
      id: fc.string(),
      text: fc.string({ minLength: 1, maxLength: 50 }),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
    });

    it('should produce descending timestamp order for any task list', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort by date newest first using the public API
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_NEWEST);
            
            // Verify descending order: for all adjacent pairs, earlier >= later
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce descending order when using sort method with DATE_NEWEST option', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort using the main sort method
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_NEWEST);
            
            // Verify descending order
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with identical timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 9999999999999 }),
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (timestamp, tasks) => {
            // Set all tasks to the same timestamp
            const tasksWithSameTimestamp = tasks.map(task => ({
              ...task,
              createdAt: timestamp
            }));
            
            // Sort by date newest
            const sorted = sorter.sort(tasksWithSameTimestamp, TaskSorter.SortOption.DATE_NEWEST);
            
            // All timestamps should be equal
            sorted.forEach(task => {
              expect(task.createdAt).toBe(timestamp);
            });
            
            // Verify descending order property still holds (all equal)
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty task list', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (tasks) => {
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_NEWEST);
            
            // Empty list should remain empty
            expect(sorted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single task', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          (task) => {
            const sorted = sorter.sort([task], TaskSorter.SortOption.DATE_NEWEST);
            
            // Single task list should remain unchanged
            expect(sorted.length).toBe(1);
            expect(sorted[0]).toEqual(task);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all task properties during sort', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Sort by date newest
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_NEWEST);
            
            // All original tasks should be present with all properties intact
            expect(sorted.length).toBe(tasks.length);
            
            // Verify each task from original list is in sorted list
            tasks.forEach(originalTask => {
              const foundTask = sorted.find(t => 
                t.id === originalTask.id &&
                t.text === originalTask.text &&
                t.completed === originalTask.completed &&
                t.createdAt === originalTask.createdAt
              );
              expect(foundTask).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with minimum and maximum timestamps', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Add tasks with extreme timestamps
            const minTimestamp = 1000000000000;
            const maxTimestamp = 9999999999999;
            
            const tasksWithExtremes = [
              { id: 'min', text: 'Min task', completed: false, createdAt: minTimestamp },
              ...tasks,
              { id: 'max', text: 'Max task', completed: false, createdAt: maxTimestamp }
            ];
            
            // Sort by date newest
            const sorted = sorter.sort(tasksWithExtremes, TaskSorter.SortOption.DATE_NEWEST);
            
            // First task should have maximum timestamp
            expect(sorted[0].createdAt).toBe(maxTimestamp);
            
            // Last task should have minimum timestamp
            expect(sorted[sorted.length - 1].createdAt).toBe(minTimestamp);
            
            // Verify descending order
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the original task array', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Create a deep copy of the original array
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Sort by date newest using the public API
            sorter.sort(tasks, TaskSorter.SortOption.DATE_NEWEST);
            
            // Original array should remain unchanged
            expect(tasks).toEqual(originalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with mixed completion status', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 20 }),
          (tasks) => {
            // Sort by date newest
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_NEWEST);
            
            // Verify descending timestamp order regardless of completion status
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
            }
            
            // Verify all tasks are present
            expect(sorted.length).toBe(tasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results for the same input', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Sort the same list twice
            const sorted1 = sorter.sort([...tasks], TaskSorter.SortOption.DATE_NEWEST);
            const sorted2 = sorter.sort([...tasks], TaskSorter.SortOption.DATE_NEWEST);
            
            // Results should be identical
            expect(sorted1).toEqual(sorted2);
            
            // Both should be in descending order
            for (let i = 0; i < sorted1.length - 1; i++) {
              expect(sorted1[i].createdAt).toBeGreaterThanOrEqual(sorted1[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with sequential timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 9999999990000 }),
          fc.integer({ min: 5, max: 15 }),
          (startTimestamp, count) => {
            // Create tasks with sequential timestamps in random order
            const tasks = Array.from({ length: count }, (_, i) => ({
              id: String(i),
              text: `Task ${i}`,
              completed: false,
              createdAt: startTimestamp + i * 1000
            }));
            
            // Shuffle the tasks
            const shuffled = [...tasks].sort(() => Math.random() - 0.5);
            
            // Sort by date newest
            const sorted = sorter.sort(shuffled, TaskSorter.SortOption.DATE_NEWEST);
            
            // Should be in descending order
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
            }
            
            // First should have the latest timestamp
            expect(sorted[0].createdAt).toBe(startTimestamp + (count - 1) * 1000);
            
            // Last should have the earliest timestamp
            expect(sorted[sorted.length - 1].createdAt).toBe(startTimestamp);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle already sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks in descending order
            const preSorted = [...tasks].sort((a, b) => b.createdAt - a.createdAt);
            
            // Sort again by date newest
            const sorted = sorter.sort(preSorted, TaskSorter.SortOption.DATE_NEWEST);
            
            // Should still be in descending order
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
            }
            
            // Should match the pre-sorted order
            expect(sorted.map(t => t.createdAt)).toEqual(preSorted.map(t => t.createdAt));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle reverse sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks in ascending order (reverse)
            const reverseSorted = [...tasks].sort((a, b) => a.createdAt - b.createdAt);
            
            // Sort by date newest (should reverse the order)
            const sorted = sorter.sort(reverseSorted, TaskSorter.SortOption.DATE_NEWEST);
            
            // Should be in descending order
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Sort Alphabetically A-Z Produces Ascending Order
   * **Validates: Requirements 5.4**
   * 
   * For any task list, when sorted alphabetically A to Z, the resulting list
   * SHALL be ordered such that for all adjacent tasks, the earlier task's text
   * is lexicographically less than or equal to the later task's text (case-insensitive comparison).
   */
  describe('Property 7: Sort Alphabetically A-Z Produces Ascending Order', () => {
    // Mock storage manager for TaskSorter
    const mockStorage = {
      get: () => null,
      set: () => true,
      remove: () => {},
      isAvailable: () => true
    };
    
    const sorter = new TaskSorter(mockStorage);

    // Generator for task objects with varied text
    const taskArbitrary = fc.record({
      id: fc.string(),
      text: fc.string({ minLength: 1, maxLength: 50 }),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
    });

    it('should produce ascending lexicographic order for any task list', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort alphabetically A to Z using the public API
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);
            
            // Verify ascending lexicographic order (case-insensitive): for all adjacent pairs, earlier <= later
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce ascending order when using sort method with ALPHA_AZ option', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort using the main sort method
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);
            
            // Verify ascending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with identical text (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (text, tasks) => {
            // Set all tasks to the same text (with varied casing)
            const tasksWithSameText = tasks.map((task, i) => ({
              ...task,
              text: i % 2 === 0 ? text.toLowerCase() : text.toUpperCase()
            }));
            
            // Sort alphabetically A to Z
            const sorted = sorter.sort(tasksWithSameText, TaskSorter.SortOption.ALPHA_AZ);
            
            // All texts should be equal (case-insensitive)
            sorted.forEach(task => {
              expect(task.text.toLowerCase()).toBe(text.toLowerCase());
            });
            
            // Verify ascending order property still holds (all equal)
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty task list', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (tasks) => {
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);
            
            // Empty list should remain empty
            expect(sorted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single task', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          (task) => {
            const sorted = sorter.sort([task], TaskSorter.SortOption.ALPHA_AZ);
            
            // Single task list should remain unchanged
            expect(sorted.length).toBe(1);
            expect(sorted[0]).toEqual(task);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all task properties during sort', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Sort alphabetically A to Z
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);
            
            // All original tasks should be present with all properties intact
            expect(sorted.length).toBe(tasks.length);
            
            // Verify each task from original list is in sorted list
            tasks.forEach(originalTask => {
              const foundTask = sorted.find(t => 
                t.id === originalTask.id &&
                t.text === originalTask.text &&
                t.completed === originalTask.completed &&
                t.createdAt === originalTask.createdAt
              );
              expect(foundTask).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with mixed case text', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Create tasks with mixed case variations
            const mixedCaseTasks = tasks.map((task, i) => ({
              ...task,
              text: i % 3 === 0 ? task.text.toLowerCase() : 
                    i % 3 === 1 ? task.text.toUpperCase() : 
                    task.text
            }));
            
            // Sort alphabetically A to Z
            const sorted = sorter.sort(mixedCaseTasks, TaskSorter.SortOption.ALPHA_AZ);
            
            // Verify ascending order (case-insensitive)
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the original task array', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Create a deep copy of the original array
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Sort alphabetically A to Z using the public API
            sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);
            
            // Original array should remain unchanged
            expect(tasks).toEqual(originalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with mixed completion status', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 20 }),
          (tasks) => {
            // Sort alphabetically A to Z
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);
            
            // Verify ascending lexicographic order regardless of completion status
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
            
            // Verify all tasks are present
            expect(sorted.length).toBe(tasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results for the same input', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Sort the same list twice
            const sorted1 = sorter.sort([...tasks], TaskSorter.SortOption.ALPHA_AZ);
            const sorted2 = sorter.sort([...tasks], TaskSorter.SortOption.ALPHA_AZ);
            
            // Results should be identical
            expect(sorted1).toEqual(sorted2);
            
            // Both should be in ascending lexicographic order
            for (let i = 0; i < sorted1.length - 1; i++) {
              const comparison = sorted1[i].text.toLowerCase().localeCompare(sorted1[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with special characters and numbers', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              text: fc.string({ minLength: 1, maxLength: 30 }),
              completed: fc.boolean(),
              createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
            }),
            { minLength: 2, maxLength: 15 }
          ),
          (tasks) => {
            // Sort alphabetically A to Z
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);
            
            // Verify ascending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle already sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks alphabetically A to Z
            const preSorted = [...tasks].sort((a, b) => 
              a.text.toLowerCase().localeCompare(b.text.toLowerCase())
            );
            
            // Sort again alphabetically A to Z
            const sorted = sorter.sort(preSorted, TaskSorter.SortOption.ALPHA_AZ);
            
            // Should still be in ascending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
            
            // Should match the pre-sorted order
            expect(sorted.map(t => t.text.toLowerCase())).toEqual(preSorted.map(t => t.text.toLowerCase()));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle reverse sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks alphabetically Z to A (reverse)
            const reverseSorted = [...tasks].sort((a, b) => 
              b.text.toLowerCase().localeCompare(a.text.toLowerCase())
            );
            
            // Sort alphabetically A to Z (should reverse the order)
            const sorted = sorter.sort(reverseSorted, TaskSorter.SortOption.ALPHA_AZ);
            
            // Should be in ascending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with whitespace in text', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              text: fc.string({ minLength: 1, maxLength: 30 }),
              completed: fc.boolean(),
              createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (tasks) => {
            // Sort alphabetically A to Z
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);
            
            // Verify ascending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with unicode characters', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              text: fc.string({ minLength: 1, maxLength: 20 }),
              completed: fc.boolean(),
              createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (tasks) => {
            // Sort alphabetically A to Z
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);
            
            // Verify ascending lexicographic order using localeCompare
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with very similar text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 3, max: 8 }),
          (baseText, count) => {
            // Create tasks with very similar text (adding suffixes)
            const tasks = Array.from({ length: count }, (_, i) => ({
              id: String(i),
              text: `${baseText}${i}`,
              completed: false,
              createdAt: 1000000000000 + i
            }));
            
            // Shuffle the tasks
            const shuffled = [...tasks].sort(() => Math.random() - 0.5);
            
            // Sort alphabetically A to Z
            const sorted = sorter.sort(shuffled, TaskSorter.SortOption.ALPHA_AZ);
            
            // Should be in ascending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Sort Alphabetically Z-A Produces Descending Order
   * **Validates: Requirements 5.5**
   * 
   * For any task list, when sorted alphabetically Z to A, the resulting list
   * SHALL be ordered such that for all adjacent tasks, the earlier task's text
   * is lexicographically greater than or equal to the later task's text (case-insensitive comparison).
   */
  describe('Property 8: Sort Alphabetically Z-A Produces Descending Order', () => {
    // Mock storage manager for TaskSorter
    const mockStorage = {
      get: () => null,
      set: () => true,
      remove: () => {},
      isAvailable: () => true
    };
    
    const sorter = new TaskSorter(mockStorage);

    // Generator for task objects with varied text
    const taskArbitrary = fc.record({
      id: fc.string(),
      text: fc.string({ minLength: 1, maxLength: 50 }),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
    });

    it('should produce descending lexicographic order for any task list', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort alphabetically Z to A using the public API
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_ZA);
            
            // Verify descending lexicographic order (case-insensitive): for all adjacent pairs, earlier >= later
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce descending order when using sort method with ALPHA_ZA option', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort using the main sort method
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_ZA);
            
            // Verify descending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with identical text (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (text, tasks) => {
            // Set all tasks to the same text (with varied casing)
            const tasksWithSameText = tasks.map((task, i) => ({
              ...task,
              text: i % 2 === 0 ? text.toLowerCase() : text.toUpperCase()
            }));
            
            // Sort alphabetically Z to A
            const sorted = sorter.sort(tasksWithSameText, TaskSorter.SortOption.ALPHA_ZA);
            
            // All texts should be equal (case-insensitive)
            sorted.forEach(task => {
              expect(task.text.toLowerCase()).toBe(text.toLowerCase());
            });
            
            // Verify descending order property still holds (all equal)
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty task list', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (tasks) => {
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_ZA);
            
            // Empty list should remain empty
            expect(sorted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single task', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          (task) => {
            const sorted = sorter.sort([task], TaskSorter.SortOption.ALPHA_ZA);
            
            // Single task list should remain unchanged
            expect(sorted.length).toBe(1);
            expect(sorted[0]).toEqual(task);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all task properties during sort', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Sort alphabetically Z to A
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_ZA);
            
            // All original tasks should be present with all properties intact
            expect(sorted.length).toBe(tasks.length);
            
            // Verify each task from original list is in sorted list
            tasks.forEach(originalTask => {
              const foundTask = sorted.find(t => 
                t.id === originalTask.id &&
                t.text === originalTask.text &&
                t.completed === originalTask.completed &&
                t.createdAt === originalTask.createdAt
              );
              expect(foundTask).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with mixed case text', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Create tasks with mixed case variations
            const mixedCaseTasks = tasks.map((task, i) => ({
              ...task,
              text: i % 3 === 0 ? task.text.toLowerCase() : 
                    i % 3 === 1 ? task.text.toUpperCase() : 
                    task.text
            }));
            
            // Sort alphabetically Z to A
            const sorted = sorter.sort(mixedCaseTasks, TaskSorter.SortOption.ALPHA_ZA);
            
            // Verify descending order (case-insensitive)
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the original task array', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Create a deep copy of the original array
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Sort alphabetically Z to A using the public API
            sorter.sort(tasks, TaskSorter.SortOption.ALPHA_ZA);
            
            // Original array should remain unchanged
            expect(tasks).toEqual(originalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with mixed completion status', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 20 }),
          (tasks) => {
            // Sort alphabetically Z to A
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_ZA);
            
            // Verify descending lexicographic order regardless of completion status
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
            
            // Verify all tasks are present
            expect(sorted.length).toBe(tasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results for the same input', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Sort the same list twice
            const sorted1 = sorter.sort([...tasks], TaskSorter.SortOption.ALPHA_ZA);
            const sorted2 = sorter.sort([...tasks], TaskSorter.SortOption.ALPHA_ZA);
            
            // Results should be identical
            expect(sorted1).toEqual(sorted2);
            
            // Both should be in descending lexicographic order
            for (let i = 0; i < sorted1.length - 1; i++) {
              const comparison = sorted1[i].text.toLowerCase().localeCompare(sorted1[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with special characters and numbers', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              text: fc.string({ minLength: 1, maxLength: 30 }),
              completed: fc.boolean(),
              createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
            }),
            { minLength: 2, maxLength: 15 }
          ),
          (tasks) => {
            // Sort alphabetically Z to A
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_ZA);
            
            // Verify descending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle already sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks alphabetically Z to A
            const preSorted = [...tasks].sort((a, b) => 
              b.text.toLowerCase().localeCompare(a.text.toLowerCase())
            );
            
            // Sort again alphabetically Z to A
            const sorted = sorter.sort(preSorted, TaskSorter.SortOption.ALPHA_ZA);
            
            // Should still be in descending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
            
            // Should match the pre-sorted order
            expect(sorted.map(t => t.text.toLowerCase())).toEqual(preSorted.map(t => t.text.toLowerCase()));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle reverse sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks alphabetically A to Z (reverse)
            const reverseSorted = [...tasks].sort((a, b) => 
              a.text.toLowerCase().localeCompare(b.text.toLowerCase())
            );
            
            // Sort alphabetically Z to A (should reverse the order)
            const sorted = sorter.sort(reverseSorted, TaskSorter.SortOption.ALPHA_ZA);
            
            // Should be in descending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with whitespace in text', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              text: fc.string({ minLength: 1, maxLength: 30 }),
              completed: fc.boolean(),
              createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (tasks) => {
            // Sort alphabetically Z to A
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_ZA);
            
            // Verify descending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with unicode characters', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              text: fc.string({ minLength: 1, maxLength: 20 }),
              completed: fc.boolean(),
              createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (tasks) => {
            // Sort alphabetically Z to A
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_ZA);
            
            // Verify descending lexicographic order using localeCompare
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with very similar text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 3, max: 8 }),
          (baseText, count) => {
            // Create tasks with very similar text (adding suffixes)
            const tasks = Array.from({ length: count }, (_, i) => ({
              id: String(i),
              text: `${baseText}${i}`,
              completed: false,
              createdAt: 1000000000000 + i
            }));
            
            // Shuffle the tasks
            const shuffled = [...tasks].sort(() => Math.random() - 0.5);
            
            // Sort alphabetically Z to A
            const sorted = sorter.sort(shuffled, TaskSorter.SortOption.ALPHA_ZA);
            
            // Should be in descending lexicographic order
            for (let i = 0; i < sorted.length - 1; i++) {
              const comparison = sorted[i].text.toLowerCase().localeCompare(sorted[i + 1].text.toLowerCase());
              expect(comparison).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Sort by Status Incomplete First Groups Correctly
   * **Validates: Requirements 5.6**
   * 
   * For any task list, when sorted by status with incomplete first, the resulting list
   * SHALL have all incomplete tasks appearing before all completed tasks.
   */
  describe('Property 9: Sort by Status Incomplete First Groups Correctly', () => {
    // Mock storage manager for TaskSorter
    const mockStorage = {
      get: () => null,
      set: () => true,
      remove: () => {},
      isAvailable: () => true
    };
    
    const sorter = new TaskSorter(mockStorage);

    // Generator for task objects with mixed completion status
    const taskArbitrary = fc.record({
      id: fc.string(),
      text: fc.string({ minLength: 1, maxLength: 50 }),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
    });

    it('should place all incomplete tasks before all completed tasks', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort by status incomplete first using the public API
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Find the index of the first completed task
            const firstCompletedIndex = sorted.findIndex(task => task.completed);
            
            // If there are completed tasks, verify all incomplete tasks come before them
            if (firstCompletedIndex !== -1) {
              // All tasks before firstCompletedIndex should be incomplete
              for (let i = 0; i < firstCompletedIndex; i++) {
                expect(sorted[i].completed).toBe(false);
              }
              
              // All tasks from firstCompletedIndex onwards should be completed
              for (let i = firstCompletedIndex; i < sorted.length; i++) {
                expect(sorted[i].completed).toBe(true);
              }
            } else {
              // No completed tasks, so all should be incomplete
              sorted.forEach(task => {
                expect(task.completed).toBe(false);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should group incomplete and completed tasks correctly', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort by status incomplete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Separate into incomplete and completed groups
            const incompleteTasks = sorted.filter(task => !task.completed);
            const completedTasks = sorted.filter(task => task.completed);
            
            // Verify the sorted list is incomplete tasks followed by completed tasks
            const expectedOrder = [...incompleteTasks, ...completedTasks];
            
            // Check that incomplete tasks appear first
            for (let i = 0; i < incompleteTasks.length; i++) {
              expect(sorted[i].completed).toBe(false);
            }
            
            // Check that completed tasks appear after
            for (let i = incompleteTasks.length; i < sorted.length; i++) {
              expect(sorted[i].completed).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty task list', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (tasks) => {
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Empty list should remain empty
            expect(sorted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single task', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          (task) => {
            const sorted = sorter.sort([task], TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Single task list should remain unchanged
            expect(sorted.length).toBe(1);
            expect(sorted[0]).toEqual(task);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all incomplete tasks', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Set all tasks to incomplete
            const incompleteTasks = tasks.map(task => ({
              ...task,
              completed: false
            }));
            
            // Sort by status incomplete first
            const sorted = sorter.sort(incompleteTasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // All tasks should remain incomplete
            sorted.forEach(task => {
              expect(task.completed).toBe(false);
            });
            
            // All tasks should be present
            expect(sorted.length).toBe(incompleteTasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all completed tasks', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Set all tasks to completed
            const completedTasks = tasks.map(task => ({
              ...task,
              completed: true
            }));
            
            // Sort by status incomplete first
            const sorted = sorter.sort(completedTasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // All tasks should remain completed
            sorted.forEach(task => {
              expect(task.completed).toBe(true);
            });
            
            // All tasks should be present
            expect(sorted.length).toBe(completedTasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all task properties during sort', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Sort by status incomplete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // All original tasks should be present with all properties intact
            expect(sorted.length).toBe(tasks.length);
            
            // Verify each task from original list is in sorted list
            tasks.forEach(originalTask => {
              const foundTask = sorted.find(t => 
                t.id === originalTask.id &&
                t.text === originalTask.text &&
                t.completed === originalTask.completed &&
                t.createdAt === originalTask.createdAt
              );
              expect(foundTask).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the original task array', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Create a deep copy of the original array
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Sort by status incomplete first using the public API
            sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Original array should remain unchanged
            expect(tasks).toEqual(originalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results for the same input', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Sort the same list twice
            const sorted1 = sorter.sort([...tasks], TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            const sorted2 = sorter.sort([...tasks], TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Results should be identical
            expect(sorted1).toEqual(sorted2);
            
            // Both should have incomplete tasks before completed tasks
            const firstCompleted1 = sorted1.findIndex(t => t.completed);
            const firstCompleted2 = sorted2.findIndex(t => t.completed);
            expect(firstCompleted1).toBe(firstCompleted2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain secondary sort by date (newest first) within status groups', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 20 }),
          (tasks) => {
            // Sort by status incomplete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Find the boundary between incomplete and completed tasks
            const firstCompletedIndex = sorted.findIndex(task => task.completed);
            
            if (firstCompletedIndex === -1) {
              // All incomplete - verify descending date order
              for (let i = 0; i < sorted.length - 1; i++) {
                expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
              }
            } else if (firstCompletedIndex === 0) {
              // All completed - verify descending date order
              for (let i = 0; i < sorted.length - 1; i++) {
                expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
              }
            } else {
              // Mixed - verify descending date order within each group
              // Check incomplete group
              for (let i = 0; i < firstCompletedIndex - 1; i++) {
                expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
              }
              
              // Check completed group
              for (let i = firstCompletedIndex; i < sorted.length - 1; i++) {
                expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with mixed timestamps and completion status', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 20 }),
          (tasks) => {
            // Sort by status incomplete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Verify grouping: all incomplete before all completed
            let seenCompleted = false;
            sorted.forEach(task => {
              if (task.completed) {
                seenCompleted = true;
              } else {
                // If we see an incomplete task, we should not have seen any completed tasks yet
                expect(seenCompleted).toBe(false);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with identical timestamps but different completion status', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 9999999999999 }),
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (timestamp, tasks) => {
            // Set all tasks to the same timestamp but vary completion status
            const tasksWithSameTimestamp = tasks.map(task => ({
              ...task,
              createdAt: timestamp
            }));
            
            // Sort by status incomplete first
            const sorted = sorter.sort(tasksWithSameTimestamp, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Verify all incomplete tasks come before all completed tasks
            const firstCompletedIndex = sorted.findIndex(task => task.completed);
            
            if (firstCompletedIndex !== -1) {
              // All tasks before firstCompletedIndex should be incomplete
              for (let i = 0; i < firstCompletedIndex; i++) {
                expect(sorted[i].completed).toBe(false);
              }
              
              // All tasks from firstCompletedIndex onwards should be completed
              for (let i = firstCompletedIndex; i < sorted.length; i++) {
                expect(sorted[i].completed).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle already sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks by status incomplete first
            const preSorted = [...tasks].sort((a, b) => {
              if (a.completed === b.completed) {
                return b.createdAt - a.createdAt;
              }
              return a.completed ? 1 : -1;
            });
            
            // Sort again by status incomplete first
            const sorted = sorter.sort(preSorted, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Verify all incomplete tasks come before all completed tasks
            const firstCompletedIndex = sorted.findIndex(task => task.completed);
            
            if (firstCompletedIndex !== -1) {
              for (let i = 0; i < firstCompletedIndex; i++) {
                expect(sorted[i].completed).toBe(false);
              }
              
              for (let i = firstCompletedIndex; i < sorted.length; i++) {
                expect(sorted[i].completed).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle reverse sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks by status completed first (reverse)
            const reverseSorted = [...tasks].sort((a, b) => {
              if (a.completed === b.completed) {
                return b.createdAt - a.createdAt;
              }
              return a.completed ? -1 : 1;
            });
            
            // Sort by status incomplete first (should reverse the grouping)
            const sorted = sorter.sort(reverseSorted, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Verify all incomplete tasks come before all completed tasks
            const firstCompletedIndex = sorted.findIndex(task => task.completed);
            
            if (firstCompletedIndex !== -1) {
              for (let i = 0; i < firstCompletedIndex; i++) {
                expect(sorted[i].completed).toBe(false);
              }
              
              for (let i = firstCompletedIndex; i < sorted.length; i++) {
                expect(sorted[i].completed).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with specific completion status distribution', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (incompleteCount, completedCount) => {
            // Create specific number of incomplete and completed tasks
            const incompleteTasks = Array.from({ length: incompleteCount }, (_, i) => ({
              id: `incomplete-${i}`,
              text: `Incomplete task ${i}`,
              completed: false,
              createdAt: 1000000000000 + i * 1000
            }));
            
            const completedTasks = Array.from({ length: completedCount }, (_, i) => ({
              id: `completed-${i}`,
              text: `Completed task ${i}`,
              completed: true,
              createdAt: 2000000000000 + i * 1000
            }));
            
            // Mix them randomly
            const tasks = [...incompleteTasks, ...completedTasks].sort(() => Math.random() - 0.5);
            
            // Sort by status incomplete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // First incompleteCount tasks should be incomplete
            for (let i = 0; i < incompleteCount; i++) {
              expect(sorted[i].completed).toBe(false);
            }
            
            // Remaining tasks should be completed
            for (let i = incompleteCount; i < sorted.length; i++) {
              expect(sorted[i].completed).toBe(true);
            }
            
            // Verify total count
            expect(sorted.length).toBe(incompleteCount + completedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Sort by Status Complete First Groups Correctly
   * **Validates: Requirements 5.7**
   * 
   * For any task list, when sorted by status with complete first, the resulting list
   * SHALL have all completed tasks appearing before all incomplete tasks.
   */
  describe('Property 10: Sort by Status Complete First Groups Correctly', () => {
    // Mock storage manager for TaskSorter
    const mockStorage = {
      get: () => null,
      set: () => true,
      remove: () => {},
      isAvailable: () => true
    };
    
    const sorter = new TaskSorter(mockStorage);

    // Generator for task objects with mixed completion status
    const taskArbitrary = fc.record({
      id: fc.string(),
      text: fc.string({ minLength: 1, maxLength: 50 }),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
    });

    it('should place all completed tasks before all incomplete tasks', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort by status complete first using the public API
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Find the index of the first incomplete task
            const firstIncompleteIndex = sorted.findIndex(task => !task.completed);
            
            // If there are incomplete tasks, verify all completed tasks come before them
            if (firstIncompleteIndex !== -1) {
              // All tasks before firstIncompleteIndex should be completed
              for (let i = 0; i < firstIncompleteIndex; i++) {
                expect(sorted[i].completed).toBe(true);
              }
              
              // All tasks from firstIncompleteIndex onwards should be incomplete
              for (let i = firstIncompleteIndex; i < sorted.length; i++) {
                expect(sorted[i].completed).toBe(false);
              }
            } else {
              // No incomplete tasks, so all should be completed
              sorted.forEach(task => {
                expect(task.completed).toBe(true);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should group completed and incomplete tasks correctly', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
          (tasks) => {
            // Sort by status complete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Separate into completed and incomplete groups
            const completedTasks = sorted.filter(task => task.completed);
            const incompleteTasks = sorted.filter(task => !task.completed);
            
            // Verify the sorted list is completed tasks followed by incomplete tasks
            const expectedOrder = [...completedTasks, ...incompleteTasks];
            
            // Check that completed tasks appear first
            for (let i = 0; i < completedTasks.length; i++) {
              expect(sorted[i].completed).toBe(true);
            }
            
            // Check that incomplete tasks appear after
            for (let i = completedTasks.length; i < sorted.length; i++) {
              expect(sorted[i].completed).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty task list', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (tasks) => {
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Empty list should remain empty
            expect(sorted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single task', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          (task) => {
            const sorted = sorter.sort([task], TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Single task list should remain unchanged
            expect(sorted.length).toBe(1);
            expect(sorted[0]).toEqual(task);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all completed tasks', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Set all tasks to completed
            const completedTasks = tasks.map(task => ({
              ...task,
              completed: true
            }));
            
            // Sort by status complete first
            const sorted = sorter.sort(completedTasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // All tasks should remain completed
            sorted.forEach(task => {
              expect(task.completed).toBe(true);
            });
            
            // All tasks should be present
            expect(sorted.length).toBe(completedTasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all incomplete tasks', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Set all tasks to incomplete
            const incompleteTasks = tasks.map(task => ({
              ...task,
              completed: false
            }));
            
            // Sort by status complete first
            const sorted = sorter.sort(incompleteTasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // All tasks should remain incomplete
            sorted.forEach(task => {
              expect(task.completed).toBe(false);
            });
            
            // All tasks should be present
            expect(sorted.length).toBe(incompleteTasks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all task properties during sort', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 1, maxLength: 20 }),
          (tasks) => {
            // Sort by status complete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // All original tasks should be present with all properties intact
            expect(sorted.length).toBe(tasks.length);
            
            // Verify each task from original list is in sorted list
            tasks.forEach(originalTask => {
              const foundTask = sorted.find(t => 
                t.id === originalTask.id &&
                t.text === originalTask.text &&
                t.completed === originalTask.completed &&
                t.createdAt === originalTask.createdAt
              );
              expect(foundTask).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the original task array', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Create a deep copy of the original array
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Sort by status complete first using the public API
            sorter.sort(tasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Original array should remain unchanged
            expect(tasks).toEqual(originalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results for the same input', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Sort the same list twice
            const sorted1 = sorter.sort([...tasks], TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            const sorted2 = sorter.sort([...tasks], TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Results should be identical
            expect(sorted1).toEqual(sorted2);
            
            // Both should have completed tasks before incomplete tasks
            const firstIncompleteIndex1 = sorted1.findIndex(task => !task.completed);
            const firstIncompleteIndex2 = sorted2.findIndex(task => !task.completed);
            
            expect(firstIncompleteIndex1).toBe(firstIncompleteIndex2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with varied timestamps', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 20 }),
          (tasks) => {
            // Sort by status complete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Verify all completed tasks come before all incomplete tasks
            const firstIncompleteIndex = sorted.findIndex(task => !task.completed);
            
            if (firstIncompleteIndex !== -1) {
              // All tasks before firstIncompleteIndex should be completed
              for (let i = 0; i < firstIncompleteIndex; i++) {
                expect(sorted[i].completed).toBe(true);
              }
              
              // All tasks from firstIncompleteIndex onwards should be incomplete
              for (let i = firstIncompleteIndex; i < sorted.length; i++) {
                expect(sorted[i].completed).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with identical timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 9999999999999 }),
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (timestamp, tasks) => {
            // Set all tasks to the same timestamp
            const tasksWithSameTimestamp = tasks.map(task => ({
              ...task,
              createdAt: timestamp
            }));
            
            // Sort by status complete first
            const sorted = sorter.sort(tasksWithSameTimestamp, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Verify all completed tasks come before all incomplete tasks
            const firstIncompleteIndex = sorted.findIndex(task => !task.completed);
            
            if (firstIncompleteIndex !== -1) {
              // All tasks before firstIncompleteIndex should be completed
              for (let i = 0; i < firstIncompleteIndex; i++) {
                expect(sorted[i].completed).toBe(true);
              }
              
              // All tasks from firstIncompleteIndex onwards should be incomplete
              for (let i = firstIncompleteIndex; i < sorted.length; i++) {
                expect(sorted[i].completed).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle already sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks by status complete first
            const preSorted = [...tasks].sort((a, b) => {
              if (a.completed === b.completed) {
                return b.createdAt - a.createdAt;
              }
              return a.completed ? -1 : 1;
            });
            
            // Sort again by status complete first
            const sorted = sorter.sort(preSorted, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Verify all completed tasks come before all incomplete tasks
            const firstIncompleteIndex = sorted.findIndex(task => !task.completed);
            
            if (firstIncompleteIndex !== -1) {
              for (let i = 0; i < firstIncompleteIndex; i++) {
                expect(sorted[i].completed).toBe(true);
              }
              
              for (let i = firstIncompleteIndex; i < sorted.length; i++) {
                expect(sorted[i].completed).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle reverse sorted lists', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Pre-sort the tasks by status incomplete first (reverse)
            const reverseSorted = [...tasks].sort((a, b) => {
              if (a.completed === b.completed) {
                return b.createdAt - a.createdAt;
              }
              return a.completed ? 1 : -1;
            });
            
            // Sort by status complete first (should reverse the grouping)
            const sorted = sorter.sort(reverseSorted, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Verify all completed tasks come before all incomplete tasks
            const firstIncompleteIndex = sorted.findIndex(task => !task.completed);
            
            if (firstIncompleteIndex !== -1) {
              for (let i = 0; i < firstIncompleteIndex; i++) {
                expect(sorted[i].completed).toBe(true);
              }
              
              for (let i = firstIncompleteIndex; i < sorted.length; i++) {
                expect(sorted[i].completed).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with specific completion status distribution', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (completedCount, incompleteCount) => {
            // Create specific number of completed and incomplete tasks
            const completedTasks = Array.from({ length: completedCount }, (_, i) => ({
              id: `completed-${i}`,
              text: `Completed task ${i}`,
              completed: true,
              createdAt: 1000000000000 + i * 1000
            }));
            
            const incompleteTasks = Array.from({ length: incompleteCount }, (_, i) => ({
              id: `incomplete-${i}`,
              text: `Incomplete task ${i}`,
              completed: false,
              createdAt: 2000000000000 + i * 1000
            }));
            
            // Mix them randomly
            const tasks = [...completedTasks, ...incompleteTasks].sort(() => Math.random() - 0.5);
            
            // Sort by status complete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // First completedCount tasks should be completed
            for (let i = 0; i < completedCount; i++) {
              expect(sorted[i].completed).toBe(true);
            }
            
            // Remaining tasks should be incomplete
            for (let i = completedCount; i < sorted.length; i++) {
              expect(sorted[i].completed).toBe(false);
            }
            
            // Verify total count
            expect(sorted.length).toBe(completedCount + incompleteCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Stable Sort Maintains Relative Order
   * **Validates: Requirements 5.12**
   * 
   * For any task list sorted by completion status, when multiple tasks share
   * the same completion status, those tasks SHALL maintain their relative order
   * by creation date (newest first) from before the sort operation.
   */
  describe('Property 11: Stable Sort Maintains Relative Order', () => {
    // Mock storage manager for TaskSorter
    const mockStorage = {
      get: () => null,
      set: () => true,
      remove: () => {},
      isAvailable: () => true
    };
    
    const sorter = new TaskSorter(mockStorage);

    // Generator for task objects with varied timestamps
    const taskArbitrary = fc.record({
      id: fc.string(),
      text: fc.string({ minLength: 1, maxLength: 50 }),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 1000000000000, max: 9999999999999 })
    });

    it('should maintain relative date order within status groups when sorting by status incomplete first', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 20 }),
          (tasks) => {
            // Sort by status incomplete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Find the boundary between incomplete and complete tasks
            const firstCompleteIndex = sorted.findIndex(t => t.completed);
            
            // Check incomplete tasks (if any) are sorted by date newest first
            if (firstCompleteIndex > 0) {
              for (let i = 0; i < firstCompleteIndex - 1; i++) {
                expect(sorted[i].completed).toBe(false);
                expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
              }
            } else if (firstCompleteIndex === -1 && sorted.length > 0) {
              // All tasks are incomplete
              for (let i = 0; i < sorted.length - 1; i++) {
                expect(sorted[i].completed).toBe(false);
                expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
              }
            }
            
            // Check complete tasks (if any) are sorted by date newest first
            if (firstCompleteIndex !== -1) {
              for (let i = firstCompleteIndex; i < sorted.length - 1; i++) {
                expect(sorted[i].completed).toBe(true);
                expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain relative date order within status groups when sorting by status complete first', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 20 }),
          (tasks) => {
            // Sort by status complete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);
            
            // Find the boundary between complete and incomplete tasks
            const firstIncompleteIndex = sorted.findIndex(t => !t.completed);
            
            // Check complete tasks (if any) are sorted by date newest first
            if (firstIncompleteIndex > 0) {
              for (let i = 0; i < firstIncompleteIndex - 1; i++) {
                expect(sorted[i].completed).toBe(true);
                expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
              }
            } else if (firstIncompleteIndex === -1 && sorted.length > 0) {
              // All tasks are complete
              for (let i = 0; i < sorted.length - 1; i++) {
                expect(sorted[i].completed).toBe(true);
                expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
              }
            }
            
            // Check incomplete tasks (if any) are sorted by date newest first
            if (firstIncompleteIndex !== -1) {
              for (let i = firstIncompleteIndex; i < sorted.length - 1; i++) {
                expect(sorted[i].completed).toBe(false);
                expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain date order for tasks with same status and varied timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 10 }),
          fc.integer({ min: 3, max: 10 }),
          fc.integer({ min: 1000000000000, max: 9999999990000 }),
          (completedCount, incompleteCount, startTimestamp) => {
            // Create completed tasks with sequential timestamps
            const completedTasks = Array.from({ length: completedCount }, (_, i) => ({
              id: `completed-${i}`,
              text: `Completed task ${i}`,
              completed: true,
              createdAt: startTimestamp + i * 1000
            }));
            
            // Create incomplete tasks with sequential timestamps
            const incompleteTasks = Array.from({ length: incompleteCount }, (_, i) => ({
              id: `incomplete-${i}`,
              text: `Incomplete task ${i}`,
              completed: false,
              createdAt: startTimestamp + 100000 + i * 1000
            }));
            
            // Mix them randomly
            const tasks = [...completedTasks, ...incompleteTasks].sort(() => Math.random() - 0.5);
            
            // Sort by status incomplete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Extract incomplete and complete groups
            const sortedIncomplete = sorted.filter(t => !t.completed);
            const sortedComplete = sorted.filter(t => t.completed);
            
            // Verify incomplete tasks are in descending date order (newest first)
            for (let i = 0; i < sortedIncomplete.length - 1; i++) {
              expect(sortedIncomplete[i].createdAt).toBeGreaterThanOrEqual(sortedIncomplete[i + 1].createdAt);
            }
            
            // Verify complete tasks are in descending date order (newest first)
            for (let i = 0; i < sortedComplete.length - 1; i++) {
              expect(sortedComplete[i].createdAt).toBeGreaterThanOrEqual(sortedComplete[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle tasks with identical timestamps within same status group', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 9999999999999 }),
          fc.integer({ min: 2, max: 8 }),
          (timestamp, count) => {
            // Create multiple tasks with same status and same timestamp
            const tasks = Array.from({ length: count }, (_, i) => ({
              id: `task-${i}`,
              text: `Task ${i}`,
              completed: i % 2 === 0, // Alternate between complete and incomplete
              createdAt: timestamp
            }));
            
            // Sort by status incomplete first
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Verify grouping by status
            const incompleteTasks = sorted.filter(t => !t.completed);
            const completeTasks = sorted.filter(t => t.completed);
            
            // All incomplete should come before complete
            if (incompleteTasks.length > 0 && completeTasks.length > 0) {
              const lastIncompleteIndex = sorted.lastIndexOf(incompleteTasks[incompleteTasks.length - 1]);
              const firstCompleteIndex = sorted.indexOf(completeTasks[0]);
              expect(lastIncompleteIndex).toBeLessThan(firstCompleteIndex);
            }
            
            // Within each group, timestamps should be equal (stable sort property holds)
            incompleteTasks.forEach(task => {
              expect(task.createdAt).toBe(timestamp);
            });
            completeTasks.forEach(task => {
              expect(task.createdAt).toBe(timestamp);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve relative order when all tasks have same status', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.array(taskArbitrary, { minLength: 2, maxLength: 15 }),
          (completionStatus, tasks) => {
            // Set all tasks to the same completion status
            const tasksWithSameStatus = tasks.map(task => ({
              ...task,
              completed: completionStatus
            }));
            
            // Sort by status incomplete first
            const sorted = sorter.sort(tasksWithSameStatus, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // All tasks should have the same status
            sorted.forEach(task => {
              expect(task.completed).toBe(completionStatus);
            });
            
            // Tasks should be sorted by date newest first
            for (let i = 0; i < sorted.length - 1; i++) {
              expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain stable sort for mixed status with specific timestamp patterns', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 9999999990000 }),
          (baseTimestamp) => {
            // Create a specific pattern: 3 incomplete (newest to oldest), 3 complete (newest to oldest)
            const tasks = [
              { id: 'inc-1', text: 'Incomplete 1', completed: false, createdAt: baseTimestamp + 5000 },
              { id: 'inc-2', text: 'Incomplete 2', completed: false, createdAt: baseTimestamp + 3000 },
              { id: 'inc-3', text: 'Incomplete 3', completed: false, createdAt: baseTimestamp + 1000 },
              { id: 'comp-1', text: 'Complete 1', completed: true, createdAt: baseTimestamp + 4000 },
              { id: 'comp-2', text: 'Complete 2', completed: true, createdAt: baseTimestamp + 2000 },
              { id: 'comp-3', text: 'Complete 3', completed: true, createdAt: baseTimestamp }
            ];
            
            // Shuffle the tasks
            const shuffled = [...tasks].sort(() => Math.random() - 0.5);
            
            // Sort by status incomplete first
            const sorted = sorter.sort(shuffled, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Verify incomplete tasks come first
            expect(sorted[0].completed).toBe(false);
            expect(sorted[1].completed).toBe(false);
            expect(sorted[2].completed).toBe(false);
            
            // Verify complete tasks come after
            expect(sorted[3].completed).toBe(true);
            expect(sorted[4].completed).toBe(true);
            expect(sorted[5].completed).toBe(true);
            
            // Verify incomplete tasks are in descending date order
            expect(sorted[0].createdAt).toBe(baseTimestamp + 5000);
            expect(sorted[1].createdAt).toBe(baseTimestamp + 3000);
            expect(sorted[2].createdAt).toBe(baseTimestamp + 1000);
            
            // Verify complete tasks are in descending date order
            expect(sorted[3].createdAt).toBe(baseTimestamp + 4000);
            expect(sorted[4].createdAt).toBe(baseTimestamp + 2000);
            expect(sorted[5].createdAt).toBe(baseTimestamp);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty task list', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (tasks) => {
            const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Empty list should remain empty
            expect(sorted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single task', () => {
      fc.assert(
        fc.property(
          taskArbitrary,
          (task) => {
            const sorted = sorter.sort([task], TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Single task list should remain unchanged
            expect(sorted.length).toBe(1);
            expect(sorted[0]).toEqual(task);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the original task array', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Create a deep copy of the original array
            const originalTasks = JSON.parse(JSON.stringify(tasks));
            
            // Sort by status incomplete first
            sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Original array should remain unchanged
            expect(tasks).toEqual(originalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results for the same input', () => {
      fc.assert(
        fc.property(
          fc.array(taskArbitrary, { minLength: 2, maxLength: 10 }),
          (tasks) => {
            // Sort the same list twice
            const sorted1 = sorter.sort([...tasks], TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            const sorted2 = sorter.sort([...tasks], TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
            
            // Results should be identical
            expect(sorted1).toEqual(sorted2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
