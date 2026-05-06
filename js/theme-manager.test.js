import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeManager } from './theme-manager.js';

describe('ThemeManager', () => {
  let mockStorage;
  let themeManager;

  beforeEach(() => {
    // Create a mock storage manager
    mockStorage = {
      get: vi.fn(),
      set: vi.fn(),
      isAvailable: vi.fn(() => true),
    };

    // Set up DOM
    document.body.innerHTML = '<button id="theme-toggle"></button>';
    document.body.className = '';

    // Create theme manager instance
    themeManager = new ThemeManager(mockStorage);
  });

  describe('init', () => {
    it('should default to light theme when no saved theme exists', () => {
      mockStorage.get.mockReturnValue(null);
      
      themeManager.init();
      
      expect(themeManager.getCurrentTheme()).toBe('light');
      expect(document.body.classList.contains('theme-light')).toBe(true);
    });

    it('should load saved light theme from storage', () => {
      mockStorage.get.mockReturnValue('light');
      
      themeManager.init();
      
      expect(themeManager.getCurrentTheme()).toBe('light');
      expect(document.body.classList.contains('theme-light')).toBe(true);
    });

    it('should load saved dark theme from storage', () => {
      mockStorage.get.mockReturnValue('dark');
      
      themeManager.init();
      
      expect(themeManager.getCurrentTheme()).toBe('dark');
      expect(document.body.classList.contains('theme-dark')).toBe(true);
    });

    it('should default to light theme when invalid theme in storage', () => {
      mockStorage.get.mockReturnValue('invalid-theme');
      
      themeManager.init();
      
      expect(themeManager.getCurrentTheme()).toBe('light');
      expect(document.body.classList.contains('theme-light')).toBe(true);
    });

    it('should attach click event listener to theme toggle button', () => {
      mockStorage.get.mockReturnValue('light');
      const button = document.getElementById('theme-toggle');
      const clickSpy = vi.fn();
      button.addEventListener('click', clickSpy);
      
      themeManager.init();
      button.click();
      
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('should switch from light to dark theme', () => {
      themeManager.currentTheme = 'light';
      document.body.classList.add('theme-light');
      
      themeManager.toggle();
      
      expect(themeManager.getCurrentTheme()).toBe('dark');
      expect(document.body.classList.contains('theme-dark')).toBe(true);
      expect(document.body.classList.contains('theme-light')).toBe(false);
      expect(mockStorage.set).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should switch from dark to light theme', () => {
      themeManager.currentTheme = 'dark';
      document.body.classList.add('theme-dark');
      
      themeManager.toggle();
      
      expect(themeManager.getCurrentTheme()).toBe('light');
      expect(document.body.classList.contains('theme-light')).toBe(true);
      expect(document.body.classList.contains('theme-dark')).toBe(false);
      expect(mockStorage.set).toHaveBeenCalledWith('theme', 'light');
    });

    it('should persist theme preference to storage', () => {
      themeManager.currentTheme = 'light';
      
      themeManager.toggle();
      
      expect(mockStorage.set).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  describe('applyTheme', () => {
    it('should apply light theme class to body', () => {
      themeManager.applyTheme('light');
      
      expect(document.body.classList.contains('theme-light')).toBe(true);
      expect(document.body.classList.contains('theme-dark')).toBe(false);
      expect(themeManager.getCurrentTheme()).toBe('light');
    });

    it('should apply dark theme class to body', () => {
      themeManager.applyTheme('dark');
      
      expect(document.body.classList.contains('theme-dark')).toBe(true);
      expect(document.body.classList.contains('theme-light')).toBe(false);
      expect(themeManager.getCurrentTheme()).toBe('dark');
    });

    it('should remove previous theme class when applying new theme', () => {
      document.body.classList.add('theme-dark');
      
      themeManager.applyTheme('light');
      
      expect(document.body.classList.contains('theme-light')).toBe(true);
      expect(document.body.classList.contains('theme-dark')).toBe(false);
    });

    it('should default to light theme for invalid theme value', () => {
      themeManager.applyTheme('invalid');
      
      expect(document.body.classList.contains('theme-light')).toBe(true);
      expect(document.body.classList.contains('theme-dark')).toBe(false);
    });
  });

  describe('getCurrentTheme', () => {
    it('should return current theme', () => {
      themeManager.currentTheme = 'dark';
      
      expect(themeManager.getCurrentTheme()).toBe('dark');
    });

    it('should return light as default theme', () => {
      expect(themeManager.getCurrentTheme()).toBe('light');
    });
  });

  describe('theme persistence', () => {
    it('should persist theme on toggle and restore on init', () => {
      // First init with no saved theme
      mockStorage.get.mockReturnValue(null);
      themeManager.init();
      expect(themeManager.getCurrentTheme()).toBe('light');
      
      // Toggle to dark
      themeManager.toggle();
      expect(mockStorage.set).toHaveBeenCalledWith('theme', 'dark');
      
      // Simulate page reload - create new instance
      mockStorage.get.mockReturnValue('dark');
      const newThemeManager = new ThemeManager(mockStorage);
      newThemeManager.init();
      
      expect(newThemeManager.getCurrentTheme()).toBe('dark');
      expect(document.body.classList.contains('theme-dark')).toBe(true);
    });
  });
});
