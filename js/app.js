/**
 * Productivity Dashboard - All-in-One Application
 * A simple, clean productivity dashboard with theme switching, custom greetings,
 * Pomodoro timer, and task management with duplicate prevention and sorting.
 */

// ============================================================================
// STORAGE MANAGER
// ============================================================================

/**
 * Storage Manager
 * Centralized interface for Local Storage operations with error handling
 */
class StorageManager {
  constructor() {
    this.available = this.checkAvailability();
    this.warningDisplayed = false;
  }

  checkAvailability() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  isAvailable() {
    return this.available;
  }

  get(key) {
    if (!this.available) {
      return null;
    }

    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }
      
      try {
        return JSON.parse(item);
      } catch (e) {
        return item;
      }
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  set(key, value) {
    if (!this.available) {
      this.showStorageWarning();
      return false;
    }

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  remove(key) {
    if (!this.available) {
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      this.handleError(error);
    }
  }

  handleError(error) {
    console.error('Storage error:', error);

    if (error.name === 'QuotaExceededError' || 
        error.code === 22 || 
        error.code === 1014) {
      this.showQuotaError();
    } else {
      this.showStorageWarning();
    }
  }

  showStorageWarning() {
    if (this.warningDisplayed) {
      return;
    }

    const warningBanner = document.getElementById('storage-warning');
    if (warningBanner) {
      warningBanner.classList.remove('hidden');
      this.warningDisplayed = true;
    }
  }

  showQuotaError() {
    alert('Storage limit reached. Unable to save changes.');
  }
}

// ============================================================================
// THEME MANAGER
// ============================================================================

/**
 * Theme Manager
 * Manages theme switching and persistence
 */
class ThemeManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.currentTheme = 'light';
    this.storageKey = 'theme';
  }

  init() {
    const savedTheme = this.storage.get(this.storageKey);
    
    if (savedTheme === 'light' || savedTheme === 'dark') {
      this.currentTheme = savedTheme;
    } else {
      this.currentTheme = 'light';
    }
    
    this.applyTheme(this.currentTheme);
    
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => this.toggle());
    }
  }

  toggle() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.currentTheme);
    this.storage.set(this.storageKey, this.currentTheme);
  }

  applyTheme(theme) {
    const body = document.body;
    body.classList.remove('theme-light', 'theme-dark');
    
    if (theme === 'dark') {
      body.classList.add('theme-dark');
    } else {
      body.classList.add('theme-light');
    }
    
    this.currentTheme = theme;
  }

  getCurrentTheme() {
    return this.currentTheme;
  }
}

// ============================================================================
// GREETING COMPONENT
// ============================================================================

/**
 * Greeting Component
 * Manages personalized greeting with custom name and time-based messages
 */
class GreetingComponent {
  constructor(storageManager) {
    this.storage = storageManager;
    this.customName = null;
    this.greetingElement = null;
    this.nameInputElement = null;
  }

  init() {
    this.greetingElement = document.getElementById('greeting-text');
    this.nameInputElement = document.getElementById('name-input');

    if (!this.greetingElement || !this.nameInputElement) {
      console.error('Greeting elements not found in DOM');
      return;
    }

    this.customName = this.storage.get('customName');

    if (this.customName) {
      this.nameInputElement.value = this.customName;
    }

    this.updateGreeting();

    let debounceTimer;
    this.nameInputElement.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      
      this.customName = this.sanitizeName(e.target.value);
      this.updateGreeting();
      
      debounceTimer = setTimeout(() => {
        this.setCustomName(e.target.value);
      }, 300);
    });
  }

  updateGreeting() {
    if (!this.greetingElement) {
      return;
    }

    const timeGreeting = this.getTimeBasedGreeting();
    const trimmedName = this.customName ? this.customName.trim() : '';
    
    if (trimmedName) {
      this.greetingElement.textContent = `${timeGreeting}, ${trimmedName}!`;
    } else {
      this.greetingElement.textContent = `${timeGreeting}!`;
    }
  }

  setCustomName(name) {
    const sanitized = this.sanitizeName(name);
    this.customName = sanitized;
    
    if (sanitized && sanitized.trim()) {
      this.storage.set('customName', sanitized);
    } else {
      this.storage.remove('customName');
    }
    
    this.updateGreeting();
  }

  sanitizeName(name) {
    if (!name || typeof name !== 'string') {
      return '';
    }

    const temp = document.createElement('div');
    temp.innerHTML = name;
    return temp.textContent || temp.innerText || '';
  }

  getTimeBasedGreeting() {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'Good morning';
    } else if (hour >= 12 && hour < 18) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  }
}

// ============================================================================
// POMODORO TIMER
// ============================================================================

/**
 * Pomodoro Timer
 * Manages focus timer with customizable duration
 */
class PomodoroTimer {
  constructor(storageManager) {
    this.storage = storageManager;
    this.duration = 25;
    this.timeRemaining = this.duration * 60;
    this.intervalId = null;
    this.running = false;
    
    this.displayElement = null;
    this.startButton = null;
    this.pauseButton = null;
    this.resetButton = null;
    this.durationInput = null;
    this.errorElement = null;
  }

  init() {
    this.displayElement = document.getElementById('timer-display');
    this.startButton = document.getElementById('timer-start');
    this.pauseButton = document.getElementById('timer-pause');
    this.resetButton = document.getElementById('timer-reset');
    this.durationInput = document.getElementById('timer-duration');
    this.errorElement = document.getElementById('timer-error');

    const savedDuration = this.storage.get('pomodoroMinutes');
    if (savedDuration !== null && this.validateDuration(savedDuration)) {
      this.duration = savedDuration;
    }

    this.timeRemaining = this.duration * 60;
    this.durationInput.value = this.duration;
    this.updateDisplay();

    this.attachEventListeners();
  }

  attachEventListeners() {
    this.startButton.addEventListener('click', () => this.start());
    this.pauseButton.addEventListener('click', () => this.pause());
    this.resetButton.addEventListener('click', () => this.reset());
    this.durationInput.addEventListener('change', (e) => {
      const minutes = parseInt(e.target.value, 10);
      this.setDuration(minutes);
    });
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.disableSettings();

    this.intervalId = setInterval(() => {
      this.timeRemaining--;

      if (this.timeRemaining <= 0) {
        this.pause();
        this.timeRemaining = 0;
      }

      this.updateDisplay();
    }, 1000);
  }

  pause() {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.enableSettings();

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.pause();
    this.timeRemaining = this.duration * 60;
    this.updateDisplay();
  }

  setDuration(minutes) {
    this.clearError();

    if (!this.validateDuration(minutes)) {
      this.showError('Duration must be between 1 and 120 minutes');
      this.durationInput.value = this.duration;
      return false;
    }

    this.duration = minutes;
    this.timeRemaining = this.duration * 60;
    this.updateDisplay();

    this.storage.set('pomodoroMinutes', this.duration);

    return true;
  }

  validateDuration(minutes) {
    if (typeof minutes !== 'number' || isNaN(minutes)) {
      return false;
    }

    if (!Number.isInteger(minutes)) {
      return false;
    }

    return minutes >= 1 && minutes <= 120;
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (this.displayElement) {
      this.displayElement.textContent = formattedTime;
    }
  }

  isRunning() {
    return this.running;
  }

  disableSettings() {
    if (this.durationInput) {
      this.durationInput.disabled = true;
    }
  }

  enableSettings() {
    if (this.durationInput) {
      this.durationInput.disabled = false;
    }
  }

  showError(message) {
    if (this.errorElement) {
      this.errorElement.textContent = message;
      this.errorElement.style.display = 'inline';
    }
  }

  clearError() {
    if (this.errorElement) {
      this.errorElement.textContent = '';
      this.errorElement.style.display = 'none';
    }
  }
}

// ============================================================================
// TASK VALIDATOR
// ============================================================================

/**
 * Task Validator
 * Validates task input and checks for duplicates
 */
class TaskValidator {
  validate(text, existingTasks) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return {
        valid: false,
        error: 'Task cannot be empty'
      };
    }

    if (this.isDuplicate(text, existingTasks)) {
      return {
        valid: false,
        error: 'This task already exists'
      };
    }

    return {
      valid: true,
      error: null
    };
  }

  isDuplicate(text, existingTasks) {
    const normalizedInput = this.normalizeText(text);

    return existingTasks.some(task => {
      const normalizedExisting = this.normalizeText(task.text);
      return normalizedExisting === normalizedInput;
    });
  }

  normalizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    return text.trim().toLowerCase();
  }
}

// ============================================================================
// TASK SORTER
// ============================================================================

/**
 * Task Sorter
 * Sorts tasks by various criteria and persists sort preference
 */
class TaskSorter {
  static SortOption = {
    DATE_NEWEST: 'date-newest',
    DATE_OLDEST: 'date-oldest',
    ALPHA_AZ: 'alpha-az',
    ALPHA_ZA: 'alpha-za',
    STATUS_INCOMPLETE_FIRST: 'status-incomplete',
    STATUS_COMPLETE_FIRST: 'status-complete'
  };

  constructor(storageManager) {
    this.storageManager = storageManager;
    this.currentSortPreference = TaskSorter.SortOption.DATE_NEWEST;
  }

  sort(tasks, option) {
    const tasksCopy = [...tasks];

    switch (option) {
      case TaskSorter.SortOption.DATE_OLDEST:
        return this.sortByDateOldest(tasksCopy);
      
      case TaskSorter.SortOption.DATE_NEWEST:
        return this.sortByDateNewest(tasksCopy);
      
      case TaskSorter.SortOption.ALPHA_AZ:
        return this.sortAlphabeticallyAZ(tasksCopy);
      
      case TaskSorter.SortOption.ALPHA_ZA:
        return this.sortAlphabeticallyZA(tasksCopy);
      
      case TaskSorter.SortOption.STATUS_INCOMPLETE_FIRST:
        return this.sortByStatusIncompleteFirst(tasksCopy);
      
      case TaskSorter.SortOption.STATUS_COMPLETE_FIRST:
        return this.sortByStatusCompleteFirst(tasksCopy);
      
      default:
        return this.sortByDateNewest(tasksCopy);
    }
  }

  sortByDateOldest(tasks) {
    return tasks.sort((a, b) => a.createdAt - b.createdAt);
  }

  sortByDateNewest(tasks) {
    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  }

  sortAlphabeticallyAZ(tasks) {
    return tasks.sort((a, b) => 
      a.text.toLowerCase().localeCompare(b.text.toLowerCase())
    );
  }

  sortAlphabeticallyZA(tasks) {
    return tasks.sort((a, b) => 
      b.text.toLowerCase().localeCompare(a.text.toLowerCase())
    );
  }

  sortByStatusIncompleteFirst(tasks) {
    return tasks.sort((a, b) => {
      if (a.completed === b.completed) {
        return b.createdAt - a.createdAt;
      }
      return a.completed ? 1 : -1;
    });
  }

  sortByStatusCompleteFirst(tasks) {
    return tasks.sort((a, b) => {
      if (a.completed === b.completed) {
        return b.createdAt - a.createdAt;
      }
      return a.completed ? -1 : 1;
    });
  }

  setSortPreference(option) {
    this.currentSortPreference = option;
    this.storageManager.set('sortPreference', option);
  }

  getSortPreference() {
    const saved = this.storageManager.get('sortPreference');
    if (saved && Object.values(TaskSorter.SortOption).includes(saved)) {
      this.currentSortPreference = saved;
      return saved;
    }
    return TaskSorter.SortOption.DATE_NEWEST;
  }
}

// ============================================================================
// QUICK LINKS MANAGER
// ============================================================================

/**
 * Quick Links Manager
 * Manages favorite website links with Local Storage persistence
 */
class QuickLinksManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.links = [];
    this.storageKey = 'quickLinks';
  }

  init() {
    const savedLinks = this.storageManager.get(this.storageKey);
    if (savedLinks && Array.isArray(savedLinks)) {
      this.links = savedLinks;
    } else {
      this.links = [];
    }

    this.render();
  }

  addLink(name, url) {
    // Validate inputs
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return {
        success: false,
        error: 'Link name cannot be empty'
      };
    }

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return {
        success: false,
        error: 'URL cannot be empty'
      };
    }

    // Validate URL format
    if (!this.isValidUrl(url)) {
      return {
        success: false,
        error: 'Please enter a valid URL (e.g., https://example.com)'
      };
    }

    // Check for duplicate names
    const normalizedName = name.trim().toLowerCase();
    const isDuplicate = this.links.some(link => 
      link.name.toLowerCase() === normalizedName
    );

    if (isDuplicate) {
      return {
        success: false,
        error: 'A link with this name already exists'
      };
    }

    const newLink = {
      id: Date.now().toString(),
      name: name.trim(),
      url: this.normalizeUrl(url.trim()),
      createdAt: Date.now()
    };

    this.links.push(newLink);
    this.storageManager.set(this.storageKey, this.links);
    this.render();

    return {
      success: true,
      error: null
    };
  }

  deleteLink(linkId) {
    this.links = this.links.filter(link => link.id !== linkId);
    this.storageManager.set(this.storageKey, this.links);
    this.render();
  }

  getLinks() {
    return this.links;
  }

  isValidUrl(url) {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  normalizeUrl(url) {
    // Add https:// if no protocol specified
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  render() {
    const linksContainer = document.getElementById('quick-links-container');
    
    if (!linksContainer) {
      console.error('Quick links container not found');
      return;
    }

    linksContainer.innerHTML = '';

    if (this.links.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = 'No quick links yet. Add your favorite websites!';
      linksContainer.appendChild(emptyMessage);
      return;
    }

    const fragment = document.createDocumentFragment();

    this.links.forEach(link => {
      const linkButton = document.createElement('div');
      linkButton.className = 'quick-link-item';
      linkButton.dataset.linkId = link.id;

      const linkAnchor = document.createElement('a');
      linkAnchor.href = link.url;
      linkAnchor.target = '_blank';
      linkAnchor.rel = 'noopener noreferrer';
      linkAnchor.className = 'quick-link-button';
      linkAnchor.textContent = link.name;
      linkAnchor.setAttribute('aria-label', `Open ${link.name} in new tab`);

      const deleteButton = document.createElement('button');
      deleteButton.className = 'quick-link-delete';
      deleteButton.textContent = '×';
      deleteButton.setAttribute('aria-label', `Delete ${link.name}`);
      
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteLink(link.id);
      });

      linkButton.appendChild(linkAnchor);
      linkButton.appendChild(deleteButton);

      fragment.appendChild(linkButton);
    });

    linksContainer.appendChild(fragment);
  }
}

// ============================================================================
// TASK MANAGER
// ============================================================================

/**
 * Task Manager
 * Coordinates task operations, validation, and sorting
 */
class TaskManager {
  constructor(storageManager, validator, sorter) {
    this.storageManager = storageManager;
    this.validator = validator;
    this.sorter = sorter;
    this.tasks = [];
  }

  init() {
    const savedTasks = this.storageManager.get('tasks');
    if (savedTasks && Array.isArray(savedTasks)) {
      this.tasks = savedTasks;
    } else {
      this.tasks = [];
    }

    this.applySorting();
  }

  addTask(text) {
    const validation = this.validator.validate(text, this.tasks);
    
    if (!validation.valid) {
      return false;
    }

    const newTask = {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now()
    };

    this.tasks.push(newTask);
    this.applySorting();
    this.storageManager.set('tasks', this.tasks);

    return true;
  }

  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    
    if (task) {
      task.completed = !task.completed;
      this.applySorting();
      this.storageManager.set('tasks', this.tasks);
    }
  }

  deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.storageManager.set('tasks', this.tasks);
  }

  getTasks() {
    return this.tasks;
  }

  applySorting() {
    const sortPreference = this.sorter.getSortPreference();
    this.tasks = this.sorter.sort(this.tasks, sortPreference);
  }

  render() {
    const taskListElement = document.getElementById('task-list');
    
    if (!taskListElement) {
      console.error('Task list element not found');
      return;
    }

    taskListElement.innerHTML = '';

    const fragment = document.createDocumentFragment();

    this.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.dataset.taskId = task.id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.completed ? 'incomplete' : 'complete'}`);
      
      checkbox.addEventListener('change', () => {
        this.toggleTask(task.id);
        this.render();
      });

      const textSpan = document.createElement('span');
      textSpan.className = 'task-text';
      textSpan.textContent = task.text;
      if (task.completed) {
        textSpan.classList.add('completed');
      }

      const deleteButton = document.createElement('button');
      deleteButton.className = 'task-delete';
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete "${task.text}"`);
      
      deleteButton.addEventListener('click', () => {
        this.deleteTask(task.id);
        this.render();
      });

      li.appendChild(checkbox);
      li.appendChild(textSpan);
      li.appendChild(deleteButton);

      fragment.appendChild(li);
    });

    taskListElement.appendChild(fragment);
  }
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

/**
 * Initialize the application
 * Sets up all components and global error handling
 */
function initApp() {
  try {
    const storage = new StorageManager();
    
    const themeManager = new ThemeManager(storage);
    themeManager.init();
    
    const greeting = new GreetingComponent(storage);
    greeting.init();
    
    const pomodoroTimer = new PomodoroTimer(storage);
    pomodoroTimer.init();
    
    const taskValidator = new TaskValidator();
    const taskSorter = new TaskSorter(storage);
    
    const taskManager = new TaskManager(storage, taskValidator, taskSorter);
    taskManager.init();
    
    taskManager.render();
    
    const quickLinksManager = new QuickLinksManager(storage);
    quickLinksManager.init();
    
    attachEventListeners(taskManager, taskSorter, quickLinksManager);
    
    // Initialize clock
    updateClock();
    setInterval(updateClock, 1000);
    
    console.log('Dashboard initialized successfully');
    console.log('Storage available:', storage.isAvailable());
    console.log('Current theme:', themeManager.getCurrentTheme());
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
    handleGlobalError(error);
  }
}

/**
 * Update the clock display with current time and date
 */
function updateClock() {
  const now = new Date();
  
  // Format time as HH:MM:SS
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;
  
  // Format date as "Day, Month DD, YYYY"
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const date = now.getDate();
  const year = now.getFullYear();
  const dateString = `${dayName}, ${monthName} ${date}, ${year}`;
  
  // Update DOM elements
  const timeElement = document.getElementById('current-time');
  const dateElement = document.getElementById('current-date');
  
  if (timeElement) {
    timeElement.textContent = timeString;
  }
  
  if (dateElement) {
    dateElement.textContent = dateString;
  }
}

/**
 * Attach event listeners for all UI controls
 */
function attachEventListeners(taskManager, taskSorter, quickLinksManager) {
  const taskAddButton = document.getElementById('task-add');
  const taskInput = document.getElementById('task-input');
  const taskError = document.getElementById('task-error');
  
  if (taskAddButton && taskInput && taskError) {
    taskAddButton.addEventListener('click', () => {
      handleAddTask(taskManager, taskInput, taskError);
    });
    
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAddTask(taskManager, taskInput, taskError);
      }
    });
    
    taskInput.addEventListener('input', () => {
      clearTaskError(taskError);
    });
  }
  
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const sortOption = e.target.value;
      taskSorter.setSortPreference(sortOption);
      taskManager.applySorting();
      taskManager.render();
    });
  }

  // Quick Links event listeners
  const linkAddButton = document.getElementById('link-add');
  const linkNameInput = document.getElementById('link-name-input');
  const linkUrlInput = document.getElementById('link-url-input');
  const linkError = document.getElementById('link-error');

  if (linkAddButton && linkNameInput && linkUrlInput && linkError) {
    linkAddButton.addEventListener('click', () => {
      handleAddLink(quickLinksManager, linkNameInput, linkUrlInput, linkError);
    });

    linkUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAddLink(quickLinksManager, linkNameInput, linkUrlInput, linkError);
      }
    });

    linkNameInput.addEventListener('input', () => {
      clearLinkError(linkError);
    });

    linkUrlInput.addEventListener('input', () => {
      clearLinkError(linkError);
    });
  }
}

/**
 * Handle adding a new task
 */
function handleAddTask(taskManager, taskInput, taskError) {
  const taskText = taskInput.value;
  
  clearTaskError(taskError);
  
  const success = taskManager.addTask(taskText);
  
  if (success) {
    taskInput.value = '';
    taskManager.render();
  } else {
    const validation = taskManager.validator.validate(taskText, taskManager.getTasks());
    showTaskError(taskError, validation.error || 'Unable to add task');
  }
}

/**
 * Display task error message
 */
function showTaskError(taskError, message) {
  if (taskError) {
    taskError.textContent = message;
    taskError.style.display = 'inline';
  }
}

/**
 * Clear task error message
 */
function clearTaskError(taskError) {
  if (taskError) {
    taskError.textContent = '';
    taskError.style.display = 'none';
  }
}

/**
 * Handle adding a new quick link
 */
function handleAddLink(quickLinksManager, linkNameInput, linkUrlInput, linkError) {
  const linkName = linkNameInput.value;
  const linkUrl = linkUrlInput.value;

  clearLinkError(linkError);

  const result = quickLinksManager.addLink(linkName, linkUrl);

  if (result.success) {
    linkNameInput.value = '';
    linkUrlInput.value = '';
  } else {
    showLinkError(linkError, result.error || 'Unable to add link');
  }
}

/**
 * Display link error message
 */
function showLinkError(linkError, message) {
  if (linkError) {
    linkError.textContent = message;
    linkError.style.display = 'inline';
  }
}

/**
 * Clear link error message
 */
function clearLinkError(linkError) {
  if (linkError) {
    linkError.textContent = '';
    linkError.style.display = 'none';
  }
}

/**
 * Global error handler
 */
function handleGlobalError(error) {
  console.error('An error occurred:', error);
  
  const errorMessage = 'An error occurred. Please refresh the page.';
  
  const errorContainer = document.getElementById('global-error');
  if (errorContainer) {
    errorContainer.textContent = errorMessage;
    errorContainer.style.display = 'block';
  } else {
    alert(errorMessage);
  }
}

// Set up global error handlers
window.addEventListener('error', (event) => {
  handleGlobalError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  handleGlobalError(event.reason);
});

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
