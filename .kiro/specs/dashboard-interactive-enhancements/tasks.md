# Implementation Plan: Dashboard Interactive Enhancements

## Overview

This implementation plan breaks down the five interactive enhancements for the productivity dashboard into discrete, actionable coding tasks. The dashboard uses vanilla HTML, CSS, and JavaScript (ES6+) with Local Storage for persistence. Each task builds incrementally, with property-based tests for core logic functions and unit tests for component behavior.

## Tasks

- [x] 1. Set up project structure and Storage Manager
  - Create directory structure (css/, js/)
  - Create index.html with basic structure
  - Implement StorageManager class with get/set/remove methods
  - Add error handling for unavailable storage and quota exceeded
  - _Requirements: 6.1, 6.6, 6.7, 6.8_

- [x] 1.1 Write unit tests for Storage Manager
  - Test get/set/remove operations
  - Test error handling for unavailable storage
  - Test quota exceeded handling
  - Test JSON serialization/deserialization
  - _Requirements: 6.1, 6.6, 6.7, 6.8_

- [x] 2. Implement Theme Manager component
  - [x] 2.1 Create ThemeManager class with init/toggle/applyTheme methods
    - Implement theme state management
    - Add DOM manipulation to apply theme classes
    - Integrate with StorageManager for persistence
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7_
  
  - [x] 2.2 Create HTML structure for theme toggle button
    - Add theme toggle button to index.html
    - Add appropriate ARIA labels for accessibility
    - _Requirements: 1.1, 7.6_
  
  - [x] 2.3 Create CSS for light and dark themes
    - Define CSS variables for light theme (default)
    - Define CSS variables for dark theme
    - Add transition effects for theme switching (300ms)
    - Apply theme classes to body element
    - _Requirements: 1.2, 1.3, 1.4, 7.4, 7.8_
  
  - [x] 2.4 Write unit tests for Theme Manager
    - Test toggle switches between light and dark
    - Test default theme is light
    - Test theme persistence to Local Storage
    - Test theme loading from storage on init
    - _Requirements: 1.2, 1.5, 1.6, 1.7_

- [x] 3. Implement Greeting Component
  - [x] 3.1 Create GreetingComponent class with name management
    - Implement init/updateGreeting/setCustomName methods
    - Add time-based greeting logic (morning/afternoon/evening)
    - Implement name sanitization to prevent XSS
    - Integrate with StorageManager for name persistence
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 3.2 Create HTML structure for greeting section
    - Add greeting text display element
    - Add name input field with placeholder and maxlength
    - _Requirements: 2.1, 7.6_
  
  - [x] 3.3 Write property test for name sanitization
    - **Property 4: Name Sanitization Prevents HTML Injection**
    - **Validates: Requirements 2.7**
    - Generate random strings with HTML tags, script tags, special characters
    - Verify sanitized output doesn't execute scripts or render HTML
  
  - [x] 3.4 Write unit tests for Greeting Component
    - Test generic greeting when no name
    - Test custom name appears in greeting
    - Test whitespace-only names show generic greeting
    - Test name persistence
    - Test time-based greeting variations
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Implement Pomodoro Timer component
  - [x] 4.1 Create PomodoroTimer class with timer logic
    - Implement init/start/pause/reset methods
    - Add setDuration and validateDuration methods
    - Implement timer countdown logic with setInterval
    - Add updateDisplay method for MM:SS formatting
    - Integrate with StorageManager for duration persistence
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  
  - [x] 4.2 Create HTML structure for timer section
    - Add timer display element
    - Add start/pause/reset buttons
    - Add duration input field with min/max attributes
    - Add error message display element
    - _Requirements: 3.1, 7.6_
  
  - [x] 4.3 Add CSS styling for timer controls
    - Style timer display and buttons
    - Add disabled state styling for settings during timer run
    - Add visual feedback for button interactions
    - _Requirements: 7.7, 7.8_
  
  - [x] 4.4 Write property test for duration validation
    - **Property 3: Duration Validation Range**
    - **Validates: Requirements 3.2**
    - Generate random integers (negative, zero, large values)
    - Verify validation accepts 1-120, rejects all others
  
  - [x] 4.5 Write unit tests for Pomodoro Timer
    - Test default duration is 25 minutes
    - Test timer start/pause/reset operations
    - Test settings disabled when timer running
    - Test duration persistence
    - Test display formatting (MM:SS)
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Task Validator component
  - [x] 6.1 Create TaskValidator class with validation logic
    - Implement validate method with duplicate checking
    - Implement isDuplicate method with case-insensitive comparison
    - Implement normalizeText method (trim and lowercase)
    - Return validation result with error messages
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7_
  
  - [x] 6.2 Write property test for duplicate detection with normalization
    - **Property 1: Duplicate Detection with Normalization**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.6**
    - Generate random task lists and task text with varied casing and whitespace
    - Verify duplicate detection works correctly after normalization
  
  - [x] 6.3 Write property test for task list invariant on duplicate rejection
    - **Property 2: Task List Invariant on Duplicate Rejection**
    - **Validates: Requirements 4.5**
    - Generate random task lists and duplicate task text
    - Verify task list remains completely unchanged when duplicate rejected
  
  - [x] 6.4 Write property test for text normalization idempotence
    - **Property 12: Text Normalization is Idempotent**
    - **Validates: Requirements 4.2, 4.3**
    - Generate random task text with varied casing and whitespace
    - Verify normalize(normalize(text)) === normalize(text)
  
  - [x] 6.5 Write unit tests for Task Validator
    - Test empty input rejection
    - Test duplicate detection examples
    - Test deleted tasks can be re-added
    - Test case-insensitive comparison
    - Test whitespace trimming
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7_

- [ ] 7. Implement Task Sorter component
  - [x] 7.1 Create TaskSorter class with sorting logic
    - Implement sort method with all sort options
    - Implement date sorting (oldest/newest first)
    - Implement alphabetical sorting (A-Z, Z-A)
    - Implement status sorting (incomplete/complete first) with stable secondary sort
    - Integrate with StorageManager for sort preference persistence
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9, 5.11, 5.12_
  
  - [x] 7.2 Write property test for sort by date oldest
    - **Property 5: Sort by Date Oldest Produces Ascending Order**
    - **Validates: Requirements 5.2**
    - Generate random task lists with varied timestamps
    - Verify sorted list is in ascending timestamp order
  
  - [x] 7.3 Write property test for sort by date newest
    - **Property 6: Sort by Date Newest Produces Descending Order**
    - **Validates: Requirements 5.3**
    - Generate random task lists with varied timestamps
    - Verify sorted list is in descending timestamp order
  
  - [x] 7.4 Write property test for sort alphabetically A-Z
    - **Property 7: Sort Alphabetically A-Z Produces Ascending Order**
    - **Validates: Requirements 5.4**
    - Generate random task lists with varied text
    - Verify sorted list is in ascending lexicographic order (case-insensitive)
  
  - [x] 7.5 Write property test for sort alphabetically Z-A
    - **Property 8: Sort Alphabetically Z-A Produces Descending Order**
    - **Validates: Requirements 5.5**
    - Generate random task lists with varied text
    - Verify sorted list is in descending lexicographic order (case-insensitive)
  
  - [x] 7.6 Write property test for sort by status incomplete first
    - **Property 9: Sort by Status Incomplete First Groups Correctly**
    - **Validates: Requirements 5.6**
    - Generate random task lists with mixed completion status
    - Verify all incomplete tasks appear before completed tasks
  
  - [x] 7.7 Write property test for sort by status complete first
    - **Property 10: Sort by Status Complete First Groups Correctly**
    - **Validates: Requirements 5.7**
    - Generate random task lists with mixed completion status
    - Verify all completed tasks appear before incomplete tasks
  
  - [x] 7.8 Write property test for stable sort maintains relative order
    - **Property 11: Stable Sort Maintains Relative Order**
    - **Validates: Requirements 5.12**
    - Generate random task lists with multiple tasks of same status
    - Verify relative order by date is maintained within status groups
  
  - [x] 7.9 Write unit tests for Task Sorter
    - Test each sort option with example task lists
    - Test sort preference persistence
    - Test default sort order (newest first)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9, 5.10, 5.11_

- [ ] 8. Implement Task Manager component
  - [x] 8.1 Create TaskManager class with task operations
    - Implement init/addTask/toggleTask/deleteTask methods
    - Integrate TaskValidator for duplicate checking
    - Integrate TaskSorter for task ordering
    - Implement getTasks and applySorting methods
    - Integrate with StorageManager for task persistence
    - _Requirements: 4.1, 4.4, 4.5, 5.8, 5.10_
  
  - [x] 8.2 Implement task rendering logic
    - Create render method to update DOM with task list
    - Generate task list items with checkboxes and delete buttons
    - Add event listeners for toggle and delete actions
    - Apply current sort order when rendering
    - _Requirements: 5.8, 7.2_
  
  - [x] 8.3 Create HTML structure for task section
    - Add task input field with placeholder
    - Add task add button
    - Add error message display element
    - Add sort dropdown with all sort options
    - Add task list container (ul element)
    - _Requirements: 5.1, 7.6_
  
  - [x] 8.4 Add CSS styling for task section
    - Style task input and add button
    - Style sort dropdown
    - Style task list items with checkboxes
    - Add hover and focus states
    - Add completed task styling (strikethrough)
    - _Requirements: 7.3, 7.7, 7.8_
  
  - [x] 8.5 Write unit tests for Task Manager
    - Test add/toggle/delete operations
    - Test task persistence to Local Storage
    - Test rendering updates DOM correctly
    - Test integration with validator and sorter
    - _Requirements: 4.1, 4.4, 4.5, 5.8_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Wire all components together in main app
  - [x] 10.1 Create main app initialization function
    - Instantiate all components (StorageManager, ThemeManager, GreetingComponent, PomodoroTimer, TaskManager)
    - Call init methods for all components
    - Set up global error handling
    - Add DOMContentLoaded event listener
    - _Requirements: 8.5, 8.6_
  
  - [x] 10.2 Attach event listeners for all UI controls
    - Theme toggle button click handler
    - Name input change handler (with debouncing)
    - Timer control button handlers (start/pause/reset)
    - Timer duration input change handler
    - Task add button and Enter key handlers
    - Task toggle and delete handlers (delegated)
    - Sort dropdown change handler
    - _Requirements: 7.2, 7.7_
  
  - [x] 10.3 Add input validation and error display
    - Validate timer duration input (1-120 range)
    - Validate task input (empty check, duplicate check)
    - Display inline error messages for invalid inputs
    - Clear error messages on successful actions
    - _Requirements: 3.8, 4.4, 8.6_
  
  - [x] 10.4 Implement performance optimizations
    - Debounce name input to reduce storage writes
    - Batch DOM updates when rendering task list
    - Use CSS transitions for theme switching
    - _Requirements: 7.1, 7.2_

- [ ] 11. Add final CSS polish and responsive design
  - [x] 11.1 Complete CSS styling for all components
    - Ensure consistent spacing and typography
    - Add visual feedback for all interactive elements
    - Style error messages consistently
    - Add focus indicators for keyboard navigation
    - _Requirements: 7.3, 7.7, 7.8_
  
  - [x] 11.2 Test and refine theme styling
    - Verify light theme colors and contrast
    - Verify dark theme colors and contrast
    - Ensure smooth theme transition (300ms)
    - Test all components in both themes
    - _Requirements: 1.2, 1.3, 1.4, 7.8_

- [x] 12. Write integration tests for complete workflows
  - Test add task → sort → toggle completion → verify persistence
  - Test change theme → reload page → verify theme persisted
  - Test set custom name → reload page → verify name persisted
  - Test set timer duration → start timer → verify duration used
  - Test storage unavailable fallback
  - Test quota exceeded handling
  - _Requirements: 6.1, 6.6, 6.7, 6.8_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties using fast-check library (minimum 100 iterations)
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end workflows and component interactions
- Checkpoints ensure incremental validation throughout implementation
- All code uses vanilla JavaScript (ES6+) with no external dependencies except testing frameworks
- Manual testing for browser compatibility, visual design, and performance should be performed after implementation

## Testing Framework Setup

Before implementing test tasks, set up the testing environment:
- Install fast-check for property-based testing
- Install Jest or Vitest for unit and integration testing
- Configure test runner and coverage reporting
- Create test file structure matching source files

## Property-Based Test Configuration

All property tests should use:
- Minimum 100 iterations per test
- Appropriate generators for input types (strings, numbers, arrays, objects)
- Clear test tags: `Feature: dashboard-interactive-enhancements, Property N: [Property Title]`
- Shrinking enabled to find minimal failing examples
