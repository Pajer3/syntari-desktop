// Syntari AI IDE - Command Palette Component
// VS Code-style command palette with Tauri backend integration

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, Command, ArrowRight, Clock, Sparkles, FileText, Settings, Terminal, GitBranch } from 'lucide-react';
import { commandService } from '../../services';
import type { Command as ServiceCommand, CommandCategory } from '../../services/types';

interface CommandAction extends ServiceCommand {
  isRecent?: boolean;
  searchScore?: number;
  titleMatches?: number[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CommandCategory | null>(null);
  const [commands, setCommands] = useState<ServiceCommand[]>([]);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load commands and recent history
  useEffect(() => {
    if (isOpen) {
      const allCommands = commandService.getAllCommands();
      const recent = commandService.getRecentCommands();
      setCommands(allCommands);
      setRecentCommands(recent);
    }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Fuzzy search implementation
  const fuzzyMatch = useCallback((text: string, query: string): { score: number; matches: number[] } => {
    if (!query) return { score: 1, matches: [] };
    
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const matches: number[] = [];
    
    let textIndex = 0;
    let queryIndex = 0;
    let score = 0;
    let consecutiveMatches = 0;
    
    while (textIndex < text.length && queryIndex < query.length) {
      if (textLower[textIndex] === queryLower[queryIndex]) {
        matches.push(textIndex);
        consecutiveMatches++;
        score += consecutiveMatches * 2; // Bonus for consecutive matches
        queryIndex++;
      } else {
        consecutiveMatches = 0;
      }
      textIndex++;
    }
    
    // Penalty for incomplete matches
    if (queryIndex < query.length) {
      score = 0;
    }
    
    // Bonus for exact matches
    if (textLower.includes(queryLower)) {
      score += 10;
    }
    
    // Bonus for word boundary matches
    if (textLower.startsWith(queryLower)) {
      score += 20;
    }
    
    return { score, matches };
  }, []);

  // Filter and sort commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Use service's search with empty query to get recent commands first
      const searchResults = commandService.searchCommands('');
      const result = searchResults.map(cmd => ({
        ...cmd,
        isRecent: recentCommands.includes(cmd.id)
      }));
      
      return selectedCategory 
        ? result.filter(cmd => cmd.category === selectedCategory)
        : result;
    }

    // Use service's fuzzy search
    const searchResults = commandService.searchCommands(query);
    const result = searchResults.map(command => {
      const titleMatch = fuzzyMatch(command.name, query);
      
      return {
        ...command,
        searchScore: titleMatch.score,
        titleMatches: titleMatch.matches,
        isRecent: recentCommands.includes(command.id)
      };
    });

    return selectedCategory 
      ? result.filter(cmd => cmd.category === selectedCategory)
      : result;
  }, [query, commands, recentCommands, selectedCategory, fuzzyMatch]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats: CommandCategory[] = ['File', 'Edit', 'View', 'Terminal', 'Git', 'AI', 'Debug'];
    return cats;
  }, []);

  // Handle command execution
  const executeCommand = useCallback(async (command: ServiceCommand) => {
    try {
      await commandService.executeCommand(command.id);
      
      // Update recent commands
      const updatedRecent = commandService.getRecentCommands();
      setRecentCommands(updatedRecent);
      
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  }, [onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      
      case 'Tab':
        e.preventDefault();
        setShowCategories(!showCategories);
        break;
      
      default:
        break;
    }
  }, [filteredCommands, selectedIndex, executeCommand, onClose]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Render command with highlighted matches
  const renderCommandTitle = useCallback((command: CommandAction) => {
    if (!command.titleMatches || command.titleMatches.length === 0) {
      return command.name;
    }

    const title = command.name;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    command.titleMatches.forEach((matchIndex, i) => {
      // Add text before match
      if (matchIndex > lastIndex) {
        parts.push(title.slice(lastIndex, matchIndex));
      }
      
      // Add highlighted match
      parts.push(
        <span key={i} className="bg-yellow-400 text-black px-0.5 rounded">
          {title[matchIndex]}
        </span>
      );
      
      lastIndex = matchIndex + 1;
    });

    // Add remaining text
    if (lastIndex < title.length) {
      parts.push(title.slice(lastIndex));
    }

    return <>{parts}</>;
  }, []);

  // Get category icon
  const getCategoryIcon = useCallback((category: CommandCategory) => {
    switch (category) {
      case 'File': return <FileText size={14} />;
      case 'Edit': return <Command size={14} />;
      case 'View': return <Settings size={14} />;
      case 'Terminal': return <Terminal size={14} />;
      case 'Git': return <GitBranch size={14} />;
      case 'AI': return <Sparkles size={14} />;
      case 'Debug': return <Settings size={14} />;
      default: return <Command size={14} />;
    }
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Command Palette Modal */}
      <div className={`
        fixed top-20 left-1/2 transform -translate-x-1/2 z-50
        w-full max-w-2xl mx-4
        bg-gray-800 border border-gray-600 rounded-lg shadow-2xl
        ${className}
      `}>
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-600">
          <Search size={16} className="text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-sm"
          />
          
          {/* Category Filter */}
          <div className="flex items-center space-x-2 ml-4">
            {showCategories && (
              <div className="flex space-x-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedCategory === null 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-2 py-1 text-xs rounded transition-colors flex items-center space-x-1 ${
                      selectedCategory === category 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {getCategoryIcon(category)}
                    <span>{category}</span>
                  </button>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Toggle Categories"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* Command List */}
        <div 
          ref={listRef}
          className="max-h-96 overflow-y-auto"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400">
              <Command size={32} className="mx-auto mb-2 opacity-50" />
              <p>No commands found</p>
              {query && (
                <p className="text-sm mt-1">Try a different search term</p>
              )}
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                className={`
                  flex items-center px-4 py-3 cursor-pointer transition-colors
                  ${index === selectedIndex 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-100 hover:bg-gray-700'
                  }
                `}
                onClick={() => executeCommand(command)}
              >
                {/* Command Icon */}
                <div className="mr-3 text-gray-400">
                  {command.icon ? (
                    <span className="text-sm">{command.icon}</span>
                  ) : (
                    getCategoryIcon(command.category)
                  )}
                </div>

                {/* Command Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {renderCommandTitle(command as CommandAction)}
                    </span>
                    
                    {command.isRecent && (
                      <Clock size={12} className="text-yellow-400" />
                    )}
                  </div>
                  
                  {command.description && (
                    <p className="text-sm text-gray-400 truncate mt-0.5">
                      {command.description}
                    </p>
                  )}
                </div>

                {/* Keyboard Shortcut */}
                {command.keybinding && (
                  <div className="ml-4 text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    {command.keybinding}
                  </div>
                )}

                {/* Category Badge */}
                <div className="ml-2 text-xs text-gray-500">
                  {command.category}
                </div>

                {/* Arrow */}
                <ArrowRight size={14} className="ml-2 text-gray-500" />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-600 text-xs text-gray-400 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>↑↓ Navigate</span>
            <span>↵ Execute</span>
            <span>Tab Categories</span>
            <span>Esc Close</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span>{filteredCommands.length} commands</span>
            {selectedCategory && (
              <span className="bg-gray-700 px-2 py-0.5 rounded">
                {selectedCategory}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}; 