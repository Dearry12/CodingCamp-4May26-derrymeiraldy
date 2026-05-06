import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskManager } from './task-manager.js';
import { TaskValidator } from './task-validator.js';
import { TaskSorter } from './task-sorter.js';
import { StorageManager } from './storage-manager.js';

describe('TaskManager', () => {
  let taskManager;
  let mockStorageManager;
  let validator;
  let sorter;

  beforeEach(() => {
    // Create mock storage manager
    mockStorageManager = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      isAvailable: vi.fn(() => true)
    };

    // Create real validator and sorter
    validator = new TaskValidator();
    sorter = new TaskSorter(mockStorageManager);

    // Create task manager
    taskManager = new TaskManager(mockStorageManager, validator, sorter);
  });

  describe('Initialization', () => {
    it('should initialize with empty task list when no saved tasks', () => {
      mockStorageManager.get.mockReturnValue(null);

      taskManager.init();

      expect(taskManager.getTasks()).toEqual([]);
      expect(mockStorageManager.get).toHaveBeenCalledWith('tasks');
    });

    it('should load tasks from storage on init', () => {
      const savedTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 },
        { id: '2', text: 'Walk the dog', completed: true, createdAt: 2000 }
      ];
      mockStorageManager.get.mockReturnValue(savedTasks);

      taskManager.init();

      // Tasks will be sorted (default newest first), so check by content not order
      const tasks = taskManager.getTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks.find(t => t.id === '1')).toBeDefined();
      expect(tasks.find(t => t.id === '2')).toBeDefined();
    });

    it('should apply sorting on init', () => {
      const savedTasks = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 },
        { id: '2', text: 'Walk the dog', completed: true, createdAt: 2000 },
        { id: '3', text: 'Read a book', completed: false, createdAt: 3000 }
      ];
      mockStorageManager.get.mockReturnValue(savedTasks);

      taskManager.init();

      // Default sort is newest first, so should be in descending order by createdAt
      const tasks = taskManager.getTasks();
      expect(tasks[0].id).toBe('3');
      expect(tasks[1].id).toBe('2');
      expect(tasks[2].id).toBe('1');
    });

    it('should handle invalid saved data gracefully', () => {
      mockStorageManager.get.mockReturnValue('invalid data');

      taskManager.init();

      expect(taskManager.getTasks()).toEqual([]);
    });

    it('should handle non-array saved data gracefully', () => {
      mockStorageManager.get.mockReturnValue({ not: 'an array' });

      taskManager.init();

      expect(taskManager.getTasks()).toEqual([]);
    });
  });

  describe('Add Task Operations', () => {
    beforeEach(() => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
    });

    it('should add a valid task successfully', () => {
      const result = taskManager.addTask('Buy groceries');

      expect(result).toBe(true);
      expect(taskManager.getTasks()).toHaveLength(1);
      expect(taskManager.getTasks()[0].text).toBe('Buy groceries');
      expect(taskManager.getTasks()[0].completed).toBe(false);
    });

    it('should trim whitespace from task text', () => {
      taskManager.addTask('  Buy groceries  ');

      const tasks = taskManager.getTasks();
      expect(tasks[0].text).toBe('Buy groceries');
    });

    it('should generate unique ID for each task', () => {
      vi.useFakeTimers();
      
      taskManager.addTask('Task 1');
      vi.advanceTimersByTime(10);
      taskManager.addTask('Task 2');

      vi.useRealTimers();

      const tasks = taskManager.getTasks();
      expect(tasks[0].id).not.toBe(tasks[1].id);
    });

    it('should set createdAt timestamp for new task', () => {
      const beforeTime = Date.now();
      taskManager.addTask('Buy groceries');
      const afterTime = Date.now();

      const tasks = taskManager.getTasks();
      expect(tasks[0].createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(tasks[0].createdAt).toBeLessThanOrEqual(afterTime);
    });

    it('should reject empty task', () => {
      const result = taskManager.addTask('');

      expect(result).toBe(false);
      expect(taskManager.getTasks()).toHaveLength(0);
    });

    it('should reject whitespace-only task', () => {
      const result = taskManager.addTask('   ');

      expect(result).toBe(false);
      expect(taskManager.getTasks()).toHaveLength(0);
    });

    it('should reject duplicate task', () => {
      taskManager.addTask('Buy groceries');
      const result = taskManager.addTask('Buy groceries');

      expect(result).toBe(false);
      expect(taskManager.getTasks()).toHaveLength(1);
    });

    it('should reject duplicate task with different case', () => {
      taskManager.addTask('Buy groceries');
      const result = taskManager.addTask('BUY GROCERIES');

      expect(result).toBe(false);
      expect(taskManager.getTasks()).toHaveLength(1);
    });

    it('should reject duplicate task with different whitespace', () => {
      taskManager.addTask('Buy groceries');
      const result = taskManager.addTask('  Buy groceries  ');

      expect(result).toBe(false);
      expect(taskManager.getTasks()).toHaveLength(1);
    });

    it('should persist tasks to storage after adding', () => {
      taskManager.addTask('Buy groceries');

      expect(mockStorageManager.set).toHaveBeenCalledWith('tasks', expect.any(Array));
      const savedTasks = mockStorageManager.set.mock.calls[0][1];
      expect(savedTasks).toHaveLength(1);
      expect(savedTasks[0].text).toBe('Buy groceries');
    });

    it('should apply sorting after adding task', () => {
      // Add tasks with specific timestamps
      taskManager.addTask('First task');
      const tasks1 = taskManager.getTasks();
      const firstTaskId = tasks1[0].id;

      // Wait a bit to ensure different timestamp
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      taskManager.addTask('Second task');
      vi.useRealTimers();

      const tasks = taskManager.getTasks();
      // Default sort is newest first, so second task should be first
      expect(tasks[0].text).toBe('Second task');
      expect(tasks[1].text).toBe('First task');
    });

    it('should allow adding multiple different tasks', () => {
      taskManager.addTask('Buy groceries');
      taskManager.addTask('Walk the dog');
      taskManager.addTask('Read a book');

      expect(taskManager.getTasks()).toHaveLength(3);
    });
  });

  describe('Toggle Task Operations', () => {
    beforeEach(() => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
      taskManager.addTask('Buy groceries');
      mockStorageManager.set.mockClear(); // Clear previous calls
    });

    it('should toggle task from incomplete to complete', () => {
      const tasks = taskManager.getTasks();
      const taskId = tasks[0].id;

      taskManager.toggleTask(taskId);

      expect(taskManager.getTasks()[0].completed).toBe(true);
    });

    it('should toggle task from complete to incomplete', () => {
      const tasks = taskManager.getTasks();
      const taskId = tasks[0].id;

      taskManager.toggleTask(taskId);
      taskManager.toggleTask(taskId);

      expect(taskManager.getTasks()[0].completed).toBe(false);
    });

    it('should persist tasks to storage after toggling', () => {
      const tasks = taskManager.getTasks();
      const taskId = tasks[0].id;

      taskManager.toggleTask(taskId);

      expect(mockStorageManager.set).toHaveBeenCalledWith('tasks', expect.any(Array));
    });

    it('should handle toggling non-existent task gracefully', () => {
      taskManager.toggleTask('non-existent-id');

      // Should not throw error, task list should remain unchanged
      expect(taskManager.getTasks()).toHaveLength(1);
      expect(taskManager.getTasks()[0].completed).toBe(false);
    });

    it('should apply sorting after toggling (for status-based sorts)', () => {
      // Add multiple tasks
      taskManager.addTask('Walk the dog');
      taskManager.addTask('Read a book');

      const tasks = taskManager.getTasks();
      const firstTaskId = tasks[0].id;

      // Toggle first task to completed
      taskManager.toggleTask(firstTaskId);

      // Tasks should still be sorted (default is by date)
      expect(taskManager.getTasks()).toHaveLength(3);
    });

    it('should toggle correct task in list with multiple tasks', () => {
      taskManager.addTask('Walk the dog');
      taskManager.addTask('Read a book');

      const tasks = taskManager.getTasks();
      const middleTaskId = tasks[1].id;

      taskManager.toggleTask(middleTaskId);

      const updatedTasks = taskManager.getTasks();
      const toggledTask = updatedTasks.find(t => t.id === middleTaskId);
      expect(toggledTask.completed).toBe(true);

      // Other tasks should remain incomplete
      const otherTasks = updatedTasks.filter(t => t.id !== middleTaskId);
      otherTasks.forEach(task => {
        expect(task.completed).toBe(false);
      });
    });
  });

  describe('Delete Task Operations', () => {
    beforeEach(() => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
      
      vi.useFakeTimers();
      taskManager.addTask('Buy groceries');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Walk the dog');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Read a book');
      vi.useRealTimers();
      
      mockStorageManager.set.mockClear(); // Clear previous calls
    });

    it('should delete task by ID', () => {
      const tasks = taskManager.getTasks();
      const taskIdToDelete = tasks[1].id;

      taskManager.deleteTask(taskIdToDelete);

      expect(taskManager.getTasks()).toHaveLength(2);
      expect(taskManager.getTasks().find(t => t.id === taskIdToDelete)).toBeUndefined();
    });

    it('should persist tasks to storage after deleting', () => {
      const tasks = taskManager.getTasks();
      const taskIdToDelete = tasks[0].id;

      taskManager.deleteTask(taskIdToDelete);

      expect(mockStorageManager.set).toHaveBeenCalledWith('tasks', expect.any(Array));
      const savedTasks = mockStorageManager.set.mock.calls[0][1];
      expect(savedTasks).toHaveLength(2);
    });

    it('should handle deleting non-existent task gracefully', () => {
      taskManager.deleteTask('non-existent-id');

      // Should not throw error, task list should remain unchanged
      expect(taskManager.getTasks()).toHaveLength(3);
    });

    it('should allow re-adding deleted task', () => {
      const tasks = taskManager.getTasks();
      const taskToDelete = tasks[0];
      const taskText = taskToDelete.text;

      taskManager.deleteTask(taskToDelete.id);
      expect(taskManager.getTasks()).toHaveLength(2);

      // Should be able to add the same task again
      const result = taskManager.addTask(taskText);
      expect(result).toBe(true);
      expect(taskManager.getTasks()).toHaveLength(3);
    });

    it('should delete all tasks when called for each task', () => {
      const tasks = [...taskManager.getTasks()]; // Create a copy
      
      tasks.forEach(task => {
        taskManager.deleteTask(task.id);
      });

      expect(taskManager.getTasks()).toHaveLength(0);
    });

    it('should delete correct task and preserve others', () => {
      const tasks = taskManager.getTasks();
      const taskIdToDelete = tasks[1].id;
      const remainingTaskIds = [tasks[0].id, tasks[2].id];

      taskManager.deleteTask(taskIdToDelete);

      const remainingTasks = taskManager.getTasks();
      expect(remainingTasks).toHaveLength(2);
      expect(remainingTasks.map(t => t.id)).toEqual(expect.arrayContaining(remainingTaskIds));
    });
  });

  describe('Get Tasks Operations', () => {
    it('should return empty array when no tasks', () => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();

      expect(taskManager.getTasks()).toEqual([]);
    });

    it('should return all tasks', () => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
      
      taskManager.addTask('Buy groceries');
      taskManager.addTask('Walk the dog');

      expect(taskManager.getTasks()).toHaveLength(2);
    });

    it('should return tasks in current sort order', () => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();

      vi.useFakeTimers();
      
      taskManager.addTask('First task');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Second task');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Third task');

      vi.useRealTimers();

      const tasks = taskManager.getTasks();
      // Default sort is newest first
      expect(tasks[0].text).toBe('Third task');
      expect(tasks[1].text).toBe('Second task');
      expect(tasks[2].text).toBe('First task');
    });
  });

  describe('Apply Sorting Operations', () => {
    beforeEach(() => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
    });

    it('should apply default sort preference on init', () => {
      const savedTasks = [
        { id: '1', text: 'Task 1', completed: false, createdAt: 1000 },
        { id: '2', text: 'Task 2', completed: false, createdAt: 2000 },
        { id: '3', text: 'Task 3', completed: false, createdAt: 3000 }
      ];
      mockStorageManager.get.mockReturnValue(savedTasks);

      taskManager.init();

      const tasks = taskManager.getTasks();
      // Default is newest first
      expect(tasks[0].createdAt).toBe(3000);
      expect(tasks[1].createdAt).toBe(2000);
      expect(tasks[2].createdAt).toBe(1000);
    });

    it('should apply sorting when called explicitly', () => {
      vi.useFakeTimers();
      taskManager.addTask('Zebra');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Apple');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Mango');
      vi.useRealTimers();

      // Verify initial state (should be sorted by date newest)
      let tasks = taskManager.getTasks();
      expect(tasks[0].text).toBe('Mango'); // Most recent
      expect(tasks[1].text).toBe('Apple');
      expect(tasks[2].text).toBe('Zebra'); // Oldest

      // Change sort preference and mock the storage to return it
      sorter.setSortPreference(TaskSorter.SortOption.ALPHA_AZ);
      mockStorageManager.get.mockImplementation((key) => {
        if (key === 'sortPreference') return TaskSorter.SortOption.ALPHA_AZ;
        return null;
      });

      // Apply sorting
      taskManager.applySorting();

      tasks = taskManager.getTasks();
      expect(tasks[0].text).toBe('Apple');
      expect(tasks[1].text).toBe('Mango');
      expect(tasks[2].text).toBe('Zebra');
    });

    it('should reapply sorting after toggle when using status sort', () => {
      vi.useFakeTimers();
      taskManager.addTask('Task 1');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Task 2');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Task 3');
      vi.useRealTimers();

      // Change to status sort and mock the storage
      sorter.setSortPreference(TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST);
      mockStorageManager.get.mockImplementation((key) => {
        if (key === 'sortPreference') return TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST;
        return null;
      });
      taskManager.applySorting();

      // All tasks should be incomplete initially
      let tasks = taskManager.getTasks();
      expect(tasks.every(t => !t.completed)).toBe(true);

      // Toggle the first task (most recent)
      taskManager.toggleTask(tasks[0].id);

      // Sorting should be reapplied
      const updatedTasks = taskManager.getTasks();
      
      // The completed task should now be at the end
      expect(updatedTasks[0].completed).toBe(false);
      expect(updatedTasks[1].completed).toBe(false);
      expect(updatedTasks[2].completed).toBe(true);
    });
  });

  describe('Integration with Validator', () => {
    beforeEach(() => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
    });

    it('should use validator to check for duplicates', () => {
      taskManager.addTask('Buy groceries');
      const result = taskManager.addTask('Buy groceries');

      expect(result).toBe(false);
      expect(taskManager.getTasks()).toHaveLength(1);
    });

    it('should use validator to check for empty tasks', () => {
      const result = taskManager.addTask('');

      expect(result).toBe(false);
      expect(taskManager.getTasks()).toHaveLength(0);
    });

    it('should use validator with case-insensitive comparison', () => {
      taskManager.addTask('Buy Groceries');
      const result = taskManager.addTask('buy groceries');

      expect(result).toBe(false);
      expect(taskManager.getTasks()).toHaveLength(1);
    });
  });

  describe('Integration with Sorter', () => {
    beforeEach(() => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
    });

    it('should use sorter to get sort preference', () => {
      const spy = vi.spyOn(sorter, 'getSortPreference');
      
      taskManager.applySorting();

      expect(spy).toHaveBeenCalled();
    });

    it('should use sorter to sort tasks', () => {
      const spy = vi.spyOn(sorter, 'sort');
      
      taskManager.addTask('Task 1');
      taskManager.applySorting();

      expect(spy).toHaveBeenCalled();
    });

    it('should respect sorter preference changes', () => {
      vi.useFakeTimers();
      taskManager.addTask('Zebra');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Apple');
      vi.useRealTimers();

      // Change sort preference
      sorter.setSortPreference(TaskSorter.SortOption.ALPHA_AZ);
      taskManager.applySorting();

      const tasks = taskManager.getTasks();
      expect(tasks[0].text).toBe('Apple');
      expect(tasks[1].text).toBe('Zebra');
    });
  });

  describe('Integration with StorageManager', () => {
    it('should load tasks from storage on init', () => {
      const savedTasks = [
        { id: '1', text: 'Saved task', completed: false, createdAt: 1000 }
      ];
      mockStorageManager.get.mockReturnValue(savedTasks);

      taskManager.init();

      expect(mockStorageManager.get).toHaveBeenCalledWith('tasks');
      expect(taskManager.getTasks()).toEqual(savedTasks);
    });

    it('should save tasks after add operation', () => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();

      taskManager.addTask('New task');

      expect(mockStorageManager.set).toHaveBeenCalledWith('tasks', expect.any(Array));
    });

    it('should save tasks after toggle operation', () => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
      taskManager.addTask('Task');
      mockStorageManager.set.mockClear();

      const tasks = taskManager.getTasks();
      taskManager.toggleTask(tasks[0].id);

      expect(mockStorageManager.set).toHaveBeenCalledWith('tasks', expect.any(Array));
    });

    it('should save tasks after delete operation', () => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
      taskManager.addTask('Task');
      mockStorageManager.set.mockClear();

      const tasks = taskManager.getTasks();
      taskManager.deleteTask(tasks[0].id);

      expect(mockStorageManager.set).toHaveBeenCalledWith('tasks', expect.any(Array));
    });
  });

  describe('Complete Workflow Integration', () => {
    beforeEach(() => {
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
    });

    it('should handle complete task lifecycle: add, toggle, delete', () => {
      // Add task
      const addResult = taskManager.addTask('Complete workflow task');
      expect(addResult).toBe(true);
      expect(taskManager.getTasks()).toHaveLength(1);

      // Toggle task
      const tasks = taskManager.getTasks();
      const taskId = tasks[0].id;
      taskManager.toggleTask(taskId);
      expect(taskManager.getTasks()[0].completed).toBe(true);

      // Delete task
      taskManager.deleteTask(taskId);
      expect(taskManager.getTasks()).toHaveLength(0);
    });

    it('should handle multiple tasks with various operations', () => {
      vi.useFakeTimers();
      
      // Add multiple tasks
      taskManager.addTask('Task 1');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Task 2');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Task 3');
      
      vi.useRealTimers();
      
      expect(taskManager.getTasks()).toHaveLength(3);

      // Toggle some tasks
      const tasks = taskManager.getTasks();
      taskManager.toggleTask(tasks[0].id);
      taskManager.toggleTask(tasks[2].id);

      // Delete one task
      taskManager.deleteTask(tasks[1].id);
      expect(taskManager.getTasks()).toHaveLength(2);

      // Try to add duplicate
      const result = taskManager.addTask('Task 1');
      expect(result).toBe(false);
      expect(taskManager.getTasks()).toHaveLength(2);

      // Add new unique task
      const result2 = taskManager.addTask('Task 4');
      expect(result2).toBe(true);
      expect(taskManager.getTasks()).toHaveLength(3);
    });

    it('should persist state across operations', () => {
      taskManager.addTask('Task 1');
      taskManager.addTask('Task 2');

      // Verify storage was called for each add
      expect(mockStorageManager.set).toHaveBeenCalledTimes(2);

      const tasks = taskManager.getTasks();
      taskManager.toggleTask(tasks[0].id);

      // Verify storage was called for toggle
      expect(mockStorageManager.set).toHaveBeenCalledTimes(3);

      taskManager.deleteTask(tasks[1].id);

      // Verify storage was called for delete
      expect(mockStorageManager.set).toHaveBeenCalledTimes(4);
    });
  });

  describe('Render Operations', () => {
    beforeEach(() => {
      // Set up DOM
      document.body.innerHTML = '<ul id="task-list"></ul>';
      
      mockStorageManager.get.mockReturnValue(null);
      taskManager.init();
    });

    it('should render empty task list', () => {
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      expect(taskListElement.children.length).toBe(0);
    });

    it('should render task list with one task', () => {
      taskManager.addTask('Buy groceries');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      expect(taskListElement.children.length).toBe(1);
      
      const taskItem = taskListElement.children[0];
      expect(taskItem.className).toBe('task-item');
      expect(taskItem.querySelector('.task-text').textContent).toBe('Buy groceries');
    });

    it('should render task list with multiple tasks', () => {
      vi.useFakeTimers();
      taskManager.addTask('Task 1');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Task 2');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Task 3');
      vi.useRealTimers();

      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      expect(taskListElement.children.length).toBe(3);
    });

    it('should render tasks in current sort order', () => {
      vi.useFakeTimers();
      taskManager.addTask('Zebra');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Apple');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Mango');
      vi.useRealTimers();

      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const taskTexts = Array.from(taskListElement.children).map(
        li => li.querySelector('.task-text').textContent
      );

      // Default sort is newest first
      expect(taskTexts).toEqual(['Mango', 'Apple', 'Zebra']);
    });

    it('should render checkbox for each task', () => {
      taskManager.addTask('Buy groceries');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const checkbox = taskListElement.querySelector('.task-checkbox');
      
      expect(checkbox).toBeTruthy();
      expect(checkbox.type).toBe('checkbox');
      expect(checkbox.checked).toBe(false);
    });

    it('should render checked checkbox for completed task', () => {
      taskManager.addTask('Buy groceries');
      const tasks = taskManager.getTasks();
      taskManager.toggleTask(tasks[0].id);
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const checkbox = taskListElement.querySelector('.task-checkbox');
      
      expect(checkbox.checked).toBe(true);
    });

    it('should render delete button for each task', () => {
      taskManager.addTask('Buy groceries');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const deleteButton = taskListElement.querySelector('.task-delete');
      
      expect(deleteButton).toBeTruthy();
      expect(deleteButton.textContent).toBe('Delete');
    });

    it('should add completed class to completed task text', () => {
      taskManager.addTask('Buy groceries');
      const tasks = taskManager.getTasks();
      taskManager.toggleTask(tasks[0].id);
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const taskText = taskListElement.querySelector('.task-text');
      
      expect(taskText.classList.contains('completed')).toBe(true);
    });

    it('should not add completed class to incomplete task text', () => {
      taskManager.addTask('Buy groceries');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const taskText = taskListElement.querySelector('.task-text');
      
      expect(taskText.classList.contains('completed')).toBe(false);
    });

    it('should set task ID as data attribute', () => {
      taskManager.addTask('Buy groceries');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const taskItem = taskListElement.children[0];
      const tasks = taskManager.getTasks();
      
      expect(taskItem.dataset.taskId).toBe(tasks[0].id);
    });

    it('should add aria-label to checkbox', () => {
      taskManager.addTask('Buy groceries');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const checkbox = taskListElement.querySelector('.task-checkbox');
      
      expect(checkbox.getAttribute('aria-label')).toBe('Mark "Buy groceries" as complete');
    });

    it('should add aria-label to delete button', () => {
      taskManager.addTask('Buy groceries');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const deleteButton = taskListElement.querySelector('.task-delete');
      
      expect(deleteButton.getAttribute('aria-label')).toBe('Delete "Buy groceries"');
    });

    it('should handle missing task list element gracefully', () => {
      document.body.innerHTML = ''; // Remove task list element
      
      // Should not throw error
      expect(() => taskManager.render()).not.toThrow();
    });

    it('should clear existing content before rendering', () => {
      taskManager.addTask('Task 1');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      expect(taskListElement.children.length).toBe(1);

      // Manually add extra content
      const extraElement = document.createElement('li');
      extraElement.textContent = 'Extra';
      taskListElement.appendChild(extraElement);
      expect(taskListElement.children.length).toBe(2);

      // Render again should clear and show only actual tasks
      taskManager.render();
      expect(taskListElement.children.length).toBe(1);
    });

    it('should attach event listener to checkbox for toggle', () => {
      taskManager.addTask('Buy groceries');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const checkbox = taskListElement.querySelector('.task-checkbox');
      
      // Simulate checkbox change
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      // Task should be toggled
      const tasks = taskManager.getTasks();
      expect(tasks[0].completed).toBe(true);
    });

    it('should attach event listener to delete button', () => {
      taskManager.addTask('Buy groceries');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const deleteButton = taskListElement.querySelector('.task-delete');
      
      // Simulate delete button click
      deleteButton.click();

      // Task should be deleted
      expect(taskManager.getTasks()).toHaveLength(0);
    });

    it('should re-render after toggle via checkbox', () => {
      taskManager.addTask('Buy groceries');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const checkbox = taskListElement.querySelector('.task-checkbox');
      
      // Simulate checkbox change
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      // Check that the rendered checkbox is now checked
      const updatedCheckbox = taskListElement.querySelector('.task-checkbox');
      expect(updatedCheckbox.checked).toBe(true);
    });

    it('should re-render after delete via button', () => {
      vi.useFakeTimers();
      taskManager.addTask('Task 1');
      vi.advanceTimersByTime(100);
      taskManager.addTask('Task 2');
      vi.useRealTimers();
      
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      expect(taskListElement.children.length).toBe(2);

      const deleteButton = taskListElement.querySelector('.task-delete');
      deleteButton.click();

      // Should now have only 1 task rendered
      expect(taskListElement.children.length).toBe(1);
    });

    it('should use textContent to prevent XSS', () => {
      taskManager.addTask('<script>alert("XSS")</script>');
      taskManager.render();

      const taskListElement = document.getElementById('task-list');
      const taskText = taskListElement.querySelector('.task-text');
      
      // Should render as text, not execute script
      expect(taskText.textContent).toBe('<script>alert("XSS")</script>');
      // textContent sets the text as-is, browser doesn't parse it as HTML
      // So innerHTML will show the escaped version
      expect(taskText.innerHTML).toContain('script');
    });
  });
});
