import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from './storage-manager.js';
import { ThemeManager } from './theme-manager.js';
import { GreetingComponent } from './greeting-component.js';
import { PomodoroTimer } from './pomodoro-timer.js';
import { TaskManager } from './task-manager.js';
import { TaskValidator } from './task-validator.js';
import { TaskSorter } from './task-sorter.js';

/**
 * Integration Tests for Complete Workflows
 * Tests end-to-end user workflows and component interactions
 * 
 * **Validates: Requirements 6.1, 6.6, 6.7, 6.8**
 */

describe('Integration Tests - Complete Workflows', () => {
  let mockLocalStorage;
  let storage;
  let themeManager;
  let greeting;
  let pomodoroTimer;
  let taskManager;
  let taskValidator;
  let taskSorter;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div class="container">
        <button id="theme-toggle" class="theme-toggle"></button>
        <h2 id="greeting-text" class="greeting"></h2>
        <input id="name-input" class="name-input" />
        <div id="timer-display" class="timer-display">25:00</div>
        <button id="timer-start" class="btn-timer">Start</button>
        <button id="timer-pause" class="btn-timer">Pause</button>
        <button id="timer-reset" class="btn-timer">Reset</button>
        <input id="timer-duration" type="number" min="1" max="120" value="25" />
        <span id="timer-error" class="error-message"></span>
        <input id="task-input" class="task-input" />
        <button id="task-add" class="btn-add">Add</button>
        <span id="task-error" class="error-message"></span>
        <select id="sort-select" class="sort-select">
          <option value="date-newest">Newest First</option>
          <option value="date-oldest">Oldest First</option>
          <option value="alpha-az">A to Z</option>
          <option value="alpha-za">Z to A</option>
          <option value="status-incomplete">Incomplete First</option>
          <option value="status-complete">Complete First</option>
        </select>
        <ul id="task-list" class="task-list"></ul>
        <div id="storage-warning" class="storage-warning hidden"></div>
      </div>
    `;

    // Create mock localStorage with persistent store
    let store = {};
    mockLocalStorage = {
      getItem: vi.fn((key) => {
        return key in store ? store[key] : null;
      }),
      setItem: vi.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };

    global.localStorage = mockLocalStorage;

    // Initialize all components
    storage = new StorageManager();
    themeManager = new ThemeManager(storage);
    greeting = new GreetingComponent(storage);
    pomodoroTimer = new PomodoroTimer(storage);
    taskValidator = new TaskValidator();
    taskSorter = new TaskSorter(storage);
    taskManager = new TaskManager(storage, taskValidator, taskSorter);

    // Initialize components
    themeManager.init();
    greeting.init();
    pomodoroTimer.init();
    taskManager.init();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe('Workflow: Add Task → Sort → Toggle Completion → Verify Persistence', () => {
    it('should complete full task workflow with persistence', () => {
      // Step 1: Add multiple tasks
      const task1 = 'Write documentation';
      const task2 = 'Review code';
      const task3 = 'Fix bugs';

      taskManager.addTask(task1);
      taskManager.addTask(task2);
      taskManager.addTask(task3);

      // Verify tasks were added (order depends on sort preference)
      let tasks = taskManager.getTasks();
      expect(tasks).toHaveLength(3);
      // Find tasks by text instead of assuming order
      expect(tasks.find(t => t.text === task1)).toBeDefined();
      expect(tasks.find(t => t.text === task2)).toBeDefined();
      expect(tasks.find(t => t.text === task3)).toBeDefined();

      // Step 2: Sort tasks alphabetically A-Z
      taskSorter.setSortPreference('alpha-az');
      taskManager.applySorting();
      tasks = taskManager.getTasks();

      expect(tasks[0].text).toBe('Fix bugs');
      expect(tasks[1].text).toBe('Review code');
      expect(tasks[2].text).toBe('Write documentation');

      // Verify sort preference was persisted
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'sortPreference',
        'alpha-az'
      );

      // Step 3: Toggle completion status of first task
      const firstTaskId = tasks[0].id;
      taskManager.toggleTask(firstTaskId);

      tasks = taskManager.getTasks();
      expect(tasks[0].completed).toBe(true);

      // Verify tasks were persisted after toggle
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'tasks',
        expect.any(String)
      );

      // Step 4: Sort by completion status (incomplete first)
      taskSorter.setSortPreference('status-incomplete');
      taskManager.applySorting();
      tasks = taskManager.getTasks();

      // Verify incomplete tasks come first
      expect(tasks[0].completed).toBe(false);
      expect(tasks[1].completed).toBe(false);
      expect(tasks[2].completed).toBe(true);

      // Step 5: Simulate page reload - create new instances
      const newStorage = new StorageManager();
      const newTaskSorter = new TaskSorter(newStorage);
      const newTaskValidator = new TaskValidator();
      const newTaskManager = new TaskManager(
        newStorage,
        newTaskValidator,
        newTaskSorter
      );
      newTaskManager.init();

      // Verify tasks persisted correctly
      const persistedTasks = newTaskManager.getTasks();
      expect(persistedTasks).toHaveLength(3);

      // Verify sort preference persisted
      expect(newTaskSorter.getSortPreference()).toBe('status-incomplete');

      // Verify completion status persisted
      const completedTask = persistedTasks.find((t) => t.text === 'Fix bugs');
      expect(completedTask.completed).toBe(true);
    });
  });

  describe('Workflow: Change Theme → Reload Page → Verify Theme Persisted', () => {
    it('should persist theme preference across page reloads', () => {
      // Step 1: Verify initial theme is light
      expect(themeManager.getCurrentTheme()).toBe('light');
      expect(document.body.classList.contains('theme-light')).toBe(true);

      // Step 2: Toggle to dark theme
      themeManager.toggle();
      expect(themeManager.getCurrentTheme()).toBe('dark');
      expect(document.body.classList.contains('theme-dark')).toBe(true);

      // Verify theme was persisted
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');

      // Step 3: Simulate page reload - create new instance
      const newStorage = new StorageManager();
      const newThemeManager = new ThemeManager(newStorage);
      newThemeManager.init();

      // Verify theme persisted correctly
      expect(newThemeManager.getCurrentTheme()).toBe('dark');
      expect(document.body.classList.contains('theme-dark')).toBe(true);
    });

    it('should persist multiple theme changes', () => {
      // Toggle to dark
      themeManager.toggle();
      expect(themeManager.getCurrentTheme()).toBe('dark');

      // Toggle back to light
      themeManager.toggle();
      expect(themeManager.getCurrentTheme()).toBe('light');

      // Toggle to dark again
      themeManager.toggle();
      expect(themeManager.getCurrentTheme()).toBe('dark');

      // Verify final state persisted
      const newStorage = new StorageManager();
      const newThemeManager = new ThemeManager(newStorage);
      newThemeManager.init();

      expect(newThemeManager.getCurrentTheme()).toBe('dark');
    });

    it('should default to light theme when no preference exists', () => {
      // Clear storage
      mockLocalStorage.clear();

      // Create new instance
      const newStorage = new StorageManager();
      const newThemeManager = new ThemeManager(newStorage);
      newThemeManager.init();

      // Verify defaults to light
      expect(newThemeManager.getCurrentTheme()).toBe('light');
      expect(document.body.classList.contains('theme-light')).toBe(true);
    });
  });

  describe('Workflow: Set Custom Name → Reload Page → Verify Name Persisted', () => {
    it('should persist custom name across page reloads', () => {
      // Step 1: Set custom name
      const customName = 'Alice';
      greeting.setCustomName(customName);

      // Verify name is displayed
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toContain(customName);

      // Verify name was persisted
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'customName',
        customName
      );

      // Step 2: Simulate page reload - create new instance
      const newStorage = new StorageManager();
      const newGreeting = new GreetingComponent(newStorage);
      newGreeting.init();

      // Verify name persisted correctly
      const persistedGreeting =
        document.getElementById('greeting-text').textContent;
      expect(persistedGreeting).toContain(customName);
    });

    it('should persist name changes', () => {
      // Set initial name
      greeting.setCustomName('Bob');
      expect(document.getElementById('greeting-text').textContent).toContain(
        'Bob'
      );

      // Change name
      greeting.setCustomName('Charlie');
      expect(document.getElementById('greeting-text').textContent).toContain(
        'Charlie'
      );

      // Verify final name persisted
      const newStorage = new StorageManager();
      const newGreeting = new GreetingComponent(newStorage);
      newGreeting.init();

      expect(document.getElementById('greeting-text').textContent).toContain(
        'Charlie'
      );
    });

    it('should show generic greeting when no name is set', () => {
      // Clear storage
      mockLocalStorage.clear();

      // Create new instance
      const newStorage = new StorageManager();
      const newGreeting = new GreetingComponent(newStorage);
      newGreeting.init();

      // Verify generic greeting is shown
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).not.toContain('undefined');
      expect(greetingText).not.toContain('null');
      expect(greetingText.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only names correctly', () => {
      // Set whitespace-only name
      greeting.setCustomName('   ');

      // Verify generic greeting is shown
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).not.toContain('   ');

      // Verify empty name is not persisted (or persisted as empty)
      const newStorage = new StorageManager();
      const newGreeting = new GreetingComponent(newStorage);
      newGreeting.init();

      const persistedGreeting =
        document.getElementById('greeting-text').textContent;
      expect(persistedGreeting).not.toContain('   ');
    });
  });

  describe('Workflow: Set Timer Duration → Start Timer → Verify Duration Used', () => {
    it('should use custom duration when timer starts', () => {
      // Step 1: Set custom duration
      const customDuration = 30;
      const result = pomodoroTimer.setDuration(customDuration);
      expect(result).toBe(true);

      // Verify duration was persisted
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pomodoroMinutes',
        customDuration.toString()
      );

      // Step 2: Verify display shows custom duration
      const display = document.getElementById('timer-display').textContent;
      expect(display).toBe('30:00');

      // Step 3: Start timer
      vi.useFakeTimers();
      pomodoroTimer.start();

      // Verify timer is running
      expect(pomodoroTimer.isRunning()).toBe(true);

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);

      // Verify timer counts down from custom duration
      const displayAfter1Sec =
        document.getElementById('timer-display').textContent;
      expect(displayAfter1Sec).toBe('29:59');

      vi.useRealTimers();
    });

    it('should persist custom duration across page reloads', () => {
      // Set custom duration
      pomodoroTimer.setDuration(45);

      // Simulate page reload
      const newStorage = new StorageManager();
      const newTimer = new PomodoroTimer(newStorage);
      newTimer.init();

      // Verify custom duration persisted
      const display = document.getElementById('timer-display').textContent;
      expect(display).toBe('45:00');
    });

    it('should use default duration when no custom duration is set', () => {
      // Clear storage
      mockLocalStorage.clear();

      // Create new instance
      const newStorage = new StorageManager();
      const newTimer = new PomodoroTimer(newStorage);
      newTimer.init();

      // Verify default duration (25 minutes)
      const display = document.getElementById('timer-display').textContent;
      expect(display).toBe('25:00');
    });

    it('should reject invalid durations', () => {
      // Try to set duration below minimum
      let result = pomodoroTimer.setDuration(0);
      expect(result).toBe(false);

      // Try to set duration above maximum
      result = pomodoroTimer.setDuration(121);
      expect(result).toBe(false);

      // Try to set negative duration
      result = pomodoroTimer.setDuration(-5);
      expect(result).toBe(false);

      // Verify display still shows previous valid duration
      const display = document.getElementById('timer-display').textContent;
      expect(display).toBe('25:00'); // Should still be default
    });

    it('should disable settings input when timer is running', () => {
      // Start timer
      vi.useFakeTimers();
      pomodoroTimer.start();

      // Verify settings input is disabled
      const durationInput = document.getElementById('timer-duration');
      expect(durationInput.disabled).toBe(true);

      // Pause timer
      pomodoroTimer.pause();

      // Verify settings input is enabled again
      expect(durationInput.disabled).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Workflow: Storage Unavailable Fallback', () => {
    it('should continue functioning when storage is unavailable', () => {
      // Mock storage as unavailable
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      // Create new storage instance
      const unavailableStorage = new StorageManager();
      expect(unavailableStorage.isAvailable()).toBe(false);

      // Create components with unavailable storage
      const taskManager = new TaskManager(
        unavailableStorage,
        new TaskValidator(),
        new TaskSorter(unavailableStorage)
      );
      taskManager.init();

      // Verify task operations still work (in-memory)
      taskManager.addTask('Test task');
      const tasks = taskManager.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].text).toBe('Test task');

      // Toggle task
      taskManager.toggleTask(tasks[0].id);
      expect(taskManager.getTasks()[0].completed).toBe(true);

      // Delete task
      taskManager.deleteTask(tasks[0].id);
      expect(taskManager.getTasks()).toHaveLength(0);
    });

    it('should display warning when storage is unavailable', () => {
      // Mock storage as unavailable
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      // Create storage instance
      const unavailableStorage = new StorageManager();
      
      // Try to set something to trigger the warning
      unavailableStorage.set('test', 'value');

      // Verify warning is displayed
      const warningBanner = document.getElementById('storage-warning');
      expect(warningBanner.classList.contains('hidden')).toBe(false);
    });

    it('should work with theme manager when storage unavailable', () => {
      // Mock storage as unavailable
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      const unavailableStorage = new StorageManager();
      const themeManager = new ThemeManager(unavailableStorage);
      themeManager.init();

      // Verify theme toggle still works (in-memory)
      expect(themeManager.getCurrentTheme()).toBe('light');

      themeManager.toggle();
      expect(themeManager.getCurrentTheme()).toBe('dark');
      expect(document.body.classList.contains('theme-dark')).toBe(true);
    });

    it('should work with greeting when storage unavailable', () => {
      // Mock storage as unavailable
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      const unavailableStorage = new StorageManager();
      const greeting = new GreetingComponent(unavailableStorage);
      greeting.init();

      // Verify name setting still works (in-memory)
      greeting.setCustomName('TestUser');
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toContain('TestUser');
    });

    it('should work with timer when storage unavailable', () => {
      // Mock storage as unavailable
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      const unavailableStorage = new StorageManager();
      const timer = new PomodoroTimer(unavailableStorage);
      timer.init();

      // Verify timer operations still work (in-memory)
      const result = timer.setDuration(35);
      expect(result).toBe(true);

      const display = document.getElementById('timer-display').textContent;
      expect(display).toBe('35:00');
    });
  });

  describe('Workflow: Quota Exceeded Handling', () => {
    it('should handle quota exceeded error gracefully', () => {
      // Mock quota exceeded error
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      // Try to add task (which triggers storage)
      taskManager.addTask('Test task');

      // Verify error message was displayed
      expect(alertSpy).toHaveBeenCalledWith(
        'Storage limit reached. Unable to save changes.'
      );

      // Verify task still exists in memory
      const tasks = taskManager.getTasks();
      expect(tasks).toHaveLength(1);

      alertSpy.mockRestore();
    });

    it('should handle quota exceeded with error code 22', () => {
      // Mock quota exceeded error with code 22
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('Quota exceeded');
        error.code = 22;
        throw error;
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      // Try to set theme (which triggers storage)
      themeManager.toggle();

      // Verify error message was displayed
      expect(alertSpy).toHaveBeenCalledWith(
        'Storage limit reached. Unable to save changes.'
      );

      // Verify theme still changed in memory
      expect(themeManager.getCurrentTheme()).toBe('dark');

      alertSpy.mockRestore();
    });

    it('should handle quota exceeded when setting custom name', () => {
      // Mock quota exceeded error
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      // Try to set custom name
      greeting.setCustomName('LongNameThatExceedsQuota');

      // Verify error message was displayed
      expect(alertSpy).toHaveBeenCalledWith(
        'Storage limit reached. Unable to save changes.'
      );

      // Verify name still set in memory
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toContain('LongNameThatExceedsQuota');

      alertSpy.mockRestore();
    });

    it('should handle quota exceeded when setting timer duration', () => {
      // Mock quota exceeded error
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('Quota exceeded');
        error.code = 1014;
        throw error;
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      // Try to set timer duration
      const result = pomodoroTimer.setDuration(60);

      // Verify operation succeeded in memory even though storage failed
      expect(result).toBe(true);

      // Verify error message was displayed
      expect(alertSpy).toHaveBeenCalledWith(
        'Storage limit reached. Unable to save changes.'
      );

      alertSpy.mockRestore();
    });
  });

  describe('Cross-Component Integration', () => {
    it('should maintain all preferences across complete page reload', () => {
      // Set up complete state
      themeManager.toggle(); // Dark theme
      greeting.setCustomName('Integration Test User');
      pomodoroTimer.setDuration(50);
      taskManager.addTask('Task 1');
      taskManager.addTask('Task 2');
      taskSorter.setSortPreference('alpha-az');
      taskManager.applySorting();

      // Toggle first task
      const tasks = taskManager.getTasks();
      taskManager.toggleTask(tasks[0].id);

      // Simulate complete page reload - create all new instances
      const newStorage = new StorageManager();
      const newThemeManager = new ThemeManager(newStorage);
      const newGreeting = new GreetingComponent(newStorage);
      const newTimer = new PomodoroTimer(newStorage);
      const newTaskSorter = new TaskSorter(newStorage);
      const newTaskManager = new TaskManager(
        newStorage,
        new TaskValidator(),
        newTaskSorter
      );

      // Initialize all components
      newThemeManager.init();
      newGreeting.init();
      newTimer.init();
      newTaskManager.init();

      // Verify all state persisted correctly
      expect(newThemeManager.getCurrentTheme()).toBe('dark');
      expect(document.getElementById('greeting-text').textContent).toContain(
        'Integration Test User'
      );
      expect(document.getElementById('timer-display').textContent).toBe(
        '50:00'
      );

      const persistedTasks = newTaskManager.getTasks();
      expect(persistedTasks).toHaveLength(2);
      expect(newTaskSorter.getSortPreference()).toBe('alpha-az');

      // Verify task completion status persisted
      const completedTask = persistedTasks.find((t) => t.completed);
      expect(completedTask).toBeDefined();
    });

    it('should handle mixed storage success and failure scenarios', () => {
      // Set up scenario where some storage operations succeed and some fail
      let callCount = 0;
      mockLocalStorage.setItem.mockImplementation((key, value) => {
        callCount++;
        // Fail every other call
        if (callCount % 2 === 0) {
          const error = new Error('Quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        }
        // Otherwise succeed (do nothing, mock handles it)
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      // Perform multiple operations
      themeManager.toggle(); // Should succeed
      greeting.setCustomName('Test'); // Should fail
      taskManager.addTask('Task'); // Should succeed

      // Verify some operations succeeded in memory
      expect(themeManager.getCurrentTheme()).toBe('dark');
      expect(document.getElementById('greeting-text').textContent).toContain(
        'Test'
      );
      expect(taskManager.getTasks()).toHaveLength(1);

      // Verify error was shown for failed operations
      expect(alertSpy).toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });
});
