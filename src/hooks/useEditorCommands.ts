// Syntari AI IDE - Editor Commands Hook
// Provides comprehensive command definitions for the command palette

import { useMemo, useCallback } from 'react';

export interface EditorCommand {
  id: string;
  title: string;
  description?: string;
  category: string;
  keywords: string[];
  action: () => void | Promise<void>;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
}

export interface EditorCommandCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface UseEditorCommandsProps {
  // File operations
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAs: () => void;
  onCloseFile: () => void;
  
  // Editor operations
  onFind: () => void;
  onFindReplace: () => void;
  onGoToLine: () => void;
  onGoToSymbol: () => void;
  onToggleComments: () => void;
  onFormatDocument: () => void;
  
  // View operations
  onToggleSidebar: () => void;
  onToggleTerminal: () => void;
  onToggleProblems: () => void;
  onToggleOutput: () => void;
  onToggleSearchReplace: () => void;
  onToggleMinimap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  
  // Git operations
  onGitCommit: () => void;
  onGitPush: () => void;
  onGitPull: () => void;
  onGitStatus: () => void;
  onGitBranches: () => void;
  
  // AI operations
  onAskAI: () => void;
  onAICodeCompletion: () => void;
  onAIRefactor: () => void;
  onAIOptimize: () => void;
  onAIDocGenerate: () => void;
  onAITestGenerate: () => void;
  
  // Debug operations
  onStartDebugging: () => void;
  onStopDebugging: () => void;
  onToggleBreakpoint: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  
  // Settings
  onOpenSettings: () => void;
  onOpenKeybindings: () => void;
  onOpenExtensions: () => void;
  onCommandPalette: () => void;
}

export const useEditorCommands = (props: UseEditorCommandsProps) => {
  const {
    // File operations
    onNewFile,
    onOpenFile,
    onSaveFile,
    onSaveAs,
    onCloseFile,
    
    // Editor operations
    onFind,
    onFindReplace,
    onGoToLine,
    onGoToSymbol,
    onToggleComments,
    onFormatDocument,
    
    // View operations
    onToggleSidebar,
    onToggleTerminal,
    onToggleProblems,
    onToggleOutput,
    onToggleSearchReplace,
    onToggleMinimap,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    
    // Git operations
    onGitCommit,
    onGitPush,
    onGitPull,
    onGitStatus,
    onGitBranches,
    
    // AI operations
    onAskAI,
    onAICodeCompletion,
    onAIRefactor,
    onAIOptimize,
    onAIDocGenerate,
    onAITestGenerate,
    
    // Debug operations
    onStartDebugging,
    onStopDebugging,
    onToggleBreakpoint,
    onStepOver,
    onStepInto,
    onStepOut,
    
    // Settings
    onOpenSettings,
    onOpenKeybindings,
    onOpenExtensions,
    onCommandPalette,
  } = props;

  // Command categories
  const categories: EditorCommandCategory[] = useMemo(() => [
    {
      id: 'file',
      name: 'File',
      icon: '📁',
      color: 'text-blue-400'
    },
    {
      id: 'edit',
      name: 'Edit',
      icon: '✏️',
      color: 'text-green-400'
    },
    {
      id: 'search',
      name: 'Search',
      icon: '🔍',
      color: 'text-yellow-400'
    },
    {
      id: 'view',
      name: 'View',
      icon: '👁️',
      color: 'text-purple-400'
    },
    {
      id: 'git',
      name: 'Git',
      icon: '🌿',
      color: 'text-orange-400'
    },
    {
      id: 'ai',
      name: 'AI Assistant',
      icon: '🤖',
      color: 'text-cyan-400'
    },
    {
      id: 'debug',
      name: 'Debug',
      icon: '🐛',
      color: 'text-red-400'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: '⚙️',
      color: 'text-gray-400'
    }
  ], []);

  // All commands
  const commands: EditorCommand[] = useMemo(() => [
    // File Commands
    {
      id: 'file.new',
      title: 'New File',
      description: 'Create a new file',
      category: 'file',
      keywords: ['new', 'create', 'file'],
      action: onNewFile,
      icon: '📄',
      shortcut: 'Ctrl+N'
    },
    {
      id: 'file.open',
      title: 'Open File',
      description: 'Open an existing file',
      category: 'file',
      keywords: ['open', 'file', 'load'],
      action: onOpenFile,
      icon: '📂',
      shortcut: 'Ctrl+O'
    },
    {
      id: 'file.save',
      title: 'Save File',
      description: 'Save the current file',
      category: 'file',
      keywords: ['save', 'write', 'persist'],
      action: onSaveFile,
      icon: '💾',
      shortcut: 'Ctrl+S'
    },
    {
      id: 'file.saveAs',
      title: 'Save As...',
      description: 'Save the current file with a new name',
      category: 'file',
      keywords: ['save', 'as', 'copy', 'rename'],
      action: onSaveAs,
      icon: '💾',
      shortcut: 'Ctrl+Shift+S'
    },
    {
      id: 'file.close',
      title: 'Close File',
      description: 'Close the current file',
      category: 'file',
      keywords: ['close', 'exit', 'dismiss'],
      action: onCloseFile,
      icon: '❌',
      shortcut: 'Ctrl+W'
    },

    // Edit Commands
    {
      id: 'edit.toggleComments',
      title: 'Toggle Comments',
      description: 'Comment or uncomment selected lines',
      category: 'edit',
      keywords: ['comment', 'uncomment', 'toggle'],
      action: onToggleComments,
      icon: '💬',
      shortcut: 'Ctrl+/'
    },
    {
      id: 'edit.formatDocument',
      title: 'Format Document',
      description: 'Format the entire document',
      category: 'edit',
      keywords: ['format', 'prettier', 'beautify', 'indent'],
      action: onFormatDocument,
      icon: '📐',
      shortcut: 'Shift+Alt+F'
    },
    {
      id: 'edit.goToLine',
      title: 'Go to Line',
      description: 'Jump to a specific line number',
      category: 'edit',
      keywords: ['goto', 'line', 'jump', 'navigate'],
      action: onGoToLine,
      icon: '🎯',
      shortcut: 'Ctrl+G'
    },
    {
      id: 'edit.goToSymbol',
      title: 'Go to Symbol',
      description: 'Navigate to a symbol in the file',
      category: 'edit',
      keywords: ['symbol', 'function', 'class', 'variable'],
      action: onGoToSymbol,
      icon: '🔍',
      shortcut: 'Ctrl+Shift+O'
    },

    // Search Commands
    {
      id: 'search.find',
      title: 'Find',
      description: 'Search within the current file',
      category: 'search',
      keywords: ['find', 'search', 'locate'],
      action: onFind,
      icon: '🔍',
      shortcut: 'Ctrl+F'
    },
    {
      id: 'search.findReplace',
      title: 'Find and Replace',
      description: 'Search and replace text in the current file',
      category: 'search',
      keywords: ['find', 'replace', 'substitute'],
      action: onFindReplace,
      icon: '🔄',
      shortcut: 'Ctrl+H'
    },
    {
      id: 'search.findInFiles',
      title: 'Find in Files',
      description: 'Search across all files in the project',
      category: 'search',
      keywords: ['find', 'search', 'global', 'project'],
      action: onToggleSearchReplace,
      icon: '🌐',
      shortcut: 'Ctrl+Shift+F'
    },
    {
      id: 'search.replaceInFiles',
      title: 'Replace in Files',
      description: 'Search and replace across all files',
      category: 'search',
      keywords: ['replace', 'global', 'project', 'all'],
      action: onToggleSearchReplace,
      icon: '🔄',
      shortcut: 'Ctrl+Shift+H'
    },

    // View Commands
    {
      id: 'view.toggleSidebar',
      title: 'Toggle Sidebar',
      description: 'Show or hide the file explorer sidebar',
      category: 'view',
      keywords: ['sidebar', 'explorer', 'toggle', 'hide'],
      action: onToggleSidebar,
      icon: '📋',
      shortcut: 'Ctrl+B'
    },
    {
      id: 'view.toggleTerminal',
      title: 'Toggle Terminal',
      description: 'Show or hide the integrated terminal',
      category: 'view',
      keywords: ['terminal', 'console', 'command', 'shell'],
      action: onToggleTerminal,
      icon: '💻',
      shortcut: 'Ctrl+`'
    },
    {
      id: 'view.toggleProblems',
      title: 'Toggle Problems Panel',
      description: 'Show or hide the problems/errors panel',
      category: 'view',
      keywords: ['problems', 'errors', 'warnings', 'diagnostics'],
      action: onToggleProblems,
      icon: '⚠️',
      shortcut: 'Ctrl+Shift+M'
    },
    {
      id: 'view.toggleOutput',
      title: 'Toggle Output Panel',
      description: 'Show or hide the output panel',
      category: 'view',
      keywords: ['output', 'logs', 'console'],
      action: onToggleOutput,
      icon: '📋',
      shortcut: 'Ctrl+Shift+U'
    },
    {
      id: 'view.toggleMinimap',
      title: 'Toggle Minimap',
      description: 'Show or hide the code minimap',
      category: 'view',
      keywords: ['minimap', 'overview', 'navigation'],
      action: onToggleMinimap,
      icon: '🗺️',
      shortcut: 'Ctrl+Shift+M'
    },
    {
      id: 'view.zoomIn',
      title: 'Zoom In',
      description: 'Increase editor font size',
      category: 'view',
      keywords: ['zoom', 'larger', 'bigger', 'font'],
      action: onZoomIn,
      icon: '🔍',
      shortcut: 'Ctrl+='
    },
    {
      id: 'view.zoomOut',
      title: 'Zoom Out',
      description: 'Decrease editor font size',
      category: 'view',
      keywords: ['zoom', 'smaller', 'font'],
      action: onZoomOut,
      icon: '🔍',
      shortcut: 'Ctrl+-'
    },
    {
      id: 'view.zoomReset',
      title: 'Reset Zoom',
      description: 'Reset editor font size to default',
      category: 'view',
      keywords: ['zoom', 'reset', 'default', 'font'],
      action: onZoomReset,
      icon: '🔄',
      shortcut: 'Ctrl+0'
    },

    // Git Commands
    {
      id: 'git.commit',
      title: 'Git: Commit Changes',
      description: 'Commit staged changes to the repository',
      category: 'git',
      keywords: ['git', 'commit', 'save', 'version'],
      action: onGitCommit,
      icon: '✅',
      shortcut: 'Ctrl+Shift+G'
    },
    {
      id: 'git.push',
      title: 'Git: Push',
      description: 'Push changes to remote repository',
      category: 'git',
      keywords: ['git', 'push', 'upload', 'remote'],
      action: onGitPush,
      icon: '⬆️'
    },
    {
      id: 'git.pull',
      title: 'Git: Pull',
      description: 'Pull changes from remote repository',
      category: 'git',
      keywords: ['git', 'pull', 'download', 'sync'],
      action: onGitPull,
      icon: '⬇️'
    },
    {
      id: 'git.status',
      title: 'Git: Status',
      description: 'Show git repository status',
      category: 'git',
      keywords: ['git', 'status', 'changes', 'diff'],
      action: onGitStatus,
      icon: '📊'
    },
    {
      id: 'git.branches',
      title: 'Git: Branches',
      description: 'Manage git branches',
      category: 'git',
      keywords: ['git', 'branch', 'checkout', 'create'],
      action: onGitBranches,
      icon: '🌿'
    },

    // AI Commands
    {
      id: 'ai.ask',
      title: 'Ask AI Assistant',
      description: 'Open AI chat to ask questions about your code',
      category: 'ai',
      keywords: ['ai', 'chat', 'assistant', 'help', 'question'],
      action: onAskAI,
      icon: '🤖',
      shortcut: 'Ctrl+Shift+A'
    },
    {
      id: 'ai.completion',
      title: 'AI Code Completion',
      description: 'Get AI-powered code suggestions',
      category: 'ai',
      keywords: ['ai', 'complete', 'suggest', 'autocomplete'],
      action: onAICodeCompletion,
      icon: '💡',
      shortcut: 'Ctrl+Space'
    },
    {
      id: 'ai.refactor',
      title: 'AI Refactor',
      description: 'Get AI suggestions for code refactoring',
      category: 'ai',
      keywords: ['ai', 'refactor', 'improve', 'optimize'],
      action: onAIRefactor,
      icon: '🔧'
    },
    {
      id: 'ai.optimize',
      title: 'AI Optimize Code',
      description: 'Get AI suggestions for performance optimization',
      category: 'ai',
      keywords: ['ai', 'optimize', 'performance', 'speed'],
      action: onAIOptimize,
      icon: '⚡'
    },
    {
      id: 'ai.documentation',
      title: 'AI Generate Documentation',
      description: 'Generate documentation for your code',
      category: 'ai',
      keywords: ['ai', 'documentation', 'docs', 'comments'],
      action: onAIDocGenerate,
      icon: '📚'
    },
    {
      id: 'ai.tests',
      title: 'AI Generate Tests',
      description: 'Generate unit tests for your code',
      category: 'ai',
      keywords: ['ai', 'test', 'testing', 'unit', 'spec'],
      action: onAITestGenerate,
      icon: '🧪'
    },

    // Debug Commands
    {
      id: 'debug.start',
      title: 'Start Debugging',
      description: 'Start debugging the current file',
      category: 'debug',
      keywords: ['debug', 'start', 'run', 'breakpoint'],
      action: onStartDebugging,
      icon: '▶️',
      shortcut: 'F5'
    },
    {
      id: 'debug.stop',
      title: 'Stop Debugging',
      description: 'Stop the current debugging session',
      category: 'debug',
      keywords: ['debug', 'stop', 'end', 'terminate'],
      action: onStopDebugging,
      icon: '⏹️',
      shortcut: 'Shift+F5'
    },
    {
      id: 'debug.toggleBreakpoint',
      title: 'Toggle Breakpoint',
      description: 'Add or remove a breakpoint at current line',
      category: 'debug',
      keywords: ['breakpoint', 'debug', 'pause'],
      action: onToggleBreakpoint,
      icon: '🔴',
      shortcut: 'F9'
    },
    {
      id: 'debug.stepOver',
      title: 'Step Over',
      description: 'Execute the next line of code',
      category: 'debug',
      keywords: ['debug', 'step', 'over', 'next'],
      action: onStepOver,
      icon: '⤵️',
      shortcut: 'F10'
    },
    {
      id: 'debug.stepInto',
      title: 'Step Into',
      description: 'Step into function calls',
      category: 'debug',
      keywords: ['debug', 'step', 'into', 'function'],
      action: onStepInto,
      icon: '⬇️',
      shortcut: 'F11'
    },
    {
      id: 'debug.stepOut',
      title: 'Step Out',
      description: 'Step out of current function',
      category: 'debug',
      keywords: ['debug', 'step', 'out', 'return'],
      action: onStepOut,
      icon: '⬆️',
      shortcut: 'Shift+F11'
    },

    // Settings Commands
    {
      id: 'settings.preferences',
      title: 'Open Settings',
      description: 'Open user and workspace settings',
      category: 'settings',
      keywords: ['settings', 'preferences', 'config'],
      action: onOpenSettings,
      icon: '⚙️',
      shortcut: 'Ctrl+,'
    },
    {
      id: 'settings.keybindings',
      title: 'Open Keyboard Shortcuts',
      description: 'View and edit keyboard shortcuts',
      category: 'settings',
      keywords: ['keyboard', 'shortcuts', 'keybindings'],
      action: onOpenKeybindings,
      icon: '⌨️',
      shortcut: 'Ctrl+K Ctrl+S'
    },
    {
      id: 'settings.extensions',
      title: 'Manage Extensions',
      description: 'Install and manage extensions',
      category: 'settings',
      keywords: ['extensions', 'plugins', 'add-ons'],
      action: onOpenExtensions,
      icon: '🧩',
      shortcut: 'Ctrl+Shift+X'
    },
    {
      id: 'settings.commandPalette',
      title: 'Command Palette',
      description: 'Open the command palette',
      category: 'settings',
      keywords: ['command', 'palette', 'quick', 'actions'],
      action: onCommandPalette,
      icon: '🎛️',
      shortcut: 'Ctrl+Shift+P'
    }
  ], [
    // File operations
    onNewFile, onOpenFile, onSaveFile, onSaveAs, onCloseFile,
    // Editor operations
    onFind, onFindReplace, onGoToLine, onGoToSymbol, onToggleComments, onFormatDocument,
    // View operations
    onToggleSidebar, onToggleTerminal, onToggleProblems, onToggleOutput, 
    onToggleSearchReplace, onToggleMinimap, onZoomIn, onZoomOut, onZoomReset,
    // Git operations
    onGitCommit, onGitPush, onGitPull, onGitStatus, onGitBranches,
    // AI operations
    onAskAI, onAICodeCompletion, onAIRefactor, onAIOptimize, onAIDocGenerate, onAITestGenerate,
    // Debug operations
    onStartDebugging, onStopDebugging, onToggleBreakpoint, onStepOver, onStepInto, onStepOut,
    // Settings
    onOpenSettings, onOpenKeybindings, onOpenExtensions, onCommandPalette
  ]);

  // Get commands by category
  const getCommandsByCategory = useCallback((categoryId: string) => {
    return commands.filter(cmd => cmd.category === categoryId);
  }, [commands]);

  // Search commands
  const searchCommands = useCallback((query: string) => {
    if (!query.trim()) return commands;
    
    const searchTerm = query.toLowerCase();
    return commands.filter(cmd => {
      const titleMatch = cmd.title.toLowerCase().includes(searchTerm);
      const descMatch = cmd.description?.toLowerCase().includes(searchTerm);
      const keywordMatch = cmd.keywords.some(keyword => 
        keyword.toLowerCase().includes(searchTerm)
      );
      return titleMatch || descMatch || keywordMatch;
    });
  }, [commands]);

  return {
    commands,
    categories,
    getCommandsByCategory,
    searchCommands
  };
};