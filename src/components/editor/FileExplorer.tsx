// Syntari AI IDE - Professional File Explorer Component
// VSCode-inspired file tree with clean design

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

const buildFileTree = (files: readonly FileInfo[], rootPath: string): FileTreeNode[] => {
  const tree: FileTreeNode[] = [];
  const nodeMap = new Map<string, FileTreeNode>();
  
  const normalizedRootPath = rootPath.replace(/\/$/, '');
  
  const sortedFiles = [...files].sort((a, b) => {
    const aIsDir = a.language === 'directory';
    const bIsDir = b.language === 'directory';
    
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.name.localeCompare(b.name);
  });
  
  const filteredFiles = sortedFiles.filter(file => file.path !== normalizedRootPath);
  
  for (const file of filteredFiles) {
    const node: FileTreeNode = {
      file,
      children: [],
      isExpanded: false,
    };
    nodeMap.set(file.path, node);
  }
  
  for (const file of filteredFiles) {
    const node = nodeMap.get(file.path)!;
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
    
    if (parentPath === normalizedRootPath) {
      tree.push(node);
    } else {
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      } else {
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
        className={`file-explorer-item ${isSelected ? 'selected' : ''} ${isDirectory ? 'folder' : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={handleClick}
      >
        {/* Chevron for directories */}
        {isDirectory && (
          <span className="icon text-xs text-vscode-fg-muted mr-1">
            {hasChildren ? (node.isExpanded ? '▼' : '▶') : ''}
          </span>
        )}
        
        {/* File/Folder Icon */}
        <span className="icon">
          {isDirectory ? (node.isExpanded ? '📂' : '📁') : getFileIcon(file.extension)}
        </span>
        
        {/* File Name */}
        <span className="flex-1 truncate">{file.name}</span>
        
        {/* File Size (for files only) */}
        {!isDirectory && file.size > 0 && (
          <span className="text-xs text-vscode-fg-muted ml-auto">
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
  
  const fileTree = useMemo(() => {
    const tree = buildFileTree(project.openFiles, project.rootPath);
    
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
    <div className="file-explorer h-full flex flex-col">
      {/* Explorer Header */}
      <div className="file-explorer-header">
        Explorer
      </div>
      
      {/* Project Root Section */}
      <div className="px-2 py-1 bg-vscode-sidebar border-b border-vscode-border">
        <div 
          className="file-explorer-item folder"
          style={{ paddingLeft: '4px' }}
          onClick={() => toggleFolder(project.rootPath)}
        >
          <span className="icon text-xs text-vscode-fg-muted mr-1">
            {expandedFolders.has(project.rootPath) ? '▼' : '▶'}
          </span>
          <span className="icon text-yellow-400">
            {expandedFolders.has(project.rootPath) ? '📂' : '📁'}
          </span>
          <span className="font-medium">
            {project.rootPath.split('/').pop() || 'Project'}
          </span>
        </div>
      </div>
      
      {/* File Tree */}
      <div className="flex-1 overflow-y-auto vscode-scrollbar">
        {expandedFolders.has(project.rootPath) && (
          <div className="py-1">
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
              <div className="text-center py-8 text-vscode-fg-muted">
                <div className="text-xs">No files found</div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Explorer Footer */}
      <div className="px-3 py-2 bg-vscode-sidebar border-t border-vscode-border text-xs text-vscode-fg-muted">
        {project.openFiles.length} files • {project.projectType}
      </div>
    </div>
  );
}; 