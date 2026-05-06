import { describe, it, expect, beforeEach } from 'vitest';
import { TaskValidator } from './task-validator.js';

describe('TaskValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new TaskValidator();
  });

  describe('Empty Input Rejection', () => {
    it('should reject null input', () => {
      const result = validator.validate(null, []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Task cannot be empty');
    });

    it('should reject undefined input', () => {
      const result = validator.validate(undefined, []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Task cannot be empty');
    });

    it('should reject empty string', () => {
      const result = validator.validate('', []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Task cannot be empty');
    });

    it('should reject whitespace-only string', () => {
      const result = validator.validate('   ', []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Task cannot be empty');
    });

    it('should reject tabs and newlines only', () => {
      const result = validator.validate('\t\n  \t', []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Task cannot be empty');
    });

    it('should reject non-string input (number)', () => {
      const result = validator.validate(123, []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Task cannot be empty');
    });

    it('should reject non-string input (object)', () => {
      const result = validator.validate({}, []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Task cannot be empty');
    });

    it('should reject non-string input (array)', () => {
      const result = validator.validate([], []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Task cannot be empty');
    });
  });

  describe('Duplicate Detection Examples', () => {
    it('should detect exact duplicate', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('Buy groceries', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should allow non-duplicate task', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('Walk the dog', existingTasks);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should allow first task when list is empty', () => {
      const result = validator.validate('First task', []);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should detect duplicate in list with multiple tasks', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 },
        { id: '2', text: 'Walk the dog', completed: false, createdAt: 2000 },
        { id: '3', text: 'Read a book', completed: true, createdAt: 3000 }
      ];
      
      const result = validator.validate('Walk the dog', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate of completed task', () => {
      const existingTasks = [
        { id: '1', text: 'Read a book', completed: true, createdAt: 1000 }
      ];
      
      const result = validator.validate('Read a book', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should allow similar but different tasks', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('Buy grocery', existingTasks);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });
  });

  describe('Deleted Tasks Can Be Re-added', () => {
    it('should allow adding task that was previously deleted', () => {
      // Simulate a task list where a task was deleted
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 },
        { id: '3', text: 'Read a book', completed: true, createdAt: 3000 }
        // Task with id '2' ('Walk the dog') was deleted
      ];
      
      const result = validator.validate('Walk the dog', existingTasks);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should allow re-adding task to empty list after all tasks deleted', () => {
      // All tasks were deleted
      const existingTasks = [];
      
      const result = validator.validate('Previously deleted task', existingTasks);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should only check against current tasks, not deleted ones', () => {
      const existingTasks = [
        { id: '1', text: 'Current task', completed: false, createdAt: 1000 }
      ];
      
      // This task was deleted, so it should be allowed
      const result = validator.validate('Deleted task', existingTasks);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });
  });

  describe('Case-Insensitive Comparison', () => {
    it('should detect duplicate with different case (lowercase vs uppercase)', () => {
      const existingTasks = [
        { id: '1', text: 'Buy Groceries', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('buy groceries', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate with different case (uppercase vs lowercase)', () => {
      const existingTasks = [
        { id: '1', text: 'walk the dog', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('WALK THE DOG', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate with mixed case', () => {
      const existingTasks = [
        { id: '1', text: 'ReAd A bOoK', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('read a book', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate with all caps', () => {
      const existingTasks = [
        { id: '1', text: 'URGENT TASK', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('urgent task', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should allow different tasks regardless of case', () => {
      const existingTasks = [
        { id: '1', text: 'Buy Groceries', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('WALK THE DOG', existingTasks);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });
  });

  describe('Whitespace Trimming', () => {
    it('should detect duplicate with leading whitespace', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('   Buy groceries', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate with trailing whitespace', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('Buy groceries   ', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate with both leading and trailing whitespace', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('   Buy groceries   ', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate when existing task has whitespace', () => {
      const existingTasks = [
        { id: '1', text: '  Buy groceries  ', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('Buy groceries', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate when both have whitespace', () => {
      const existingTasks = [
        { id: '1', text: '  Buy groceries  ', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('   Buy groceries   ', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate with tabs and newlines', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('\t\nBuy groceries\t\n', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should allow different tasks even with whitespace variations', () => {
      const existingTasks = [
        { id: '1', text: '  Buy groceries  ', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('   Walk the dog   ', existingTasks);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });
  });

  describe('Combined Case-Insensitive and Whitespace Trimming', () => {
    it('should detect duplicate with different case and whitespace', () => {
      const existingTasks = [
        { id: '1', text: 'Buy Groceries', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('  buy groceries  ', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate with uppercase and leading whitespace', () => {
      const existingTasks = [
        { id: '1', text: 'walk the dog', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('   WALK THE DOG', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate with mixed case and trailing whitespace', () => {
      const existingTasks = [
        { id: '1', text: 'ReAd A bOoK', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('read a book   ', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate when both have case and whitespace differences', () => {
      const existingTasks = [
        { id: '1', text: '  URGENT TASK  ', completed: false, createdAt: 1000 }
      ];
      
      const result = validator.validate('   urgent task   ', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });
  });

  describe('normalizeText', () => {
    it('should trim and lowercase text', () => {
      expect(validator.normalizeText('  Hello World  ')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(validator.normalizeText('')).toBe('');
    });

    it('should handle whitespace-only string', () => {
      expect(validator.normalizeText('   ')).toBe('');
    });

    it('should handle null input', () => {
      expect(validator.normalizeText(null)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(validator.normalizeText(undefined)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(validator.normalizeText(123)).toBe('');
      expect(validator.normalizeText({})).toBe('');
      expect(validator.normalizeText([])).toBe('');
    });

    it('should preserve internal whitespace', () => {
      expect(validator.normalizeText('  Buy   groceries  ')).toBe('buy   groceries');
    });

    it('should handle special characters', () => {
      expect(validator.normalizeText('  Task #1: Do Something!  ')).toBe('task #1: do something!');
    });
  });

  describe('isDuplicate', () => {
    it('should return true for exact duplicate', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 }
      ];
      
      expect(validator.isDuplicate('Buy groceries', existingTasks)).toBe(true);
    });

    it('should return false for non-duplicate', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 }
      ];
      
      expect(validator.isDuplicate('Walk the dog', existingTasks)).toBe(false);
    });

    it('should return false for empty task list', () => {
      expect(validator.isDuplicate('Any task', [])).toBe(false);
    });

    it('should return true for case-insensitive duplicate', () => {
      const existingTasks = [
        { id: '1', text: 'Buy Groceries', completed: false, createdAt: 1000 }
      ];
      
      expect(validator.isDuplicate('buy groceries', existingTasks)).toBe(true);
    });

    it('should return true for duplicate with whitespace differences', () => {
      const existingTasks = [
        { id: '1', text: '  Buy groceries  ', completed: false, createdAt: 1000 }
      ];
      
      expect(validator.isDuplicate('Buy groceries', existingTasks)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should validate complete workflow: add, reject duplicate, allow different', () => {
      const existingTasks = [];
      
      // Add first task
      let result = validator.validate('Buy groceries', existingTasks);
      expect(result.valid).toBe(true);
      existingTasks.push({ id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 });
      
      // Try to add duplicate
      result = validator.validate('Buy groceries', existingTasks);
      expect(result.valid).toBe(false);
      
      // Add different task
      result = validator.validate('Walk the dog', existingTasks);
      expect(result.valid).toBe(true);
      existingTasks.push({ id: '2', text: 'Walk the dog', completed: false, createdAt: 2000 });
      
      // Try to add duplicate with different case and whitespace
      result = validator.validate('  BUY GROCERIES  ', existingTasks);
      expect(result.valid).toBe(false);
    });

    it('should handle task deletion and re-addition', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 },
        { id: '2', text: 'Walk the dog', completed: false, createdAt: 2000 }
      ];
      
      // Try to add duplicate
      let result = validator.validate('Walk the dog', existingTasks);
      expect(result.valid).toBe(false);
      
      // Delete the task
      existingTasks.splice(1, 1);
      
      // Now should be able to add it again
      result = validator.validate('Walk the dog', existingTasks);
      expect(result.valid).toBe(true);
    });

    it('should handle completed tasks in duplicate detection', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: true, createdAt: 1000 }
      ];
      
      // Should still detect duplicate even if task is completed
      const result = validator.validate('Buy groceries', existingTasks);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });
  });
});
