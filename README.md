# Productivity Dashboard

A simple, clean productivity dashboard with theme switching, custom greetings, Pomodoro timer, and task management.

## Features

### 🎨 Light/Dark Mode Toggle
- Smooth theme transitions (300ms)
- Persistent theme preference
- Accessible theme toggle button

### 👋 Personalized Greeting
- Custom name input with XSS protection
- Time-based greetings (morning/afternoon/evening)
- Debounced storage writes for performance

### ⏱️ Pomodoro Timer
- Customizable duration (1-120 minutes)
- Start, pause, and reset controls
- Settings disabled during timer run
- Persistent duration preference

### ✅ Task Management
- Add, complete, and delete tasks
- Duplicate task prevention (case-insensitive)
- 6 sorting options:
  - Newest first / Oldest first
  - Alphabetically A-Z / Z-A
  - Incomplete first / Complete first
- Persistent task list and sort preference

## File Structure

```
project/
├── css/
│   └── styles.css          # All styles (455 lines)
├── js/
│   └── app.js              # All application code (854 lines)
├── index.html              # Main HTML file
└── README.md               # This file
```

## Code Organization

The `js/app.js` file is organized into clear sections:

1. **Storage Manager** - Local storage with error handling
2. **Theme Manager** - Theme switching and persistence
3. **Greeting Component** - Personalized greetings
4. **Pomodoro Timer** - Focus timer with customization
5. **Task Validator** - Input validation and duplicate checking
6. **Task Sorter** - Multiple sorting algorithms
7. **Task Manager** - Task CRUD operations and rendering
8. **Main Application** - Initialization and event handling

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

## Features

### Data Persistence
- All preferences stored in Local Storage
- Graceful fallback when storage unavailable
- Quota exceeded error handling

### Performance Optimizations
- Debounced input (300ms) for reduced storage writes
- Batched DOM updates using DocumentFragment
- CSS transitions for smooth theme switching

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus indicators for all controls
- WCAG AAA color contrast in both themes

### Security
- XSS protection via input sanitization
- Safe DOM manipulation with textContent
- Input validation on all user inputs

## Usage

Simply open `index.html` in a modern web browser. No build process or dependencies required!

## Testing

The project includes comprehensive test coverage:
- 476 tests across 15 test files
- Unit tests for all components
- Property-based tests for core logic
- Integration tests for complete workflows

Run tests with: `npm test`

## License

MIT License - Feel free to use this code for your own projects!
