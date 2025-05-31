// Syntari AI IDE - File Explorer Component
// Extracted from CodeEditor.tsx for better maintainability

import React, { useState, useCallback, useMemo } from 'react';
import type { ProjectContext, FileInfo } from '../../types';
import { getFileIcon } from '../../utils/editorUtils';

interface FileTreeNode {
  file: FileInfo;
  children: FileTreeNode[];
  isExpanded: boolean;
}

interface FileExplorerProps {
  project: ProjectContext;
  selectedFile?: string;
  onFileSelect: (file: FileInfo) => void;
}

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

export const FileExplorer: React.FC<FileExplorerProps> = ({
  project,
  selectedFile,
  onFileSelect,
}) => {
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