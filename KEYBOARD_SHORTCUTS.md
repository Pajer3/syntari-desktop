# 🎹 Syntari AI IDE - Keyboard Shortcuts

*Complete reference for all keyboard shortcuts and key bindings*

---

## 📋 **Tab Management** ✅ *IMPLEMENTED*

### **Navigation**
| Shortcut | Action | Status |
|----------|--------|--------|
| `Ctrl+Tab` | Switch to next tab | ✅ |
| `Ctrl+Shift+Tab` | Switch to previous tab | ✅ |
| `Ctrl+PageDown` | Switch to next tab (alternative) | ✅ |
| `Ctrl+PageUp` | Switch to previous tab (alternative) | ✅ |
| `Ctrl+W` | Close current tab (with unsaved warning) | ✅ |
| `Ctrl+T` | Open new tab | 📋 *Planned* |

### **Context Menu** (Right-click on tab)
- **Close Tab** - Close the selected tab
- **Close Others** - Close all tabs except selected
- **Close Tabs to the Right** - Close all tabs to the right
- **Close All Tabs** - Close all unpinned tabs
- **Pin/Unpin Tab** - Pin important tabs
- **Split Right** - Create horizontal split view
- **Split Down** - Create vertical split view
- **Copy File Path** - Copy full file path to clipboard
- **Reveal in File Explorer** - Open in system file manager

---

## 🔍 **Search & Find** ✅ *IMPLEMENTED*

| Shortcut | Action | Status | Features |
|----------|--------|--------|----------|
| `Ctrl+Shift+F` | Project-wide search | ✅ | 800ms debounce, 1-char min, lazy loading |
| `Ctrl+F` | Find in current file | 📋 *Planned* | Monaco editor integration |
| `Ctrl+Shift+H` | Project-wide replace | 📋 *Planned* | Preview before replace |

### **Search Performance Features**
- ✅ **800ms debounce** - Smooth typing without blocking
- ✅ **1-character minimum** - Responsive search start
- ✅ **Streaming backend** - Chunked file processing  
- ✅ **Lazy loading** - Show first 5 results, "Show More" button
- ✅ **Smart cancellation** - Cancel previous searches automatically

---

## 🗺️ **Navigation & Go-To** 📋 *NEXT PRIORITY*

| Shortcut | Action | Status |
|----------|--------|--------|
| `Ctrl+G` | Go to line dialog | 📋 *Next* |
| `Ctrl+P` | Quick file open (fuzzy search) | 📋 *Next* |
| `Ctrl+]` | Jump to matching bracket | 📋 *Planned* |
| `Ctrl+Shift+K` | Toggle bookmark | 📋 *Planned* |
| `F2` | Next bookmark | 📋 *Planned* |
| `Shift+F2` | Previous bookmark | 📋 *Planned* |

---

## 📁 **File Operations**

| Shortcut | Action | Status |
|----------|--------|--------|
| `Ctrl+S` | Save current file | ✅ |
| `Ctrl+Shift+S` | Save as... | 📋 *Planned* |
| `Ctrl+N` | New file | 📋 *Planned* |
| `Ctrl+O` | Open file dialog | 📋 *Planned* |

---

## ✏️ **Code Editing** 📋 *PLANNED*

### **Multi-Cursor**
| Shortcut | Action | Status |
|----------|--------|--------|
| `Ctrl+Shift+L` | Select all occurrences | 📋 *Planned* |
| `Ctrl+Alt+Up` | Add cursor above | 📋 *Planned* |
| `Ctrl+Alt+Down` | Add cursor below | 📋 *Planned* |

### **Line Operations**
| Shortcut | Action | Status |
|----------|--------|--------|
| `Alt+Up` | Move line up | 📋 *Planned* |
| `Alt+Down` | Move line down | 📋 *Planned* |
| `Shift+Alt+Up` | Copy line up | 📋 *Planned* |
| `Shift+Alt+Down` | Copy line down | 📋 *Planned* |
| `Ctrl+Shift+K` | Delete line | 📋 *Planned* |
| `Ctrl+J` | Join lines | 📋 *Planned* |

---

## 🤖 **AI Features**

| Shortcut | Action | Status |
|----------|--------|--------|
| `Ctrl+K` | Ask AI about current file | ✅ |
| `Alt+A` | Switch to AI Assistant tab | 📋 *Planned* |

---

## 🖥️ **View Management**

| Shortcut | Action | Status |
|----------|--------|--------|
| `Ctrl+B` | Toggle file explorer sidebar | 📋 *Planned* |
| `Ctrl+Shift+F` | Toggle search panel | ✅ |
| `Ctrl+\` | Split editor right | 📋 *Planned* |
| `Ctrl+Shift+\` | Split editor down | 📋 *Planned* |

---

## 💬 **Dialog Controls**

### **Unsaved Changes Dialog** ✅ *IMPLEMENTED*
| Shortcut | Action |
|----------|--------|
| `Enter` | Save file and close |
| `Ctrl+S` | Save file and close (alternative) |
| `Escape` | Cancel close operation |

---

## 🎯 **Implementation Status**

### ✅ **Completed Features**
- **Enhanced Tab Management** - Full VS Code-style navigation
- **Project Search** - Optimized with streaming and lazy loading  
- **File Save Operations** - With unsaved changes protection
- **AI Integration** - Basic ask AI functionality
- **Unsaved Changes Warnings** - Professional dialog system

### 📋 **Next Priority (P0)**
- **Navigation & Go-To** - Go to line, quick file open, bookmarks
- **Find in File** - Monaco editor integration
- **Quick Open Dialog** - Fuzzy file search

### 🚀 **Future Enhancements (P1-P2)**
- **Advanced Code Editing** - Multi-cursor, line operations
- **Split View Management** - Side-by-side editing
- **File Management** - New/open/save as operations
- **View Controls** - Panel toggling and layout management

---

## 🔧 **Performance Notes**

### **Search Optimizations**
- **800ms debounce** - Prevents excessive API calls while typing
- **1-character minimum** - Responsive search without overwhelming results
- **Streaming backend** - Processes files in 5-file chunks for smooth UI
- **Lazy loading** - Shows 5 initial results, loads more on demand

### **Tab Management**
- **Efficient rendering** - Virtual tabs for large file counts
- **Drag/drop optimization** - Smooth reordering with visual feedback
- **Context menu caching** - Fast right-click responses

---

## 🎨 **Customization** *(Future)*

This configuration is designed to support:
- **Custom key bindings** - User-defined shortcuts
- **Theme integration** - Visual feedback for shortcuts
- **Accessibility** - Screen reader and keyboard-only navigation
- **Context awareness** - Different shortcuts based on active view

---

## 📚 **Quick Reference Card**

### **Most Used Shortcuts**
```
Ctrl+Tab          Next tab
Ctrl+Shift+F      Project search  
Ctrl+S            Save file
Ctrl+K            Ask AI
Ctrl+W            Close tab
```

### **Power User Shortcuts**
```
Right-click tab   Context menu
Ctrl+G            Go to line (coming soon)
Ctrl+P            Quick open (coming soon)
F2                Next bookmark (coming soon)
```

---

*Last updated: December 19, 2024*  
*Version: 1.0.0 - Enhanced Tab Management Release* 