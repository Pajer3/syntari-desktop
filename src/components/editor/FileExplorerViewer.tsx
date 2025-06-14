// Syntari AI IDE - File Explorer Viewer
// Full IDE workspace with integrated file explorer and code editor

import React, { useState, useCallback, useEffect } from 'react';
import { CodeEditor } from '../CodeEditor';
import type { ProjectContext, FileInfo } from '../../types';

interface FileExplorerViewerProps {
  rootPath?: string;
  className?: string;
}

export const FileExplorerViewer: React.FC<FileExplorerViewerProps> = ({ 
  rootPath = '/home/pajer/Documents/Businesses/Syntari/syntari-desktop',
  className = ''
}) => {
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project data
  const loadProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create project context with all required properties
      const projectContext: ProjectContext = {
        rootPath,
        projectType: 'typescript', // Default to TypeScript, could be detected from package.json
        openFiles: [], // Will be populated as files are opened
        dependencies: [], // Will be populated from package.json, Cargo.toml etc.
        lastAnalyzed: Date.now(),
        gitBranch: 'main' // Could be detected from git
      };
      
      setProject(projectContext);
    } catch (err) {
      setError(`Failed to load project: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [rootPath]);

  // Handle file changes from the code editor
  const handleFileChange = useCallback((file: FileInfo | null) => {
    console.log('File changed in editor:', file?.path);
  }, []);

  // Handle AI requests (placeholder)
  const handleAIRequest = useCallback((context: any) => {
    console.log('AI request from editor:', context);
    // Feature: Integrate with AI service for intelligent code assistance
    // Implementation notes: Connect to ChatService and route AI requests through smart provider system
  }, []);

  // Load project on mount or path change
  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="text-center text-gray-400">
          <div className="text-lg mb-2">🔄</div>
          <div>Loading project...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="text-center text-red-400">
          <div className="text-lg mb-2">❌</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  // No project state
  if (!project) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 ${className}`}>
        <div className="text-center text-gray-400">
          <div className="text-lg mb-2">📁</div>
          <div>No project loaded</div>
        </div>
      </div>
    );
  }

  // Render the full IDE with CodeEditor
  return (
    <div className={`h-full bg-gray-900 ${className}`}>
      <CodeEditor
        project={project}
        onFileChange={handleFileChange}
        onRequestAI={handleAIRequest}
        className="h-full w-full"
      />
    </div>
  );
}; 