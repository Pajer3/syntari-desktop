# QuickOpen Arrow Key Navigation Issues

## 🚨 Current Problem
Arrow keys in QuickOpen dialog are still scrolling the list container instead of selecting individual files one by one.

## ✅ What Works
- ✅ QuickOpen opens with Ctrl+P
- ✅ File search works recursively (finds files like `bin/2to3`)
- ✅ Typing to search works properly
- ✅ Enter key selects files
- ✅ Esc key closes dialog
- ✅ Mouse clicking on files works
- ✅ Session-based file prioritization works

## ❌ What's Broken
- ❌ Arrow Down (↓) scrolls the list instead of selecting next file
- ❌ Arrow Up (↑) scrolls the list instead of selecting previous file
- ❌ No visual indication of which file is "selected" when using keyboard
- ❌ Can't navigate through search results with keyboard only

## 🔍 Root Cause Analysis
The issue appears to be a conflict between:
1. **Browser default scroll behavior** for arrow keys on scrollable containers
2. **React synthetic events** vs native DOM events
3. **Event capture/bubbling** between multiple event handlers
4. **Focus management** between input field and results container

## 📋 Attempted Fixes (Failed)
1. ✅ Added global `document.addEventListener` with `capture=true` 
2. ✅ Added `preventDefault()` and `stopPropagation()`
3. ✅ Added `onKeyDown` handlers to dialog and results containers
4. ✅ Added `tabIndex={-1}` to make containers focusable
5. ✅ Added CSS `scrollBehavior: 'smooth'` 
6. ✅ Separated arrow key logic from other keyboard events
7. ✅ Added debug logging to track event flow

## 🛠️ Potential Solutions to Try

### Option 1: Focus Management Approach
```typescript
// Move focus to the results container when navigating
const resultsContainerRef = useRef<HTMLDivElement>(null);

const handleArrowKey = (direction: 'up' | 'down') => {
  // Remove focus from input, focus results container
  resultsContainerRef.current?.focus();
  // Then handle navigation
  setSelectedIndex(prev => /* navigation logic */);
};
```

### Option 2: Intercept at Document Level Earlier
```typescript
// Use capture phase at document level before React gets events
useEffect(() => {
  const handleKeyCapture = (e: KeyboardEvent) => {
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && isOpen) {
      e.preventDefault();
      e.stopImmediatePropagation();
      // Handle navigation immediately
    }
  };
  
  document.addEventListener('keydown', handleKeyCapture, { 
    capture: true, 
    passive: false 
  });
}, [isOpen]);
```

### Option 3: Disable Browser Scroll Completely
```css
/* In CSS or style prop */
.quickopen-results {
  overflow-y: auto;
  /* Prevent keyboard scrolling entirely */
  overscroll-behavior: none;
  scroll-behavior: auto; /* Disable smooth scroll */
}

.quickopen-results:focus {
  outline: none;
}
```

### Option 4: Use Different Event Pattern
```typescript
// Use keyup instead of keydown
// Use setTimeout to delay navigation after preventing default
// Use ref callbacks to imperatively manage scroll position
```

### Option 5: Pure CSS Solution
```css
.quickopen-results {
  /* Completely disable keyboard scrolling */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: none;
  scroll-snap-type: none;
}

/* Only allow programmatic scrolling */
.quickopen-results[data-allow-scroll="false"] {
  pointer-events: none; /* Temporarily during navigation */
}
```

## 🎯 Expected Behavior
1. User types to search → search results appear
2. User presses ↓ → first result gets highlighted (visual selection)
3. User presses ↓ again → second result gets highlighted, first unhighlighted
4. Selected item scrolls into view smoothly (only when needed)
5. User presses Enter → highlighted file opens
6. Container scrolling only happens via mouse/trackpad, never keyboard

## 🧪 Testing Checklist
When implementing a fix, verify:
- [ ] Arrow Down selects next file (visual highlight)
- [ ] Arrow Up selects previous file (visual highlight) 
- [ ] First/last file navigation boundaries work
- [ ] Selected item scrolls into view when off-screen
- [ ] Container doesn't scroll when arrow keys pressed
- [ ] Enter opens the visually selected file
- [ ] Works with empty search results
- [ ] Works with 1 search result
- [ ] Works with 50+ search results
- [ ] Mouse interaction still works alongside keyboard
- [ ] Focus management doesn't break input typing

## 📝 Notes
- VS Code's QuickOpen works perfectly - study their implementation
- The issue might be specific to Tauri/React interaction
- Consider using a proven library like `react-hotkeys` or `use-hotkeys`
- The problem persists despite multiple attempts at event prevention

## 🚀 Priority
**P1 - High Priority** 
This is a core IDE feature that users expect to work like VS Code. Navigation should be keyboard-first for developer productivity.

---
*Created: 2024-12-19*
*Status: UNRESOLVED - needs alternative approach* 