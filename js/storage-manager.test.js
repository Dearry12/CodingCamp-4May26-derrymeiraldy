import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from './storage-manager.js';

describe('StorageManager', () => {
  let storage;
  let mockLocalStorage;

  beforeEach(() => {
    // Create a mock localStorage
    mockLocalStorage = (() => {
      let store = {};
      return {
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
    })();

    // Replace global localStorage with mock
    global.localStorage = mockLocalStorage;

    // Create a fresh StorageManager instance
    storage = new StorageManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Availability Checks', () => {
    it('should detect available storage', () => {
      expect(storage.isAvailable()).toBe(true);
    });

    it('should detect unavailable storage', () => {
      // Mock localStorage to throw error
      global.localStorage = {
        setItem: vi.fn(() => {
          throw new Error('Storage unavailable');
        }),
        getItem: vi.fn(),
        removeItem: vi.fn(),
      };

      const unavailableStorage = new StorageManager();
      expect(unavailableStorage.isAvailable()).toBe(false);
    });
  });

  describe('Get Operations', () => {
    it('should get a string value', () => {
      mockLocalStorage.setItem('testKey', 'testValue');
      const result = storage.get('testKey');
      expect(result).toBe('testValue');
    });

    it('should get and parse JSON object', () => {
      const testObj = { name: 'Test', value: 42 };
      mockLocalStorage.setItem('testKey', JSON.stringify(testObj));
      const result = storage.get('testKey');
      expect(result).toEqual(testObj);
    });

    it('should get and parse JSON array', () => {
      const testArray = [1, 2, 3, 4, 5];
      mockLocalStorage.setItem('testKey', JSON.stringify(testArray));
      const result = storage.get('testKey');
      expect(result).toEqual(testArray);
    });

    it('should return null for non-existent key', () => {
      const result = storage.get('nonExistentKey');
      expect(result).toBe(null);
    });

    it('should return null when storage is unavailable', () => {
      storage.available = false;
      const result = storage.get('testKey');
      expect(result).toBe(null);
    });

    it('should handle malformed JSON gracefully', () => {
      // Store a string that looks like JSON but is invalid
      mockLocalStorage.setItem('testKey', '{invalid json}');
      const result = storage.get('testKey');
      // Should return the raw string when JSON parsing fails
      expect(result).toBe('{invalid json}');
    });

    it('should handle errors during get operation', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Read error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = storage.get('testKey');
      
      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith('Storage error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Set Operations', () => {
    it('should set a string value', () => {
      const result = storage.set('testKey', 'testValue');
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('testKey', 'testValue');
    });

    it('should set and serialize an object', () => {
      const testObj = { name: 'Test', value: 42 };
      const result = storage.set('testKey', testObj);
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify(testObj));
    });

    it('should set and serialize an array', () => {
      const testArray = [1, 2, 3];
      const result = storage.set('testKey', testArray);
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify(testArray));
    });

    it('should set and serialize a number', () => {
      const result = storage.set('testKey', 42);
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('testKey', '42');
    });

    it('should set and serialize a boolean', () => {
      const result = storage.set('testKey', true);
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('testKey', 'true');
    });

    it('should return false when storage is unavailable', () => {
      storage.available = false;
      const showWarningSpy = vi.spyOn(storage, 'showStorageWarning').mockImplementation(() => {});
      
      // Clear previous calls from constructor's checkAvailability
      mockLocalStorage.setItem.mockClear();
      
      const result = storage.set('testKey', 'testValue');
      
      expect(result).toBe(false);
      expect(showWarningSpy).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      
      showWarningSpy.mockRestore();
    });

    it('should handle quota exceeded error', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = storage.set('testKey', 'testValue');
      
      expect(result).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith('Storage limit reached. Unable to save changes.');
      expect(consoleSpy).toHaveBeenCalledWith('Storage error:', expect.any(Error));
      
      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should handle quota exceeded error with code 22', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('Quota exceeded');
        error.code = 22;
        throw error;
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = storage.set('testKey', 'testValue');
      
      expect(result).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith('Storage limit reached. Unable to save changes.');
      
      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should handle quota exceeded error with code 1014', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('Quota exceeded');
        error.code = 1014;
        throw error;
      });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = storage.set('testKey', 'testValue');
      
      expect(result).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith('Storage limit reached. Unable to save changes.');
      
      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should handle generic storage errors', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Generic storage error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const showWarningSpy = vi.spyOn(storage, 'showStorageWarning').mockImplementation(() => {});
      
      const result = storage.set('testKey', 'testValue');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Storage error:', expect.any(Error));
      expect(showWarningSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      showWarningSpy.mockRestore();
    });
  });

  describe('Remove Operations', () => {
    it('should remove an item', () => {
      mockLocalStorage.setItem('testKey', 'testValue');
      storage.remove('testKey');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('testKey');
    });

    it('should not call removeItem when storage is unavailable', () => {
      storage.available = false;
      
      // Clear previous calls from constructor's checkAvailability
      mockLocalStorage.removeItem.mockClear();
      
      storage.remove('testKey');
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should handle errors during remove operation', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Remove error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      storage.remove('testKey');
      
      expect(consoleSpy).toHaveBeenCalledWith('Storage error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('JSON Serialization/Deserialization', () => {
    it('should handle complex nested objects', () => {
      const complexObj = {
        user: {
          name: 'John',
          age: 30,
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        tasks: [
          { id: 1, text: 'Task 1', completed: false },
          { id: 2, text: 'Task 2', completed: true },
        ],
      };

      storage.set('complex', complexObj);
      const result = storage.get('complex');
      expect(result).toEqual(complexObj);
    });

    it('should handle null values', () => {
      storage.set('nullValue', null);
      const result = storage.get('nullValue');
      expect(result).toBe(null);
    });

    it('should handle undefined by converting to null', () => {
      storage.set('undefinedValue', undefined);
      const result = storage.get('undefinedValue');
      // undefined gets serialized as null in JSON
      expect(result).toBe(null);
    });

    it('should handle empty string', () => {
      storage.set('emptyString', '');
      const result = storage.get('emptyString');
      // Empty string is stored as-is and returned as-is (JSON.parse('') fails, so raw string is returned)
      expect(result).toBe('');
    });

    it('should handle empty object', () => {
      storage.set('emptyObject', {});
      const result = storage.get('emptyObject');
      expect(result).toEqual({});
    });

    it('should handle empty array', () => {
      storage.set('emptyArray', []);
      const result = storage.get('emptyArray');
      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should show storage warning for generic errors', () => {
      const mockWarningBanner = document.createElement('div');
      mockWarningBanner.id = 'storage-warning';
      mockWarningBanner.classList.add('hidden');
      document.body.appendChild(mockWarningBanner);

      const error = new Error('Generic error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      storage.handleError(error);
      
      expect(consoleSpy).toHaveBeenCalledWith('Storage error:', error);
      expect(mockWarningBanner.classList.contains('hidden')).toBe(false);
      
      document.body.removeChild(mockWarningBanner);
      consoleSpy.mockRestore();
    });

    it('should show quota error for QuotaExceededError', () => {
      const error = new Error('Quota exceeded');
      error.name = 'QuotaExceededError';
      
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      storage.handleError(error);
      
      expect(alertSpy).toHaveBeenCalledWith('Storage limit reached. Unable to save changes.');
      
      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should only show storage warning once', () => {
      const mockWarningBanner = document.createElement('div');
      mockWarningBanner.id = 'storage-warning';
      mockWarningBanner.classList.add('hidden');
      document.body.appendChild(mockWarningBanner);

      storage.showStorageWarning();
      expect(storage.warningDisplayed).toBe(true);
      
      // Add hidden class back to test it doesn't get removed again
      mockWarningBanner.classList.add('hidden');
      storage.showStorageWarning();
      expect(mockWarningBanner.classList.contains('hidden')).toBe(true);
      
      document.body.removeChild(mockWarningBanner);
    });

    it('should handle missing warning banner gracefully', () => {
      // No warning banner in DOM
      expect(() => storage.showStorageWarning()).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete set-get-remove cycle', () => {
      const testData = { name: 'Test', value: 123 };
      
      // Set
      const setResult = storage.set('testKey', testData);
      expect(setResult).toBe(true);
      
      // Get
      const getData = storage.get('testKey');
      expect(getData).toEqual(testData);
      
      // Remove
      storage.remove('testKey');
      
      // Verify removed
      const removedData = storage.get('testKey');
      expect(removedData).toBe(null);
    });

    it('should handle multiple keys independently', () => {
      storage.set('key1', 'value1');
      storage.set('key2', { data: 'value2' });
      storage.set('key3', [1, 2, 3]);
      
      expect(storage.get('key1')).toBe('value1');
      expect(storage.get('key2')).toEqual({ data: 'value2' });
      expect(storage.get('key3')).toEqual([1, 2, 3]);
      
      storage.remove('key2');
      
      expect(storage.get('key1')).toBe('value1');
      expect(storage.get('key2')).toBe(null);
      expect(storage.get('key3')).toEqual([1, 2, 3]);
    });

    it('should overwrite existing values', () => {
      storage.set('testKey', 'oldValue');
      expect(storage.get('testKey')).toBe('oldValue');
      
      storage.set('testKey', 'newValue');
      expect(storage.get('testKey')).toBe('newValue');
    });
  });
});
