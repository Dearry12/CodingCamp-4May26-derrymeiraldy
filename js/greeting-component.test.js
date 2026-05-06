import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GreetingComponent } from './greeting-component.js';

describe('GreetingComponent', () => {
  let mockStorage;
  let greeting;
  let originalDate;

  beforeEach(() => {
    // Create a mock storage manager
    mockStorage = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      isAvailable: vi.fn(() => true),
    };

    // Set up DOM
    document.body.innerHTML = `
      <h2 id="greeting-text" class="greeting"></h2>
      <input type="text" id="name-input" class="name-input" />
    `;

    // Create greeting component instance
    greeting = new GreetingComponent(mockStorage);
  });

  afterEach(() => {
    // Restore original Date if it was mocked
    if (originalDate) {
      global.Date = originalDate;
      originalDate = null;
    }
  });

  describe('init', () => {
    it('should display generic greeting when no name exists in storage', () => {
      mockStorage.get.mockReturnValue(null);
      
      greeting.init();
      
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toMatch(/^Good (morning|afternoon|evening)!$/);
    });

    it('should display custom name when name exists in storage', () => {
      mockStorage.get.mockReturnValue('Alice');
      
      greeting.init();
      
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toMatch(/^Good (morning|afternoon|evening), Alice!$/);
    });

    it('should populate name input field with saved name', () => {
      mockStorage.get.mockReturnValue('Bob');
      
      greeting.init();
      
      const nameInput = document.getElementById('name-input');
      expect(nameInput.value).toBe('Bob');
    });

    it('should leave name input empty when no saved name', () => {
      mockStorage.get.mockReturnValue(null);
      
      greeting.init();
      
      const nameInput = document.getElementById('name-input');
      expect(nameInput.value).toBe('');
    });

    it('should handle missing DOM elements gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => greeting.init()).not.toThrow();
    });
  });

  describe('updateGreeting', () => {
    beforeEach(() => {
      greeting.init();
    });

    it('should display generic greeting when custom name is null', () => {
      greeting.customName = null;
      
      greeting.updateGreeting();
      
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toMatch(/^Good (morning|afternoon|evening)!$/);
    });

    it('should display generic greeting when custom name is empty string', () => {
      greeting.customName = '';
      
      greeting.updateGreeting();
      
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toMatch(/^Good (morning|afternoon|evening)!$/);
    });

    it('should display generic greeting when custom name is whitespace only', () => {
      greeting.customName = '   ';
      
      greeting.updateGreeting();
      
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toMatch(/^Good (morning|afternoon|evening)!$/);
    });

    it('should display custom name in greeting', () => {
      greeting.customName = 'Charlie';
      
      greeting.updateGreeting();
      
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toMatch(/^Good (morning|afternoon|evening), Charlie!$/);
    });

    it('should trim whitespace from custom name in display', () => {
      greeting.customName = '  David  ';
      
      greeting.updateGreeting();
      
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toMatch(/^Good (morning|afternoon|evening), David!$/);
    });
  });

  describe('setCustomName', () => {
    beforeEach(() => {
      mockStorage.get.mockReturnValue(null);
      greeting.init();
    });

    it('should sanitize and store custom name', () => {
      greeting.setCustomName('Eve');
      
      expect(greeting.customName).toBe('Eve');
      expect(mockStorage.set).toHaveBeenCalledWith('customName', 'Eve');
    });

    it('should update greeting display after setting name', () => {
      greeting.setCustomName('Frank');
      
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toMatch(/^Good (morning|afternoon|evening), Frank!$/);
    });

    it('should remove name from storage when empty string provided', () => {
      greeting.setCustomName('');
      
      expect(mockStorage.remove).toHaveBeenCalledWith('customName');
    });

    it('should remove name from storage when whitespace-only string provided', () => {
      greeting.setCustomName('   ');
      
      expect(mockStorage.remove).toHaveBeenCalledWith('customName');
    });

    it('should sanitize HTML tags from name', () => {
      greeting.setCustomName('<script>alert("xss")</script>Grace');
      
      expect(greeting.customName).not.toContain('<script>');
      expect(greeting.customName).not.toContain('</script>');
    });

    it('should handle input event from name input field', async () => {
      const nameInput = document.getElementById('name-input');
      
      nameInput.value = 'Henry';
      nameInput.dispatchEvent(new Event('input'));
      
      // Greeting should update immediately
      expect(greeting.customName).toBe('Henry');
      
      // Storage write is debounced, so wait for it
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(mockStorage.set).toHaveBeenCalledWith('customName', 'Henry');
    });
  });

  describe('sanitizeName', () => {
    it('should return empty string for null input', () => {
      expect(greeting.sanitizeName(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(greeting.sanitizeName(undefined)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(greeting.sanitizeName(123)).toBe('');
      expect(greeting.sanitizeName({})).toBe('');
      expect(greeting.sanitizeName([])).toBe('');
    });

    it('should return plain text unchanged', () => {
      expect(greeting.sanitizeName('John')).toBe('John');
    });

    it('should remove HTML tags', () => {
      const result = greeting.sanitizeName('<b>Bold</b>');
      expect(result).toBe('Bold');
      expect(result).not.toContain('<b>');
      expect(result).not.toContain('</b>');
    });

    it('should prevent script tag execution', () => {
      const result = greeting.sanitizeName('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should handle multiple HTML tags', () => {
      const result = greeting.sanitizeName('<div><span>Test</span></div>');
      expect(result).toBe('Test');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should preserve special characters', () => {
      expect(greeting.sanitizeName('O\'Brien')).toBe('O\'Brien');
      expect(greeting.sanitizeName('José')).toBe('José');
      expect(greeting.sanitizeName('李明')).toBe('李明');
    });

    it('should handle empty string', () => {
      expect(greeting.sanitizeName('')).toBe('');
    });
  });

  describe('getTimeBasedGreeting', () => {
    it('should return "Good morning" for hours 5-11', () => {
      // Mock Date to return 8 AM
      originalDate = global.Date;
      global.Date = class extends originalDate {
        getHours() {
          return 8;
        }
      };
      
      expect(greeting.getTimeBasedGreeting()).toBe('Good morning');
    });

    it('should return "Good morning" at 5 AM', () => {
      originalDate = global.Date;
      global.Date = class extends originalDate {
        getHours() {
          return 5;
        }
      };
      
      expect(greeting.getTimeBasedGreeting()).toBe('Good morning');
    });

    it('should return "Good morning" at 11 AM', () => {
      originalDate = global.Date;
      global.Date = class extends originalDate {
        getHours() {
          return 11;
        }
      };
      
      expect(greeting.getTimeBasedGreeting()).toBe('Good morning');
    });

    it('should return "Good afternoon" for hours 12-17', () => {
      originalDate = global.Date;
      global.Date = class extends originalDate {
        getHours() {
          return 14;
        }
      };
      
      expect(greeting.getTimeBasedGreeting()).toBe('Good afternoon');
    });

    it('should return "Good afternoon" at 12 PM', () => {
      originalDate = global.Date;
      global.Date = class extends originalDate {
        getHours() {
          return 12;
        }
      };
      
      expect(greeting.getTimeBasedGreeting()).toBe('Good afternoon');
    });

    it('should return "Good afternoon" at 5 PM', () => {
      originalDate = global.Date;
      global.Date = class extends originalDate {
        getHours() {
          return 17;
        }
      };
      
      expect(greeting.getTimeBasedGreeting()).toBe('Good afternoon');
    });

    it('should return "Good evening" for hours 18-23', () => {
      originalDate = global.Date;
      global.Date = class extends originalDate {
        getHours() {
          return 20;
        }
      };
      
      expect(greeting.getTimeBasedGreeting()).toBe('Good evening');
    });

    it('should return "Good evening" at 6 PM', () => {
      originalDate = global.Date;
      global.Date = class extends originalDate {
        getHours() {
          return 18;
        }
      };
      
      expect(greeting.getTimeBasedGreeting()).toBe('Good evening');
    });

    it('should return "Good evening" for hours 0-4', () => {
      originalDate = global.Date;
      global.Date = class extends originalDate {
        getHours() {
          return 2;
        }
      };
      
      expect(greeting.getTimeBasedGreeting()).toBe('Good evening');
    });

    it('should return "Good evening" at midnight', () => {
      originalDate = global.Date;
      global.Date = class extends originalDate {
        getHours() {
          return 0;
        }
      };
      
      expect(greeting.getTimeBasedGreeting()).toBe('Good evening');
    });
  });

  describe('name persistence', () => {
    it('should persist name on input and restore on init', () => {
      // First init with no saved name
      mockStorage.get.mockReturnValue(null);
      greeting.init();
      
      // Set a custom name
      greeting.setCustomName('Isabella');
      expect(mockStorage.set).toHaveBeenCalledWith('customName', 'Isabella');
      
      // Simulate page reload - create new instance
      mockStorage.get.mockReturnValue('Isabella');
      const newGreeting = new GreetingComponent(mockStorage);
      newGreeting.init();
      
      expect(newGreeting.customName).toBe('Isabella');
      const greetingText = document.getElementById('greeting-text').textContent;
      expect(greetingText).toMatch(/^Good (morning|afternoon|evening), Isabella!$/);
    });
  });

  describe('XSS prevention', () => {
    beforeEach(() => {
      mockStorage.get.mockReturnValue(null);
      greeting.init();
    });

    it('should use textContent to prevent XSS in greeting display', () => {
      greeting.setCustomName('<img src=x onerror=alert(1)>');
      
      const greetingElement = document.getElementById('greeting-text');
      // Check that textContent was used (no HTML elements created)
      expect(greetingElement.children.length).toBe(0);
      expect(greetingElement.textContent).not.toContain('<img');
    });

    it('should sanitize malicious script tags', () => {
      greeting.setCustomName('<script>document.cookie</script>Jack');
      
      const greetingElement = document.getElementById('greeting-text');
      expect(greetingElement.innerHTML).not.toContain('<script>');
      expect(greetingElement.children.length).toBe(0);
    });

    it('should sanitize event handlers in HTML', () => {
      greeting.setCustomName('<div onclick="alert(1)">Kate</div>');
      
      const greetingElement = document.getElementById('greeting-text');
      expect(greetingElement.innerHTML).not.toContain('onclick');
      expect(greetingElement.children.length).toBe(0);
    });
  });
});
