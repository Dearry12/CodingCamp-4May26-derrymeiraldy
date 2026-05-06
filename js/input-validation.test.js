/**
 * Input Validation and Error Display Tests
 * Tests for task 10.3: Add input validation and error display
 * Validates Requirements 3.8, 4.4, 8.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PomodoroTimer } from './pomodoro-timer.js';
import { TaskValidator } from './task-validator.js';
import { TaskManager } from './task-manager.js';
import { StorageManager } from './storage-manager.js';
import { TaskSorter } from './task-sorter.js';

describe('Input Validation and Error Display', () => {
  describe('Timer Duration Validation', () => {
    let timer;
    let storage;
    let mockErrorElement;

    beforeEach(() => {
      // Create mock DOM elements
      document.body.innerHTML = `
        <div id="timer-display">25:00</div>
        <button id="timer-start">Start</button>
        <button id="timer-pause">Pause</button>
        <button id="timer-reset">Reset</button>
        <input type="number" id="timer-duration" value="25" />
        <span id="timer-error" class="error-message"></span>
      `;

      storage = new StorageManager();
      timer = new PomodoroTimer(storage);
      timer.init();
      mockErrorElement = document.getElementById('timer-error');
    });

    it('should validate timer duration in range 1-120', () => {
      expect(timer.validateDuration(1)).toBe(true);
      expect(timer.validateDuration(25)).toBe(true);
      expect(timer.validateDuration(120)).toBe(true);
    });

    it('should reject timer duration below 1', () => {
      expect(timer.validateDuration(0)).toBe(false);
      expect(timer.validateDuration(-5)).toBe(false);
    });

    it('should reject timer duration above 120', () => {
      expect(timer.validateDuration(121)).toBe(false);
      expect(timer.validateDuration(200)).toBe(false);
    });

    it('should reject non-integer durations', () => {
      expect(timer.validateDuration(25.5)).toBe(false);
      expect(timer.validateDuration(NaN)).toBe(false);
    });

    it('should display error message for invalid duration', () => {
      const result = timer.setDuration(150);
      
      expect(result).toBe(false);
      expect(mockErrorElement.textContent).toBe('Duration must be between 1 and 120 minutes');
      expect(mockErrorElement.style.display).toBe('inline');
    });

    it('should clear error message on valid duration', () => {
      // First set invalid duration to show error
      timer.setDuration(150);
      expect(mockErrorElement.textContent).toBe('Duration must be between 1 and 120 minutes');
      
      // Then set valid duration
      const result = timer.setDuration(30);
      
      expect(result).toBe(true);
      expect(mockErrorElement.textContent).toBe('');
      expect(mockErrorElement.style.display).toBe('none');
    });

    it('should reset input to current duration on invalid input', () => {
      const durationInput = document.getElementById('timer-duration');
      timer.duration = 25;
      durationInput.value = '25';
      
      timer.setDuration(200);
      
      expect(durationInput.value).toBe('25');
    });
  });

  describe('Task Input Validation', () => {
    let validator;
    let taskManager;
    let storage;

    beforeEach(() => {
      storage = new StorageManager();
      validator = new TaskValidator();
      const sorter = new TaskSorter(storage);
      taskManager = new TaskManager(storage, validator, sorter);
      taskManager.init();
    });

    it('should validate empty task input', () => {
      const result = validator.validate('', []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Task cannot be empty');
    });

    it('should validate whitespace-only task input', () => {
      const result = validator.validate('   ', []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Task cannot be empty');
    });

    it('should detect duplicate tasks (case-insensitive)', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: Date.now() }
      ];
      
      const result = validator.validate('buy groceries', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should detect duplicate tasks (with extra whitespace)', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: Date.now() }
      ];
      
      const result = validator.validate('  Buy groceries  ', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });

    it('should allow valid unique tasks', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: Date.now() }
      ];
      
      const result = validator.validate('Buy milk', existingTasks);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should check duplicates against completed tasks', () => {
      const existingTasks = [
        { id: '1', text: 'Buy groceries', completed: true, createdAt: Date.now() }
      ];
      
      const result = validator.validate('Buy groceries', existingTasks);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This task already exists');
    });
  });

  describe('Error Display Integration', () => {
    let taskManager;
    let storage;
    let validator;
    let sorter;

    beforeEach(() => {
      // Create mock DOM elements
      document.body.innerHTML = `
        <input type="text" id="task-input" />
        <button id="task-add">Add</button>
        <span id="task-error" class="error-message"></span>
        <ul id="task-list"></ul>
        <select id="sort-select">
          <option value="date-newest">Newest First</option>
        </select>
      `;

      // Clear localStorage before each test
      localStorage.clear();

      storage = new StorageManager();
      validator = new TaskValidator();
      sorter = new TaskSorter(storage);
      taskManager = new TaskManager(storage, validator, sorter);
      taskManager.init();
    });

    it('should return false when adding empty task', () => {
      const result = taskManager.addTask('');
      
      expect(result).toBe(false);
      expect(taskManager.getTasks().length).toBe(0);
    });

    it('should return false when adding duplicate task', () => {
      taskManager.addTask('Buy groceries');
      const result = taskManager.addTask('buy groceries');
      
      expect(result).toBe(false);
      expect(taskManager.getTasks().length).toBe(1);
    });

    it('should return true when adding valid task', () => {
      const result = taskManager.addTask('Buy groceries');
      
      expect(result).toBe(true);
      expect(taskManager.getTasks().length).toBe(1);
    });

    it('should clear tasks and allow re-adding after deletion', () => {
      // Add task
      taskManager.addTask('Buy groceries');
      const tasks = taskManager.getTasks();
      expect(tasks.length).toBe(1);
      
      // Delete task
      taskManager.deleteTask(tasks[0].id);
      expect(taskManager.getTasks().length).toBe(0);
      
      // Should be able to add same task again
      const result = taskManager.addTask('Buy groceries');
      expect(result).toBe(true);
      expect(taskManager.getTasks().length).toBe(1);
    });
  });

  describe('Error Message Clearing', () => {
    it('should clear timer error when setting valid duration', () => {
      document.body.innerHTML = `
        <div id="timer-display">25:00</div>
        <button id="timer-start">Start</button>
        <button id="timer-pause">Pause</button>
        <button id="timer-reset">Reset</button>
        <input type="number" id="timer-duration" value="25" />
        <span id="timer-error" class="error-message"></span>
      `;

      const storage = new StorageManager();
      const timer = new PomodoroTimer(storage);
      timer.init();
      const errorElement = document.getElementById('timer-error');

      // Set invalid duration to show error
      timer.setDuration(200);
      expect(errorElement.textContent).not.toBe('');
      expect(errorElement.style.display).toBe('inline');

      // Set valid duration should clear error
      timer.setDuration(30);
      expect(errorElement.textContent).toBe('');
      expect(errorElement.style.display).toBe('none');
    });

    it('should provide error message for validation failures', () => {
      const validator = new TaskValidator();
      
      // Empty task
      let result = validator.validate('', []);
      expect(result.error).toBe('Task cannot be empty');
      
      // Duplicate task
      const tasks = [{ id: '1', text: 'Test', completed: false, createdAt: Date.now() }];
      result = validator.validate('test', tasks);
      expect(result.error).toBe('This task already exists');
    });
  });
});
