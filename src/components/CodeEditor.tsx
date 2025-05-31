// Syntari AI IDE - Professional Code Editor Component
// Enterprise-grade code editor with Monaco Editor and real file loading

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import type { ProjectContext, FileInfo } from '../types';

// ================================
// TYPES
// ================================

interface CodeEditorProps {
  project: ProjectContext;
  onFileChange?: (file: FileInfo, content: string) => void;
  onRequestAI?: (context: string) => void;
}

interface EditorFile extends FileInfo {
  isOpen: boolean;
  isDirty: boolean;
  content: string;
}

interface TauriResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface FileTreeNode {
  file: FileInfo;
  children: FileTreeNode[];
  isExpanded: boolean;
}

// ================================
// MONACO EDITOR CONFIGURATION
// ================================

const EDITOR_OPTIONS = {
  fontSize: 14,
  fontFamily: "'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
  lineNumbers: 'on' as const,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  readOnly: false,
  cursorStyle: 'line' as const,
  automaticLayout: true,
  wordWrap: 'on' as const,
  theme: 'syntari-dark',
  minimap: {
    enabled: true,
    side: 'right' as const,
    scale: 1,
    showSlider: 'mouseover' as const,
  },
  bracketPairColorization: {
    enabled: true,
  },
  guides: {
    indentation: true,
    bracketPairs: true,
  },
  suggest: {
    enabled: true,
    showKeywords: true,
    showSnippets: true,
    showFunctions: true,
    showConstructors: true,
    showFields: true,
    showVariables: true,
    showClasses: true,
    showStructs: true,
    showInterfaces: true,
    showModules: true,
    showProperties: true,
    showEvents: true,
    showOperators: true,
    showUnits: true,
    showValues: true,
    showConstants: true,
    showEnums: true,
    showEnumMembers: true,
    showReferences: true,
    showFolders: true,
    showTypeParameters: true,
    showIssues: true,
    showUsers: true,
    showColors: true,
  },
  quickSuggestions: {
    other: true,
    comments: true,
    strings: true,
  },
  parameterHints: {
    enabled: true,
  },
  acceptSuggestionOnCommitCharacter: true,
  acceptSuggestionOnEnter: 'on' as const,
  accessibilitySupport: 'auto' as const,
  autoIndent: 'full' as const,
  codeLens: true,
  colorDecorators: true,
  contextmenu: true,
  copyWithSyntaxHighlighting: true,
  dragAndDrop: true,
  find: {
    addExtraSpaceOnTop: false,
    autoFindInSelection: 'never' as const,
    seedSearchStringFromSelection: 'always' as const,
  },
  folding: true,
  foldingStrategy: 'auto' as const,
  fontLigatures: true,
  formatOnPaste: true,
  formatOnType: true,
  glyphMargin: true,
  hideCursorInOverviewRuler: false,
  highlightActiveIndentGuide: true,
  links: true,
  mouseWheelZoom: true,
  multiCursorMergeOverlapping: true,
  multiCursorModifier: 'alt' as const,
  occurrencesHighlight: 'singleFile' as const,
  overviewRulerBorder: true,
  renderControlCharacters: false,
  renderIndentGuides: true,
  renderLineHighlight: 'line' as const,
  renderWhitespace: 'selection' as const,
  revealHorizontalRightPadding: 30,
  scrollbar: {
    vertical: 'visible' as const,
    horizontal: 'visible' as const,
    arrowSize: 11,
    useShadows: true,
    verticalHasArrows: false,
    horizontalHasArrows: false,
    verticalScrollbarSize: 14,
    horizontalScrollbarSize: 14,
    verticalSliderSize: 14,
    horizontalSliderSize: 14,
  },
  selectOnLineNumbers: true,
  selectionClipboard: false,
  selectionHighlight: true,
  showFoldingControls: 'mouseover' as const,
  smoothScrolling: true,
  snippetSuggestions: 'top' as const,
  stickyTabStops: false,
  tabCompletion: 'on' as const,
  useTabStops: true,
  wordBasedSuggestions: 'currentDocument' as const,
  wordSeparators: '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?',
  wordWrapBreakAfterCharacters: '\t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻ｧｨｩｪｫｬｭｮｯｰ"〉》」』】〕）］｝｠',
  wordWrapBreakBeforeCharacters: '([{\'\"〈《「『【〔（［｛｟',
  wrappingIndent: 'none' as const,
  wrappingStrategy: 'simple' as const,
};

const getLanguageFromExtension = (extension: string): string => {
  const map: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.rs': 'rust',
    '.py': 'python',
    '.md': 'markdown',
    '.json': 'json',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'ini',
    '.ini': 'ini',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.fish': 'shell',
    '.ps1': 'powershell',
    '.psm1': 'powershell',
    '.psd1': 'powershell',
    '.sql': 'sql',
    '.go': 'go',
    '.java': 'java',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cxx': 'cpp',
    '.cc': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.hxx': 'cpp',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.lua': 'lua',
    '.dart': 'dart',
    '.r': 'r',
    '.jl': 'julia',
    '.scala': 'scala',
    '.clj': 'clojure',
    '.elm': 'elm',
    '.ex': 'elixir',
    '.exs': 'elixir',
    '.erl': 'erlang',
    '.hrl': 'erlang',
    '.fs': 'fsharp',
    '.fsx': 'fsharp',
    '.ml': 'ocaml',
    '.mli': 'ocaml',
    '.hs': 'haskell',
    '.lhs': 'haskell',
    '.nim': 'nim',
    '.nims': 'nim',
    '.cr': 'crystal',
    '.zig': 'zig',
    '.v': 'verilog',
    '.sv': 'systemverilog',
    '.vhd': 'vhdl',
    '.vhdl': 'vhdl',
    '.dockerfile': 'dockerfile',
    '.Dockerfile': 'dockerfile',
    '.tex': 'latex',
    '.cls': 'latex',
    '.sty': 'latex',
    '.bib': 'bibtex',
  };
  return map[extension] || 'plaintext';
};

// ================================
// UTILITY FUNCTIONS
// ================================

const getFileIcon = (extension: string): string => {
  const iconMap: Record<string, string> = {
    '.js': '🟨',
    '.jsx': '⚛️',
    '.ts': '🔷',
    '.tsx': '⚛️',
    '.rs': '🦀',
    '.py': '🐍',
    '.md': '📝',
    '.json': '📋',
    '.html': '🌐',
    '.css': '🎨',
    '.scss': '🎨',
    '.sass': '🎨',
    '.less': '🎨',
    '.xml': '📄',
    '.yaml': '⚙️',
    '.yml': '⚙️',
    '.toml': '⚙️',
    '.ini': '⚙️',
    '.sh': '💻',
    '.bash': '💻',
    '.zsh': '💻',
    '.fish': '💻',
    '.ps1': '💻',
    '.sql': '🗄️',
    '.go': '🐹',
    '.java': '☕',
    '.kt': '🟣',
    '.swift': '🐦',
    '.c': '📘',
    '.cpp': '📘',
    '.h': '📘',
    '.hpp': '📘',
    '.cs': '💜',
    '.php': '🐘',
    '.rb': '💎',
    '.lua': '🌙',
    '.dart': '🎯',
    '.r': '📊',
    '.dockerfile': '🐳',
    '.Dockerfile': '🐳',
  };
  return iconMap[extension] || '📄';
};

// ================================
// FILE EXPLORER COMPONENT
// ================================

const buildFileTree = (files: FileInfo[], rootPath: string): FileTreeNode[] => {
  const tree: FileTreeNode[] = [];
  const nodeMap = new Map<string, FileTreeNode>();
  
  // Normalize root path (remove trailing slash)
  const normalizedRootPath = rootPath.replace(/\/$/, '');
  
  // Sort files so directories come first, then by name
  const sortedFiles = [...files].sort((a, b) => {
    const aIsDir = a.language === 'directory';
    const bIsDir = b.language === 'directory';
    
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Filter out the root path itself to prevent self-nesting
  const filteredFiles = sortedFiles.filter(file => file.path !== normalizedRootPath);
  
  // Create nodes for all files
  for (const file of filteredFiles) {
    const node: FileTreeNode = {
      file,
      children: [],
      isExpanded: false,
    };
    nodeMap.set(file.path, node);
  }
  
  // Build tree structure
  for (const file of filteredFiles) {
    const node = nodeMap.get(file.path)!;
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
    
    // Check if this file is a direct child of the root
    if (parentPath === normalizedRootPath) {
      tree.push(node);
    } else {
      // Find parent and add as child
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      } else {
        // If parent not found and it's not the root, still add to root
        // This handles cases where intermediate directories might be missing
        if (!parentPath.startsWith(normalizedRootPath)) {
          tree.push(node);
        }
      }
    }
  }
  
  return tree;
};

const FileTreeItem: React.FC<{
  node: FileTreeNode;
  depth: number;
  selectedFile?: string;
  onFileSelect: (file: FileInfo) => void;
  onToggleExpand: (path: string) => void;
}> = ({ node, depth, selectedFile, onFileSelect, onToggleExpand }) => {
  const { file } = node;
  const isDirectory = file.language === 'directory';
  const isSelected = selectedFile === file.path;
  const hasChildren = node.children.length > 0;
  
  const handleClick = () => {
    if (isDirectory) {
      onToggleExpand(file.path);
    } else {
      onFileSelect(file);
    }
  };
  
  return (
    <div>
      <div
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg border border-blue-400' 
            : 'hover:bg-gradient-to-r hover:from-gray-800 hover:to-gray-700 text-gray-300 hover:text-white border border-transparent hover:border-gray-600'
        }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={handleClick}
      >
        {isDirectory && (
          <span className="text-xs text-gray-400 w-3 text-center">
            {hasChildren ? (node.isExpanded ? '▼' : '▶') : ''}
          </span>
        )}
        {!isDirectory && <span className="w-3"></span>}
        
        <span className="text-sm">
          {isDirectory ? (node.isExpanded ? '📂' : '📁') : getFileIcon(file.extension)}
        </span>
        
        <span className="text-sm truncate flex-1 font-medium">{file.name}</span>
        
        {!isDirectory && file.size > 0 && (
          <span className="text-xs text-gray-400 flex-shrink-0 bg-gray-700 px-2 py-0.5 rounded">
            {(file.size / 1024).toFixed(1)}KB
          </span>
        )}
      </div>
      
      {/* Render children if directory is expanded */}
      {isDirectory && node.isExpanded && hasChildren && (
        <div className="mt-1">
          {node.children.map((childNode) => (
            <FileTreeItem
              key={childNode.file.path}
              node={childNode}
              depth={depth + 1}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<{
  project: ProjectContext;
  selectedFile?: string;
  onFileSelect: (file: FileInfo) => void;
}> = ({ project, selectedFile, onFileSelect }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([project.rootPath]));
  
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);
  
  // Build file tree from flat file list
  const fileTree = useMemo(() => {
    const tree = buildFileTree(project.openFiles, project.rootPath);
    
    // Set expansion state for nodes
    const updateExpansion = (nodes: FileTreeNode[]) => {
      for (const node of nodes) {
        node.isExpanded = expandedFolders.has(node.file.path);
        updateExpansion(node.children);
      }
    };
    updateExpansion(tree);
    
    return tree;
  }, [project.openFiles, project.rootPath, expandedFolders]);
  
  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700 shadow-lg">
      <div className="p-3 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-700 backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-gray-100 flex items-center">
          <span className="mr-2 text-blue-400">📁</span>
          Explorer
        </h3>
        <p className="text-xs text-gray-300 mt-1 truncate" title={project.rootPath}>
          {project.rootPath.split('/').pop() || project.rootPath}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {project.openFiles.length} items • <span className="text-blue-300">{project.projectType}</span>
        </p>
      </div>
      
      <div className="p-2 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
        {/* Project Root */}
        <div 
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gradient-to-r hover:from-gray-800 hover:to-gray-700 cursor-pointer transition-all duration-300 mb-3 border border-transparent hover:border-gray-600"
          onClick={() => toggleFolder(project.rootPath)}
        >
          <span className="text-amber-400 text-sm">
            {expandedFolders.has(project.rootPath) ? '📂' : '📁'}
          </span>
          <span className="text-sm text-gray-100 font-medium">
            {project.rootPath.split('/').pop() || 'Project'}
          </span>
        </div>
        
        {/* File Tree */}
        {expandedFolders.has(project.rootPath) && (
          <div className="space-y-1">
            {fileTree.map((node) => (
              <FileTreeItem
                key={node.file.path}
                node={node}
                depth={0}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
                onToggleExpand={toggleFolder}
              />
            ))}
            
            {fileTree.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 border border-gray-600">
                  <span className="text-3xl">📁</span>
                  <p className="text-sm mt-3 text-gray-300">No files found</p>
                  <p className="text-xs mt-1 text-gray-500">This folder appears to be empty</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ================================
// MAIN CODE EDITOR COMPONENT
// ================================

export const CodeEditor: React.FC<CodeEditorProps> = ({
  project,
  onFileChange,
  onRequestAI,
}) => {
  const [selectedFile, setSelectedFile] = useState<EditorFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  
  const loadFileContent = useCallback(async (file: FileInfo) => {
    // Don't try to load content for directories
    if (file.language === 'directory') {
      setError('Cannot open directory as file');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading file content for:', file.path);
      const result = await invoke<TauriResult<string>>('read_file', { path: file.path });
      
      if (result.success && result.data) {
        setFileContent(result.data);
        setIsModified(false);
        
        // Update the selected file with content
        const updatedFile: EditorFile = {
          ...file,
          content: result.data,
          isOpen: true,
          isDirty: false,
        };
        setSelectedFile(updatedFile);
        
        console.log('Successfully loaded file:', file.path, 'Size:', result.data.length);
      } else {
        throw new Error(result.error || 'Failed to read file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load file: ${errorMessage}`);
      console.error('Error loading file:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelect = useCallback((file: FileInfo) => {
    if (selectedFile?.path === file.path) {
      return; // Already selected
    }
    
    loadFileContent(file);
  }, [selectedFile, loadFileContent]);
  
  const handleContentChange = useCallback((content: string) => {
    setFileContent(content);
    setIsModified(true);
    
    if (selectedFile && onFileChange) {
      onFileChange(selectedFile, content);
    }
  }, [selectedFile, onFileChange]);
  
  const handleSave = useCallback(async () => {
    if (!selectedFile || !isModified) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await invoke<TauriResult<string>>('save_file', { 
        path: selectedFile.path, 
        content: fileContent 
      });
      
      if (result.success) {
        setIsModified(false);
        setSelectedFile(prev => prev ? { ...prev, isDirty: false } : null);
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to save file: ${errorMessage}`);
      console.error('Error saving file:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, isModified, fileContent]);
  
  const handleAskAI = useCallback(() => {
    if (selectedFile && onRequestAI) {
      const context = `File: ${selectedFile.name}\nPath: ${selectedFile.path}\nLanguage: ${getLanguageFromExtension(selectedFile.extension)}\n\nContent:\n${fileContent}`;
      onRequestAI(context);
    }
  }, [selectedFile, fileContent, onRequestAI]);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Define custom Syntari theme
    monaco.editor.defineTheme('syntari-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '8B5CF6' },
        { token: 'string', foreground: '10B981' },
        { token: 'number', foreground: 'F59E0B' },
        { token: 'regexp', foreground: 'EF4444' },
        { token: 'type', foreground: '3B82F6' },
        { token: 'class', foreground: '06B6D4' },
        { token: 'function', foreground: 'F472B6' },
        { token: 'variable', foreground: 'E5E7EB' },
        { token: 'constant', foreground: 'FBBF24' },
      ],
      colors: {
        'editor.background': '#0F1419',
        'editor.foreground': '#E5E7EB',
        'editor.lineHighlightBackground': '#1F2937',
        'editor.selectionBackground': '#374151',
        'editor.inactiveSelectionBackground': '#1F2937',
        'editorCursor.foreground': '#3B82F6',
        'editorLineNumber.foreground': '#6B7280',
        'editorLineNumber.activeForeground': '#9CA3AF',
        'editor.selectionHighlightBackground': '#374151',
        'editor.wordHighlightBackground': '#374151',
        'editor.findMatchBackground': '#1E40AF',
        'editor.findMatchHighlightBackground': '#1E3A8A',
        'editorBracketMatch.background': '#374151',
        'editorBracketMatch.border': '#6B7280',
      }
    });
    
    // Set the custom theme
    monaco.editor.setTheme('syntari-dark');
    
    // Add custom commands
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      handleAskAI();
    });

    // Focus the editor
    editor.focus();
  }, [handleSave, handleAskAI]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'k':
            e.preventDefault();
            handleAskAI();
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleAskAI]);

  const language = selectedFile ? getLanguageFromExtension(selectedFile.extension) : 'plaintext';
  
  return (
    <div className="flex h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* File Explorer */}
      <div className="w-64 flex-shrink-0">
        <FileExplorer
          project={project}
          selectedFile={selectedFile?.path}
          onFileSelect={handleFileSelect}
        />
      </div>
      
      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        {selectedFile && (
          <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-b border-gray-600 shadow-lg">
            <div className="flex items-center space-x-4">
              <span className="text-xl">{getFileIcon(selectedFile.extension)}</span>
              <div className="flex flex-col">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-gray-100">{selectedFile.name}</span>
                  {isModified && <span className="w-2 h-2 bg-orange-400 rounded-full shadow-lg"></span>}
                  {isLoading && <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-lg"></span>}
                </div>
                <span className="text-xs text-gray-400">{selectedFile.path}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-300 px-3 py-1.5 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg border border-gray-500">
                {language}
              </span>
              <button
                onClick={handleSave}
                disabled={!isModified || isLoading}
                className={`px-4 py-2 text-xs rounded-lg transition-all duration-300 font-medium ${
                  isModified && !isLoading
                    ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg border border-green-400'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                }`}
              >
                {isLoading ? 'Saving...' : 'Save'} <span className="text-gray-300">(Ctrl+S)</span>
              </button>
              <button
                onClick={handleAskAI}
                disabled={!selectedFile || isLoading}
                className="px-4 py-2 text-xs bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed rounded-lg transition-all duration-300 text-white shadow-lg border border-blue-400 font-medium"
              >
                Ask AI <span className="text-gray-300">(Ctrl+K)</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 bg-gradient-to-r from-red-900/70 to-red-800/70 border-b border-red-700 text-red-200 text-sm backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <span className="text-red-400">⚠️</span>
              <span className="flex-1">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-200 transition-colors duration-200 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Editor Content */}
        <div className="flex-1 relative">
          {selectedFile ? (
            <div className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full bg-gray-900">
                  <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⚡</div>
                    <p className="text-gray-400">Loading file...</p>
                  </div>
                </div>
              ) : (
                <Editor
                  height="100%"
                  language={language}
                  value={fileContent}
                  onChange={(value) => handleContentChange(value || '')}
                  onMount={handleEditorDidMount}
                  theme="vs-dark"
                  options={EDITOR_OPTIONS}
                  loading={
                    <div className="flex items-center justify-center h-full bg-gray-900">
                      <div className="text-center">
                        <div className="animate-pulse text-4xl mb-4">🚀</div>
                        <p className="text-gray-400">Initializing Monaco Editor...</p>
                      </div>
                    </div>
                  }
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
              <div className="text-center max-w-2xl px-8">
                <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-8 border border-gray-600 shadow-2xl">
                  <div className="text-7xl mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">💻</div>
                  <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">Syntari AI IDE</h2>
                  <p className="text-gray-300 mb-2 text-lg">Professional code editor powered by Monaco</p>
                  <p className="text-sm text-gray-400 mb-8">
                    Select a file from the explorer to start editing with enterprise-grade features
                  </p>
                  <div className="grid grid-cols-2 gap-6 text-sm text-gray-400 mb-8">
                    <div className="text-center p-4 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl border border-gray-500">
                      <div className="text-3xl mb-3 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">🚀</div>
                      <p className="text-gray-200 font-medium">IntelliSense & Auto-completion</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl border border-gray-500">
                      <div className="text-3xl mb-3 bg-gradient-to-r from-pink-400 to-red-500 bg-clip-text text-transparent">🎨</div>
                      <p className="text-gray-200 font-medium">Syntax Highlighting</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl border border-gray-500">
                      <div className="text-3xl mb-3 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">🔍</div>
                      <p className="text-gray-200 font-medium">Advanced Search & Replace</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl border border-gray-500">
                      <div className="text-3xl mb-3 bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">🤖</div>
                      <p className="text-gray-200 font-medium">AI-Powered Assistance</p>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-gray-600">
                    <p className="text-xs text-gray-500">
                      Project: <span className="text-blue-400 font-medium">{project.projectType}</span> • 
                      Files: <span className="text-green-400 font-medium">{project.openFiles.length}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 