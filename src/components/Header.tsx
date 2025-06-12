// Syntari AI IDE - Interactive Header Component (Professional IDE Theme)
// Context-aware header with integrated window controls and enhanced search

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { AppViewModel, AiProvider } from '../types';

interface HeaderProps {
  viewModel: AppViewModel;
  aiProviders?: AiProvider[];
  onSettings: () => void;
  onTogglePerformanceMode: () => void;
  onOpenProject?: () => void;
  onNewFile?: () => void;
  onSaveFile?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFind?: () => void;
  onCommandPalette?: () => void;
  onHelp?: () => void;
}

interface DropdownMenu {
  id: string;
  label: string;
  items: Array<{
    label: string;
    action: () => void;
    shortcut?: string;
    separator?: boolean;
    disabled?: boolean;
    icon?: string;
  }>;
}

interface SearchResult {
  type: 'file' | 'command' | 'setting';
  title: string;
  description?: string;
  action: () => void;
  icon?: string;
}

export const Header: React.FC<HeaderProps> = ({
  viewModel,
  aiProviders = [],
  onSettings,
  onTogglePerformanceMode,
  onOpenProject = () => {},
  onNewFile = () => {},
  onSaveFile = () => {},
  onUndo = () => {},
  onRedo = () => {},
  onFind = () => {},
  onCommandPalette = () => {},
  onHelp = () => {},
}) => {
  // State for interactive features
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Refs for dropdown positioning and outside click detection
  const headerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const menuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const searchTimeoutRef = useRef<number | null>(null);
  const [dropdownPositions, setDropdownPositions] = useState<{ [key: string]: { x: number; y: number } }>({});
  // Calculate AI status
  const availableProviders = aiProviders.filter(p => p.isAvailable).length;
  const totalProviders = aiProviders.length;
  const aiStatus = totalProviders > 0 ? `${availableProviders}/${totalProviders}` : '0/0';

  // Context awareness
  const hasProject = !!viewModel.project;
  const hasActiveFile = viewModel.currentView === 'editor' && hasProject;
  const canUndo = hasActiveFile; // In real app, check undo stack
  const canRedo = hasActiveFile; // In real app, check redo stack
  // const hasUnsavedChanges = hasActiveFile; // In real app, check file state

  // Window controls
  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      const appWindow = getCurrentWindow();
      const maximized = await appWindow.isMaximized();
      if (maximized) {
        await appWindow.unmaximize();
        setIsMaximized(false);
      } else {
        await appWindow.maximize();
        setIsMaximized(true);
      }
    } catch (error) {
      console.error('Failed to toggle maximize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  // Define context-aware dropdown menus
  const dropdownMenus: DropdownMenu[] = [
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'New File', action: onNewFile, shortcut: 'Ctrl+N', icon: '📄' },
        { label: 'Open Project...', action: onOpenProject, shortcut: 'Ctrl+O', icon: '📁' },
        { separator: true, label: '', action: () => {} },
        { label: 'Save', action: onSaveFile, shortcut: 'Ctrl+S', icon: '💾', disabled: !hasActiveFile },
        { label: 'Save All', action: () => console.log('Save All'), shortcut: 'Ctrl+K S', icon: '💾', disabled: !hasProject },
        { label: 'Auto Save', action: () => console.log('Toggle Auto Save'), icon: '🔄', disabled: !hasProject },
        { separator: true, label: '', action: () => {} },
        { label: 'Close File', action: () => console.log('Close File'), shortcut: 'Ctrl+W', icon: '✖️', disabled: !hasActiveFile },
        { label: 'Close Project', action: () => console.log('Close Project'), icon: '📁✖️', disabled: !hasProject },
        { separator: true, label: '', action: () => {} },
        { label: 'Exit', action: handleClose, shortcut: 'Ctrl+Q', icon: '🚪' },
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { label: 'Undo', action: onUndo, shortcut: 'Ctrl+Z', icon: '↶', disabled: !canUndo },
        { label: 'Redo', action: onRedo, shortcut: 'Ctrl+Y', icon: '↷', disabled: !canRedo },
        { separator: true, label: '', action: () => {} },
        { label: 'Cut', action: () => navigator.clipboard.writeText(''), shortcut: 'Ctrl+X', icon: '✂️', disabled: !hasActiveFile },
        { label: 'Copy', action: () => navigator.clipboard.writeText(''), shortcut: 'Ctrl+C', icon: '📋', disabled: !hasActiveFile },
        { label: 'Paste', action: () => console.log('Paste'), shortcut: 'Ctrl+V', icon: '📌', disabled: !hasActiveFile },
        { separator: true, label: '', action: () => {} },
        { label: 'Find', action: onFind, shortcut: 'Ctrl+F', icon: '🔍', disabled: !hasActiveFile },
        { label: 'Find and Replace', action: () => console.log('Find Replace'), shortcut: 'Ctrl+H', icon: '🔄', disabled: !hasActiveFile },
        { label: 'Go to Line', action: () => console.log('Go to Line'), shortcut: 'Ctrl+G', icon: '🎯', disabled: !hasActiveFile },
      ]
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Command Palette', action: onCommandPalette, shortcut: 'Ctrl+Shift+P', icon: '⚡' },
        { separator: true, label: '', action: () => {} },
        { label: 'File Explorer', action: () => console.log('Toggle Explorer'), shortcut: 'Ctrl+Shift+E', icon: '📂', disabled: !hasProject },
        { label: 'Search Panel', action: () => console.log('Toggle Search'), shortcut: 'Ctrl+Shift+F', icon: '🔍', disabled: !hasProject },
        { label: 'AI Assistant', action: () => console.log('Toggle AI'), shortcut: 'Ctrl+K', icon: '🤖' },
        { separator: true, label: '', action: () => {} },
        { label: 'Terminal', action: () => console.log('Toggle Terminal'), shortcut: 'Ctrl+`', icon: '💻' },
        { label: 'Problems', action: () => console.log('Toggle Problems'), shortcut: 'Ctrl+Shift+M', icon: '⚠️', disabled: !hasProject },
        { label: 'Output', action: () => console.log('Toggle Output'), shortcut: 'Ctrl+Shift+U', icon: '📄', disabled: !hasProject },
        { separator: true, label: '', action: () => {} },
        { label: 'Zoom In', action: () => console.log('Zoom In'), shortcut: 'Ctrl+=', icon: '🔍+' },
        { label: 'Zoom Out', action: () => console.log('Zoom Out'), shortcut: 'Ctrl+-', icon: '🔍-' },
        { label: 'Reset Zoom', action: () => console.log('Reset Zoom'), shortcut: 'Ctrl+0', icon: '🔍' },
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      items: [
        { label: 'AI Code Review', action: () => console.log('AI Code Review'), shortcut: 'Ctrl+Shift+R', icon: '🤖', disabled: !hasActiveFile },
        { label: 'Smart Refactor', action: () => console.log('Smart Refactor'), shortcut: 'Ctrl+Shift+T', icon: '🔧', disabled: !hasActiveFile },
        { label: 'Generate Tests', action: () => console.log('Generate Tests'), shortcut: 'Ctrl+Shift+G', icon: '🧪', disabled: !hasActiveFile },
        { label: 'Optimize Code', action: () => console.log('Optimize Code'), shortcut: 'Ctrl+Shift+O', icon: '⚡', disabled: !hasActiveFile },
        { separator: true, label: '', action: () => {} },
        { label: 'Model Consensus', action: () => console.log('Model Consensus'), shortcut: 'Ctrl+Shift+C', icon: '👥', disabled: !hasActiveFile },
        { label: 'Cost Analytics', action: () => console.log('Cost Analytics'), icon: '💰' },
        { label: 'Performance Monitor', action: () => console.log('Performance Monitor'), icon: '📊' },
        { separator: true, label: '', action: () => {} },
        { label: 'Preferences', action: onSettings, shortcut: 'Ctrl+,', icon: '⚙️' },
      ]
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { label: 'Getting Started', action: onHelp, shortcut: 'F1', icon: '📚' },
        { label: 'Keyboard Shortcuts', action: () => console.log('Shortcuts'), shortcut: 'Ctrl+K Ctrl+S', icon: '⌨️' },
        { label: 'Documentation', action: () => console.log('Docs'), icon: '📖' },
        { separator: true, label: '', action: () => {} },
        { label: 'AI Models Status', action: () => console.log('AI Status'), icon: '🤖' },
        { label: 'Performance Metrics', action: () => console.log('Performance'), icon: '📊' },
        { label: 'System Info', action: () => console.log('System Info'), icon: 'ℹ️' },
        { separator: true, label: '', action: () => {} },
        { label: 'Report Issue', action: () => console.log('Report Issue'), icon: '🐛' },
        { label: 'About Syntari', action: () => console.log('About'), icon: 'ℹ️' },
      ]
    }
  ];

  // Simplified search functionality for testing
  const handleSearch = useCallback(async (query: string) => {
    // Only log searches with actual content to reduce spam
    if (query.trim()) {
      // console.log('🔍 Search called with:', query);
    }
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Simple test results
    const testResults: SearchResult[] = [
      { type: 'command', title: 'Test Command', description: 'A test command', action: () => console.log('Test!'), icon: '🧪' }
    ];

    // Reduce logging frequency
    // console.log('🔍 Setting test results:', testResults);
    setSearchResults(testResults);
  }, []);

  // Handle search input changes (now handled directly in onChange)
  // const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = e.target.value;
  //   console.log('🔍 Search input changed:', value);
  //   setSearchValue(value);
  // }, []);

  // Simplified debounced search effect (longer delay to reduce event load)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = window.setTimeout(() => {
      // Only log when actually searching to reduce spam
      // console.log('🔍 Debounce timeout fired, calling handleSearch');
      handleSearch(searchValue);
    }, 500); // Increased delay to reduce IBUS event load
    
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue, handleSearch]);

  // Handle dropdown toggle
  const toggleDropdown = useCallback((menuId: string) => {
    if (activeDropdown === menuId) {
      setActiveDropdown(null);
      setDropdownPositions({});
    } else {
      // Calculate position for the dropdown
      const buttonElement = menuButtonRefs.current[menuId];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        setDropdownPositions({
          [menuId]: {
            x: rect.left,
            y: rect.bottom + 2 // Small gap below button
          }
        });
      }
      setActiveDropdown(menuId);
    }
    setIsSearchFocused(false);
    setSearchResults([]);
  }, [activeDropdown]);

  // Check initial maximize state
  useEffect(() => {
    const checkMaximizeState = async () => {
      try {
        const appWindow = getCurrentWindow();
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to check maximize state:', error);
      }
    };
    
    checkMaximizeState();
  }, []);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside header and dropdowns
      const isOutsideHeader = headerRef.current && !headerRef.current.contains(target);
      const isOutsideDropdowns = Object.values(dropdownRefs.current).every(
        dropdown => !dropdown || !dropdown.contains(target)
      );
      
      if (isOutsideHeader && isOutsideDropdowns) {
        setActiveDropdown(null);
        setDropdownPositions({});
        setIsSearchFocused(false);
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcuts for dropdowns
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
        switch (event.key) {
          case 'f':
          case 'F':
            event.preventDefault();
            toggleDropdown('file');
            break;
          case 'e':
          case 'E':
            event.preventDefault();
            toggleDropdown('edit');
            break;
          case 'v':
          case 'V':
            event.preventDefault();
            toggleDropdown('view');
            break;
          case 't':
          case 'T':
            event.preventDefault();
            toggleDropdown('tools');
            break;
          case 'h':
          case 'H':
            event.preventDefault();
            toggleDropdown('help');
            break;
        }
      }
      
      if (event.key === 'Escape') {
        setActiveDropdown(null);
        setDropdownPositions({});
        setIsSearchFocused(false);
        setSearchResults([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleDropdown]);

  // Render dropdown menu using portal
  const renderDropdown = (menu: DropdownMenu) => {
    if (activeDropdown !== menu.id || !dropdownPositions[menu.id]) return null;

    const position = dropdownPositions[menu.id];

    const dropdownContent = (
      <div
        ref={el => dropdownRefs.current[menu.id] = el}
        className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-2xl min-w-64 py-2"
        style={{ 
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 99999,
          backgroundColor: 'rgba(55, 65, 81, 0.98)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        {menu.items.map((item, index) => (
          item.separator ? (
            <div key={`separator-${index}`} className="h-px bg-gray-600/50 my-1 mx-2" />
          ) : (
            <button
              key={item.label}
              onClick={() => {
                if (!item.disabled) {
                  item.action();
                  setActiveDropdown(null);
                  setDropdownPositions({});
                }
              }}
              disabled={item.disabled}
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-700/50 transition-colors ${
                item.disabled 
                  ? 'text-gray-500 cursor-not-allowed opacity-50' 
                  : 'text-gray-200 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                {item.icon && (
                  <span className="text-sm w-4 text-center">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </div>
              {item.shortcut && (
                <span className="text-xs text-gray-400 ml-4 font-mono">
                  {item.shortcut}
                </span>
              )}
            </button>
          )
        ))}
      </div>
    );

    return createPortal(dropdownContent, document.body);
  };

  // Simplified search results renderer
  const renderSearchResults = () => {
    // Remove excessive logging that causes console spam
    // console.log('🔍 Render called - focused:', isSearchFocused, 'results:', searchResults.length, 'value:', searchValue);
    
    if (!isSearchFocused || searchResults.length === 0) {
      if (isSearchFocused && searchValue.trim()) {
        // console.log('🔍 Focused with text but no results - showing "no results" message');
        return (
          <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 w-full py-3">
            <div className="px-4 text-sm text-gray-400">
              No results found for "{searchValue}"
            </div>
          </div>
        );
      }
      // console.log('🔍 Not showing dropdown');
      return null;
    }

    // console.log('🔍 Showing dropdown with results:', searchResults.map(r => r.title));
    return (
      <div 
        className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-[9999] w-full py-2"
        style={{ 
          backgroundColor: 'rgba(55, 65, 81, 0.98)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-700/50">
          Found {searchResults.length} result(s)
        </div>
        {searchResults.map((result, index) => (
          <button
            key={index}
            onClick={() => {
              // console.log('🔍 Clicked result:', result.title);
              result.action();
              setIsSearchFocused(false);
              setSearchValue('');
              setSearchResults([]);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-2">
              {result.icon && <span>{result.icon}</span>}
              <div>
                <div className="text-sm text-gray-200">{result.title}</div>
                {result.description && (
                  <div className="text-xs text-gray-400">{result.description}</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <header 
      ref={headerRef}
      className="border-b border-gray-600/50 px-4 py-2 flex items-center justify-between text-gray-100 h-14 relative z-[9998]" 
      style={{ backgroundColor: '#3F3F3F' }}
      data-tauri-drag-region
    >
      {/* Left Section - Logo and Interactive Menu */}
      <div className="flex items-center space-x-6" data-tauri-drag-region>
        {/* Logo */}
        <div className="flex items-center space-x-3" data-tauri-drag-region>
          <img 
            src="/logo.png" 
            alt="Syntari AI IDE" 
            className="w-8 h-8 rounded-md"
            onError={(e) => {
              // Fallback to text logo if image fails
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const textLogo = document.createElement('div');
                textLogo.className = 'w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center text-white font-bold text-sm';
                textLogo.textContent = 'S';
                parent.appendChild(textLogo);
              }
            }}
          />
        </div>

        {/* Interactive Menu Bar */}
        <nav className="flex items-center space-x-1 text-sm">
          {dropdownMenus.map((menu) => (
            <div key={menu.id} className="relative">
              <button 
                ref={el => menuButtonRefs.current[menu.id] = el}
                onClick={() => toggleDropdown(menu.id)}
                className={`text-gray-200 hover:text-white hover:bg-gray-700/50 transition-colors px-3 py-1.5 rounded ${
                  activeDropdown === menu.id ? 'bg-gray-700/70 text-white' : ''
                }`}
              >
                {menu.label}
              </button>
            </div>
          ))}
        </nav>
        
        {/* Render all dropdowns */}
        {dropdownMenus.map(menu => renderDropdown(menu))}
      </div>

      {/* Center Section - Search Bar */}
      <div className="flex-1 flex justify-center px-4">
        {/* Draggable area left of search */}
        <div className="flex-1" data-tauri-drag-region></div>
        
        {/* Non-draggable search container - VSCode inspired approach */}
        <div 
          className="relative max-w-md w-full" 
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          <input
            ref={searchRef}
            type="text"
            value={searchValue}
            onChange={(e) => {
              // Reduce input event logging to prevent console spam
              // console.log('🔍 onChange fired:', e.target.value);
              setSearchValue(e.target.value);
            }}
            onKeyDown={(e) => {
              // console.log('🔍 onKeyDown fired:', e.key, e.code);
              // Handle common keys directly to ensure they work
              if (e.key === 'Backspace' && searchValue.length > 0) {
                e.preventDefault();
                setSearchValue(searchValue.slice(0, -1));
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setSearchValue('');
                setIsSearchFocused(false);
              }
            }}
            onInput={(e) => {
              // console.log('🔍 onInput fired:', (e.target as HTMLInputElement).value);
              const target = e.target as HTMLInputElement;
              setSearchValue(target.value);
            }}
            onFocus={(e) => {
              // console.log('🔍 onFocus fired');
              e.stopPropagation();
              setIsSearchFocused(true);
              setActiveDropdown(null);
            }}
            onBlur={(e) => {
              // console.log('🔍 onBlur fired');
              e.stopPropagation();
              setTimeout(() => setIsSearchFocused(false), 200);
            }}
            onMouseDown={(e) => {
              // console.log('🔍 onMouseDown fired');
              e.stopPropagation();
              e.currentTarget.focus();
            }}
            onClick={(e) => {
              // console.log('🔍 onClick fired');
              e.stopPropagation();
              e.currentTarget.focus();
            }}
            placeholder="Search commands, files..."
            className="bg-gray-700/50 border border-gray-500/40 rounded-md pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-white placeholder-gray-400"
            autoComplete="off"
            spellCheck="false"
            autoCorrect="off"
            autoCapitalize="off"
            tabIndex={0}
            inputMode="text"
          />
          {searchValue && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSearchValue('');
                setSearchResults([]);
                searchRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
          {renderSearchResults()}
        </div>
        
        {/* Draggable area right of search */}
        <div className="flex-1" data-tauri-drag-region></div>
      </div>

      {/* Right Section - Status and Window Controls */}
      <div className="flex items-center space-x-4">
        {/* Status Indicators */}
        <div className="flex items-center space-x-3">
          {/* Performance Mode Toggle */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-600/40 border border-gray-500/30 rounded-md">
            <span className="text-xs text-gray-200">Performance</span>
            <button
              onClick={onTogglePerformanceMode}
              className={`relative inline-flex h-4 w-8 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200 ${
                viewModel.performanceMode 
                  ? 'bg-orange-500' 
                  : 'bg-gray-600'
              }`}
              title={`Performance mode is ${viewModel.performanceMode ? 'ON' : 'OFF'}`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${
                  viewModel.performanceMode 
                    ? 'translate-x-4' 
                    : 'translate-x-0.5'
                }`}
              />
            </button>
            {viewModel.performanceMode && (
              <span className="text-xs text-orange-400 font-medium">ON</span>
            )}
          </div>

          {/* AI Status */}
          <div 
            className="flex items-center space-x-2 px-3 py-1.5 bg-gray-600/40 border border-gray-500/30 rounded-md cursor-pointer hover:bg-gray-600/60 transition-colors"
            onClick={() => console.log('Show AI status details')}
            title="Click for detailed AI model status"
          >
            <div className={`w-2 h-2 rounded-full ${
              availableProviders > 0 ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className="text-xs text-gray-200">
              AI: {aiStatus}
            </span>
            {availableProviders > 0 && (
              <span className="text-xs text-green-400 font-medium">
                97% savings
              </span>
            )}
            <span className="text-xs text-gray-400">▼</span>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center space-x-1">
          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700/50 transition-colors rounded"
            title="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          {/* Maximize/Restore */}
          <button
            onClick={handleMaximize}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700/50 transition-colors rounded"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <rect x="7" y="7" width="10" height="10" rx="1" ry="1"></rect>
                <rect x="3" y="3" width="10" height="10" rx="1" ry="1"></rect>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
            )}
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors rounded"
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 hover:text-white">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};