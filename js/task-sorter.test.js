/**
 * Unit tests for TaskSorter
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskSorter } from './task-sorter.js';

describe('TaskSorter', () => {
  let mockStorage;
  let sorter;

  beforeEach(() => {
    // Mock StorageManager
    mockStorage = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      isAvailable: vi.fn(() => true)
    };
    
    sorter = new TaskSorter(mockStorage);
  });

  describe('Sort by Date - Oldest First', () => {
    it('should sort tasks by oldest first (ascending timestamp)', () => {
      const tasks = [
        { id: '3', text: 'Task 3', completed: false, createdAt: 1000 },
        { id: '1', text: 'Task 1', completed: false, createdAt: 500 },
        { id: '2', text: 'Task 2', completed: false, createdAt: 750 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_OLDEST);

      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
      expect(sorted[0].createdAt).toBe(500);
      expect(sorted[2].createdAt).toBe(1000);
    });

    it('should handle tasks with same timestamp', () => {
      const tasks = [
        { id: '1', text: 'Task 1', completed: false, createdAt: 1000 },
        { id: '2', text: 'Task 2', completed: false, createdAt: 1000 },
        { id: '3', text: 'Task 3', completed: false, createdAt: 500 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_OLDEST);

      expect(sorted[0].createdAt).toBe(500);
      expect(sorted[1].createdAt).toBe(1000);
      expect(sorted[2].createdAt).toBe(1000);
    });
  });

  describe('Sort by Date - Newest First', () => {
    it('should sort tasks by newest first (descending timestamp)', () => {
      const tasks = [
        { id: '1', text: 'Task 1', completed: false, createdAt: 500 },
        { id: '3', text: 'Task 3', completed: false, createdAt: 1000 },
        { id: '2', text: 'Task 2', completed: false, createdAt: 750 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_NEWEST);

      expect(sorted[0].id).toBe('3');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('1');
      expect(sorted[0].createdAt).toBe(1000);
      expect(sorted[2].createdAt).toBe(500);
    });
  });

  describe('Sort Alphabetically - A to Z', () => {
    it('should sort tasks alphabetically A to Z (case-insensitive)', () => {
      const tasks = [
        { id: '1', text: 'Zebra', completed: false, createdAt: 1000 },
        { id: '2', text: 'apple', completed: false, createdAt: 1001 },
        { id: '3', text: 'Banana', completed: false, createdAt: 1002 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);

      expect(sorted[0].text).toBe('apple');
      expect(sorted[1].text).toBe('Banana');
      expect(sorted[2].text).toBe('Zebra');
    });

    it('should handle tasks with same text (case variations)', () => {
      const tasks = [
        { id: '1', text: 'Task', completed: false, createdAt: 1000 },
        { id: '2', text: 'task', completed: false, createdAt: 1001 },
        { id: '3', text: 'TASK', completed: false, createdAt: 1002 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);

      // All should be considered equal in sorting
      expect(sorted.length).toBe(3);
    });
  });

  describe('Sort Alphabetically - Z to A', () => {
    it('should sort tasks alphabetically Z to A (case-insensitive)', () => {
      const tasks = [
        { id: '1', text: 'apple', completed: false, createdAt: 1000 },
        { id: '2', text: 'Zebra', completed: false, createdAt: 1001 },
        { id: '3', text: 'Banana', completed: false, createdAt: 1002 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_ZA);

      expect(sorted[0].text).toBe('Zebra');
      expect(sorted[1].text).toBe('Banana');
      expect(sorted[2].text).toBe('apple');
    });
  });

  describe('Sort by Status - Incomplete First', () => {
    it('should place all incomplete tasks before completed tasks', () => {
      const tasks = [
        { id: '1', text: 'Task 1', completed: true, createdAt: 1000 },
        { id: '2', text: 'Task 2', completed: false, createdAt: 1001 },
        { id: '3', text: 'Task 3', completed: true, createdAt: 1002 },
        { id: '4', text: 'Task 4', completed: false, createdAt: 1003 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);

      // First two should be incomplete
      expect(sorted[0].completed).toBe(false);
      expect(sorted[1].completed).toBe(false);
      // Last two should be complete
      expect(sorted[2].completed).toBe(true);
      expect(sorted[3].completed).toBe(true);
    });

    it('should maintain date order (newest first) within status groups', () => {
      const tasks = [
        { id: '1', text: 'Task 1', completed: false, createdAt: 1000 },
        { id: '2', text: 'Task 2', completed: false, createdAt: 1002 },
        { id: '3', text: 'Task 3', completed: true, createdAt: 1001 },
        { id: '4', text: 'Task 4', completed: true, createdAt: 1003 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);

      // Incomplete tasks sorted by date (newest first)
      expect(sorted[0].id).toBe('2'); // createdAt: 1002
      expect(sorted[1].id).toBe('1'); // createdAt: 1000
      // Complete tasks sorted by date (newest first)
      expect(sorted[2].id).toBe('4'); // createdAt: 1003
      expect(sorted[3].id).toBe('3'); // createdAt: 1001
    });
  });

  describe('Sort by Status - Complete First', () => {
    it('should place all completed tasks before incomplete tasks', () => {
      const tasks = [
        { id: '1', text: 'Task 1', completed: false, createdAt: 1000 },
        { id: '2', text: 'Task 2', completed: true, createdAt: 1001 },
        { id: '3', text: 'Task 3', completed: false, createdAt: 1002 },
        { id: '4', text: 'Task 4', completed: true, createdAt: 1003 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);

      // First two should be complete
      expect(sorted[0].completed).toBe(true);
      expect(sorted[1].completed).toBe(true);
      // Last two should be incomplete
      expect(sorted[2].completed).toBe(false);
      expect(sorted[3].completed).toBe(false);
    });

    it('should maintain date order (newest first) within status groups', () => {
      const tasks = [
        { id: '1', text: 'Task 1', completed: true, createdAt: 1000 },
        { id: '2', text: 'Task 2', completed: true, createdAt: 1002 },
        { id: '3', text: 'Task 3', completed: false, createdAt: 1001 },
        { id: '4', text: 'Task 4', completed: false, createdAt: 1003 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.STATUS_COMPLETE_FIRST);

      // Complete tasks sorted by date (newest first)
      expect(sorted[0].id).toBe('2'); // createdAt: 1002
      expect(sorted[1].id).toBe('1'); // createdAt: 1000
      // Incomplete tasks sorted by date (newest first)
      expect(sorted[2].id).toBe('4'); // createdAt: 1003
      expect(sorted[3].id).toBe('3'); // createdAt: 1001
    });
  });

  describe('Sort Preference Persistence', () => {
    it('should save sort preference to storage', () => {
      sorter.setSortPreference(TaskSorter.SortOption.ALPHA_AZ);

      expect(mockStorage.set).toHaveBeenCalledWith('sortPreference', TaskSorter.SortOption.ALPHA_AZ);
      expect(sorter.currentSortPreference).toBe(TaskSorter.SortOption.ALPHA_AZ);
    });

    it('should retrieve saved sort preference from storage', () => {
      mockStorage.get.mockReturnValue(TaskSorter.SortOption.DATE_OLDEST);

      const preference = sorter.getSortPreference();

      expect(mockStorage.get).toHaveBeenCalledWith('sortPreference');
      expect(preference).toBe(TaskSorter.SortOption.DATE_OLDEST);
    });

    it('should return default sort preference when none saved', () => {
      mockStorage.get.mockReturnValue(null);

      const preference = sorter.getSortPreference();

      expect(preference).toBe(TaskSorter.SortOption.DATE_NEWEST);
    });

    it('should return default when invalid preference saved', () => {
      mockStorage.get.mockReturnValue('invalid-option');

      const preference = sorter.getSortPreference();

      expect(preference).toBe(TaskSorter.SortOption.DATE_NEWEST);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty task list', () => {
      const tasks = [];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.DATE_NEWEST);

      expect(sorted).toEqual([]);
    });

    it('should handle single task', () => {
      const tasks = [
        { id: '1', text: 'Task 1', completed: false, createdAt: 1000 }
      ];

      const sorted = sorter.sort(tasks, TaskSorter.SortOption.ALPHA_AZ);

      expect(sorted.length).toBe(1);
      expect(sorted[0].id).toBe('1');
    });

    it('should not mutate original array', () => {
      const tasks = [
        { id: '2', text: 'Task 2', completed: false, createdAt: 1001 },
        { id: '1', text: 'Task 1', completed: false, createdAt: 1000 }
      ];
      const originalOrder = [...tasks];

      sorter.sort(tasks, TaskSorter.SortOption.DATE_OLDEST);

      // Original array should remain unchanged
      expect(tasks[0].id).toBe(originalOrder[0].id);
      expect(tasks[1].id).toBe(originalOrder[1].id);
    });

    it('should use default sort when invalid option provided', () => {
      const tasks = [
        { id: '2', text: 'Task 2', completed: false, createdAt: 1001 },
        { id: '1', text: 'Task 1', completed: false, createdAt: 1000 }
      ];

      const sorted = sorter.sort(tasks, 'invalid-option');

      // Should default to newest first
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
    });
  });
});
