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
  theme: 'vs-dark',
  minimap: {
    enabled: true,
    side: 'right' as const,
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
  
  // Sort files so directories come first, then by name
  const sortedFiles = [...files].sort((a, b) => {
    const aIsDir = a.language === 'directory';
    const bIsDir = b.language === 'directory';
    
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Create nodes for all files
  for (const file of sortedFiles) {
    const node: FileTreeNode = {
      file,
      children: [],
      isExpanded: false,
    };
    nodeMap.set(file.path, node);
  }
  
  // Build tree structure
  for (const file of sortedFiles) {
    const node = nodeMap.get(file.path)!;
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
    
    if (parentPath === rootPath.replace(/\/$/, '') || parentPath === '') {
      // Root level item
      tree.push(node);
    } else {
      // Find parent and add as child
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      } else {
        // If parent not found, add to root
        tree.push(node);
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
        className={`flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'bg-blue-600 text-white shadow-sm' 
            : 'hover:bg-gray-800 text-gray-300 hover:text-white'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
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
        
        <span className="text-sm truncate flex-1">{file.name}</span>
        
        {!isDirectory && file.size > 0 && (
          <span className="text-xs text-gray-500 flex-shrink-0">
            {(file.size / 1024).toFixed(1)}KB
          </span>
        )}
      </div>
      
      {/* Render children if directory is expanded */}
      {isDirectory && node.isExpanded && hasChildren && (
        <div>
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
    <div className="h-full bg-gray-900 border-r border-gray-700">
      <div className="p-3 border-b border-gray-700 bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center">
          <span className="mr-2">📁</span>
          Explorer
        </h3>
        <p className="text-xs text-gray-400 mt-1 truncate" title={project.rootPath}>
          {project.rootPath.split('/').pop() || project.rootPath}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {project.openFiles.length} items • {project.projectType}
        </p>
      </div>
      
      <div className="p-2 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
        {/* Project Root */}
        <div 
          className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-gray-800 cursor-pointer transition-colors mb-2"
          onClick={() => toggleFolder(project.rootPath)}
        >
          <span className="text-yellow-400 text-sm">
            {expandedFolders.has(project.rootPath) ? '📂' : '📁'}
          </span>
          <span className="text-sm text-gray-200 font-medium">
            {project.rootPath.split('/').pop() || 'Project'}
          </span>
        </div>
        
        {/* File Tree */}
        {expandedFolders.has(project.rootPath) && (
          <div className="space-y-0.5">
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
              <div className="text-center py-8 text-gray-500">
                <span className="text-2xl">📁</span>
                <p className="text-sm mt-2">No files found</p>
                <p className="text-xs mt-1">This folder appears to be empty</p>
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
    <div className="flex h-full bg-gray-900 text-white">
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
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getFileIcon(selectedFile.extension)}</span>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-200">{selectedFile.name}</span>
                  {isModified && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
                  {isLoading && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
                </div>
                <span className="text-xs text-gray-400">{selectedFile.path}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 px-2 py-1 bg-gray-700 rounded">
                {language}
              </span>
              <button
                onClick={handleSave}
                disabled={!isModified || isLoading}
                className={`px-3 py-1.5 text-xs rounded transition-all duration-200 ${
                  isModified && !isLoading
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? 'Saving...' : 'Save'} <span className="text-gray-300">(Ctrl+S)</span>
              </button>
              <button
                onClick={handleAskAI}
                disabled={!selectedFile || isLoading}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded transition-all duration-200 text-white shadow-sm"
              >
                Ask AI <span className="text-gray-300">(Ctrl+K)</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="px-4 py-2 bg-red-900/50 border-b border-red-800 text-red-200 text-sm">
            <div className="flex items-center space-x-2">
              <span>⚠️</span>
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
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
            <div className="flex items-center justify-center h-full text-gray-400 bg-gray-900">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-6">💻</div>
                <h2 className="text-2xl font-bold mb-4 text-gray-200">Syntari AI IDE</h2>
                <p className="text-gray-400 mb-2">Professional code editor powered by Monaco</p>
                <p className="text-sm text-gray-500 mb-6">
                  Select a file from the explorer to start editing with enterprise-grade features
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🚀</div>
                    <p>IntelliSense & Auto-completion</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎨</div>
                    <p>Syntax Highlighting</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">🔍</div>
                    <p>Advanced Search & Replace</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">🤖</div>
                    <p>AI-Powered Assistance</p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-600">
                    Project: <span className="text-blue-400">{project.projectType}</span> • 
                    Files: <span className="text-green-400">{project.openFiles.length}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 