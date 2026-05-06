import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PomodoroTimer } from './pomodoro-timer.js';

describe('PomodoroTimer', () => {
  let mockStorage;
  let timer;

  beforeEach(() => {
    // Create a mock storage manager
    mockStorage = {
      get: vi.fn(),
      set: vi.fn(),
      isAvailable: vi.fn(() => true),
    };

    // Set up DOM
    document.body.innerHTML = `
      <div id="timer-display" class="timer-display">25:00</div>
      <button id="timer-start" class="btn-timer">Start</button>
      <button id="timer-pause" class="btn-timer">Pause</button>
      <button id="timer-reset" class="btn-timer">Reset</button>
      <input type="number" id="timer-duration" min="1" max="120" value="25" />
      <span id="timer-error" class="error-message"></span>
    `;

    // Create timer instance
    timer = new PomodoroTimer(mockStorage);
  });

  afterEach(() => {
    // Clean up any running intervals
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
    }
  });

  describe('init', () => {
    it('should default to 25 minutes when no saved duration exists', () => {
      mockStorage.get.mockReturnValue(null);
      
      timer.init();
      
      expect(timer.duration).toBe(25);
      expect(timer.timeRemaining).toBe(25 * 60);
      expect(document.getElementById('timer-display').textContent).toBe('25:00');
    });

    it('should load saved duration from storage', () => {
      mockStorage.get.mockReturnValue(30);
      
      timer.init();
      
      expect(timer.duration).toBe(30);
      expect(timer.timeRemaining).toBe(30 * 60);
      expect(document.getElementById('timer-display').textContent).toBe('30:00');
    });

    it('should ignore invalid saved duration and use default', () => {
      mockStorage.get.mockReturnValue(150); // Out of range
      
      timer.init();
      
      expect(timer.duration).toBe(25);
      expect(timer.timeRemaining).toBe(25 * 60);
    });

    it('should set duration input value to current duration', () => {
      mockStorage.get.mockReturnValue(45);
      
      timer.init();
      
      expect(document.getElementById('timer-duration').value).toBe('45');
    });
  });

  describe('validateDuration', () => {
    it('should accept valid duration of 1 minute', () => {
      expect(timer.validateDuration(1)).toBe(true);
    });

    it('should accept valid duration of 120 minutes', () => {
      expect(timer.validateDuration(120)).toBe(true);
    });

    it('should accept valid duration in middle range', () => {
      expect(timer.validateDuration(25)).toBe(true);
      expect(timer.validateDuration(60)).toBe(true);
    });

    it('should reject duration of 0', () => {
      expect(timer.validateDuration(0)).toBe(false);
    });

    it('should reject negative duration', () => {
      expect(timer.validateDuration(-5)).toBe(false);
    });

    it('should reject duration above 120', () => {
      expect(timer.validateDuration(121)).toBe(false);
      expect(timer.validateDuration(200)).toBe(false);
    });

    it('should reject non-integer values', () => {
      expect(timer.validateDuration(25.5)).toBe(false);
      expect(timer.validateDuration(30.1)).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(timer.validateDuration('25')).toBe(false);
      expect(timer.validateDuration(NaN)).toBe(false);
      expect(timer.validateDuration(null)).toBe(false);
      expect(timer.validateDuration(undefined)).toBe(false);
    });
  });

  describe('setDuration', () => {
    beforeEach(() => {
      timer.init();
    });

    it('should set valid duration and update display', () => {
      const result = timer.setDuration(30);
      
      expect(result).toBe(true);
      expect(timer.duration).toBe(30);
      expect(timer.timeRemaining).toBe(30 * 60);
      expect(document.getElementById('timer-display').textContent).toBe('30:00');
    });

    it('should persist duration to storage', () => {
      timer.setDuration(45);
      
      expect(mockStorage.set).toHaveBeenCalledWith('pomodoroMinutes', 45);
    });

    it('should reject invalid duration and show error', () => {
      timer.duration = 25;
      const result = timer.setDuration(150);
      
      expect(result).toBe(false);
      expect(timer.duration).toBe(25); // Should remain unchanged
      expect(document.getElementById('timer-error').textContent).toBe('Duration must be between 1 and 120 minutes');
    });

    it('should reset input to current duration on invalid input', () => {
      timer.duration = 25;
      document.getElementById('timer-duration').value = '150';
      
      timer.setDuration(150);
      
      expect(document.getElementById('timer-duration').value).toBe('25');
    });

    it('should clear previous error messages', () => {
      timer.init();
      timer.setDuration(150); // Invalid
      expect(document.getElementById('timer-error').textContent).not.toBe('');
      
      timer.setDuration(30); // Valid
      expect(document.getElementById('timer-error').textContent).toBe('');
    });
  });

  describe('updateDisplay', () => {
    beforeEach(() => {
      timer.init();
    });

    it('should format time as MM:SS with padding', () => {
      timer.timeRemaining = 25 * 60; // 25:00
      timer.updateDisplay();
      expect(document.getElementById('timer-display').textContent).toBe('25:00');
      
      timer.timeRemaining = 5 * 60 + 30; // 5:30
      timer.updateDisplay();
      expect(document.getElementById('timer-display').textContent).toBe('05:30');
      
      timer.timeRemaining = 59; // 0:59
      timer.updateDisplay();
      expect(document.getElementById('timer-display').textContent).toBe('00:59');
      
      timer.timeRemaining = 0; // 0:00
      timer.updateDisplay();
      expect(document.getElementById('timer-display').textContent).toBe('00:00');
    });

    it('should pad single digit minutes and seconds with zero', () => {
      timer.timeRemaining = 9 * 60 + 5; // 9:05
      timer.updateDisplay();
      expect(document.getElementById('timer-display').textContent).toBe('09:05');
    });
  });

  describe('start/pause/reset', () => {
    beforeEach(() => {
      timer.init();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should start timer and set running state', () => {
      timer.start();
      
      expect(timer.isRunning()).toBe(true);
      expect(timer.intervalId).not.toBeNull();
    });

    it('should disable settings when timer starts', () => {
      timer.start();
      
      expect(document.getElementById('timer-duration').disabled).toBe(true);
    });

    it('should countdown time when running', () => {
      timer.timeRemaining = 10;
      timer.start();
      
      vi.advanceTimersByTime(1000);
      expect(timer.timeRemaining).toBe(9);
      
      vi.advanceTimersByTime(1000);
      expect(timer.timeRemaining).toBe(8);
    });

    it('should pause timer and clear running state', () => {
      timer.start();
      timer.pause();
      
      expect(timer.isRunning()).toBe(false);
      expect(timer.intervalId).toBeNull();
    });

    it('should enable settings when timer pauses', () => {
      timer.start();
      timer.pause();
      
      expect(document.getElementById('timer-duration').disabled).toBe(false);
    });

    it('should reset timer to initial duration', () => {
      timer.duration = 25;
      timer.timeRemaining = 10;
      timer.start();
      
      timer.reset();
      
      expect(timer.timeRemaining).toBe(25 * 60);
      expect(timer.isRunning()).toBe(false);
    });

    it('should stop countdown when timer reaches zero', () => {
      timer.timeRemaining = 2;
      timer.start();
      
      vi.advanceTimersByTime(2000);
      
      expect(timer.timeRemaining).toBe(0);
      expect(timer.isRunning()).toBe(false);
    });

    it('should not start timer if already running', () => {
      timer.start();
      const firstIntervalId = timer.intervalId;
      
      timer.start();
      
      expect(timer.intervalId).toBe(firstIntervalId);
    });

    it('should not pause timer if not running', () => {
      expect(timer.isRunning()).toBe(false);
      
      timer.pause();
      
      expect(timer.isRunning()).toBe(false);
    });
  });

  describe('isRunning', () => {
    beforeEach(() => {
      timer.init();
    });

    it('should return false initially', () => {
      expect(timer.isRunning()).toBe(false);
    });

    it('should return true when timer is running', () => {
      timer.start();
      expect(timer.isRunning()).toBe(true);
    });

    it('should return false after pause', () => {
      timer.start();
      timer.pause();
      expect(timer.isRunning()).toBe(false);
    });
  });

  describe('duration persistence', () => {
    it('should persist duration on change and restore on init', () => {
      // First init with no saved duration
      mockStorage.get.mockReturnValue(null);
      timer.init();
      expect(timer.duration).toBe(25);
      
      // Set custom duration
      timer.setDuration(40);
      expect(mockStorage.set).toHaveBeenCalledWith('pomodoroMinutes', 40);
      
      // Simulate page reload - create new instance
      mockStorage.get.mockReturnValue(40);
      const newTimer = new PomodoroTimer(mockStorage);
      newTimer.init();
      
      expect(newTimer.duration).toBe(40);
      expect(newTimer.timeRemaining).toBe(40 * 60);
    });
  });
});
