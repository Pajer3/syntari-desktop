// Syntari AI IDE - Problems Panel Component
// VS Code-style problems panel for errors, warnings, and diagnostics

import React, { useState, useCallback, useMemo } from 'react';

export type ProblemSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface ProblemLocation {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface Problem {
  id: string;
  severity: ProblemSeverity;
  message: string;
  code?: string;
  source: string; // e.g., 'typescript', 'eslint', 'ai-assistant'
  location: ProblemLocation;
  description?: string;
  fixes?: ProblemFix[];
  relatedInformation?: {
    location: ProblemLocation;
    message: string;
  }[];
}

export interface ProblemFix {
  title: string;
  edits: {
    file: string;
    range: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
    newText: string;
  }[];
}

interface ProblemsPanelProps {
  problems: Problem[];
  onNavigateToLocation: (location: ProblemLocation) => void;
  onApplyFix?: (fix: ProblemFix) => void;
  onRefreshProblems?: () => void;
  className?: string;
  maxHeight?: number;
  showSourceIcons?: boolean;
}

export const ProblemsPanel: React.FC<ProblemsPanelProps> = ({
  problems,
  onNavigateToLocation,
  onApplyFix,
  onRefreshProblems,
  className = '',
  maxHeight = 300,
  showSourceIcons = true,
}) => {
  const [selectedSeverities, setSelectedSeverities] = useState<ProblemSeverity[]>([
    'error', 'warning', 'info', 'hint'
  ]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);

  // Filter and group problems
  const filteredProblems = useMemo(() => {
    return problems.filter(problem => {
      // Filter by severity
      if (!selectedSeverities.includes(problem.severity)) return false;
      
      // Filter by source if any sources are selected
      if (selectedSources.length > 0 && !selectedSources.includes(problem.source)) return false;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          problem.message.toLowerCase().includes(query) ||
          problem.location.file.toLowerCase().includes(query) ||
          problem.source.toLowerCase().includes(query) ||
          problem.code?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [problems, selectedSeverities, selectedSources, searchQuery]);

  // Group problems by file
  const groupedProblems = useMemo(() => {
    const groups = new Map<string, Problem[]>();
    
    filteredProblems.forEach(problem => {
      const file = problem.location.file;
      if (!groups.has(file)) {
        groups.set(file, []);
      }
      groups.get(file)!.push(problem);
    });
    
    // Sort problems within each file by line number
    for (const [, problems] of groups) {
      problems.sort((a, b) => {
        if (a.location.line !== b.location.line) {
          return a.location.line - b.location.line;
        }
        return a.location.column - b.location.column;
      });
    }
    
    return Array.from(groups.entries()).sort(([fileA], [fileB]) => fileA.localeCompare(fileB));
  }, [filteredProblems]);

  // Count problems by severity
  const counts = useMemo(() => {
    const counts = { error: 0, warning: 0, info: 0, hint: 0 };
    problems.forEach(problem => {
      counts[problem.severity]++;
    });
    return counts;
  }, [problems]);

  // Available sources
  const availableSources = useMemo(() => {
    const sources = new Set(problems.map(p => p.source));
    return Array.from(sources).sort();
  }, [problems]);

  // Get severity icon and color
  const getSeverityDisplay = useCallback((severity: ProblemSeverity) => {
    switch (severity) {
      case 'error':
        return { icon: '❌', color: 'text-red-400', bgColor: 'bg-red-500/10' };
      case 'warning':
        return { icon: '⚠️', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' };
      case 'info':
        return { icon: 'ℹ️', color: 'text-blue-400', bgColor: 'bg-blue-500/10' };
      case 'hint':
        return { icon: '💡', color: 'text-green-400', bgColor: 'bg-green-500/10' };
      default:
        return { icon: '•', color: 'text-vscode-fg', bgColor: 'bg-vscode-bg' };
    }
  }, []);

  // Get source icon
  const getSourceIcon = useCallback((source: string) => {
    switch (source.toLowerCase()) {
      case 'typescript':
      case 'ts':
        return '🔷';
      case 'eslint':
        return '🔍';
      case 'ai-assistant':
        return '🤖';
      case 'prettier':
        return '💅';
      case 'rust-analyzer':
        return '🦀';
      default:
        return '📋';
    }
  }, []);

  // Toggle severity filter
  const toggleSeverity = useCallback((severity: ProblemSeverity) => {
    setSelectedSeverities(prev => 
      prev.includes(severity)
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    );
  }, []);

  // Toggle source filter
  const toggleSource = useCallback((source: string) => {
    setSelectedSources(prev => 
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  }, []);

  // Handle problem click
  const handleProblemClick = useCallback((problem: Problem) => {
    setSelectedProblem(problem.id);
    onNavigateToLocation(problem.location);
  }, [onNavigateToLocation]);

  // Apply a fix
  const handleApplyFix = useCallback((fix: ProblemFix, _problem: Problem) => {
    if (onApplyFix) {
      onApplyFix(fix);
    }
    // Optimistically remove the problem from selection
    setSelectedProblem(null);
  }, [onApplyFix]);

  return (
    <div className={`problems-panel bg-vscode-sidebar text-vscode-fg flex flex-col ${className}`}>
      {/* Header */}
      <div className="problems-header border-b border-vscode-border p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Problems ({filteredProblems.length})
          </h2>
          
          <div className="flex items-center space-x-2">
            {onRefreshProblems && (
              <button
                onClick={onRefreshProblems}
                className="p-1 rounded text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover transition-colors"
                title="Refresh problems"
              >
                🔄
              </button>
            )}
            
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded text-xs bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover transition-colors"
              title="Clear filters"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter problems..."
            className="w-full px-3 py-2 bg-vscode-input border border-vscode-border rounded text-vscode-fg placeholder-vscode-fg-muted text-sm focus:outline-none focus:ring-2 focus:ring-vscode-accent"
          />
        </div>

        {/* Severity Filters */}
        <div className="flex items-center space-x-2 mb-3">
          {(['error', 'warning', 'info', 'hint'] as ProblemSeverity[]).map(severity => {
            const { icon, color } = getSeverityDisplay(severity);
            const isSelected = selectedSeverities.includes(severity);
            const count = counts[severity];
            
            return (
              <button
                key={severity}
                onClick={() => toggleSeverity(severity)}
                className={`
                  flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors
                  ${isSelected 
                    ? 'bg-vscode-accent text-white' 
                    : 'bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover'
                  }
                `}
                title={`${isSelected ? 'Hide' : 'Show'} ${severity}s`}
              >
                <span>{icon}</span>
                <span className="capitalize">{severity}</span>
                <span className={`ml-1 ${isSelected ? 'text-white' : color}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Source Filters */}
        {availableSources.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {availableSources.map(source => {
              const isSelected = selectedSources.includes(source);
              const icon = showSourceIcons ? getSourceIcon(source) : null;
              
              return (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={`
                    flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors
                    ${isSelected 
                      ? 'bg-vscode-accent text-white' 
                      : 'bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover'
                    }
                  `}
                  title={`${isSelected ? 'Hide' : 'Show'} ${source} problems`}
                >
                  {icon && <span>{icon}</span>}
                  <span>{source}</span>
                </button>
              );
            })}
            {selectedSources.length > 0 && (
              <button
                onClick={() => setSelectedSources([])}
                className="px-2 py-1 text-xs text-vscode-fg-muted hover:text-vscode-fg"
                title="Clear source filters"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Problems List */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
        {filteredProblems.length === 0 ? (
          <div className="p-8 text-center text-vscode-fg-muted">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-sm">
              {problems.length === 0 ? 'No problems detected' : 'No problems match current filters'}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-vscode-accent hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {groupedProblems.map(([file, fileProblems]) => (
              <div key={file} className="mb-4">
                {/* File Header */}
                <div className="flex items-center p-2 bg-vscode-bg rounded-t text-sm font-medium">
                  <span className="text-vscode-fg truncate" title={file}>
                    📄 {file.split('/').pop()}
                  </span>
                  <span className="ml-2 text-xs text-vscode-fg-muted">
                    ({fileProblems.length} problem{fileProblems.length !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* File Problems */}
                <div className="space-y-1">
                  {fileProblems.map(problem => {
                    const { icon, color, bgColor } = getSeverityDisplay(problem.severity);
                    const isSelected = selectedProblem === problem.id;
                    
                    return (
                      <div
                        key={problem.id}
                        className={`
                          p-3 cursor-pointer transition-colors rounded border-l-4
                          ${isSelected 
                            ? 'bg-vscode-list-active border-vscode-accent' 
                            : 'hover:bg-vscode-list-hover border-transparent'
                          }
                          ${bgColor}
                        `}
                        onClick={() => handleProblemClick(problem)}
                      >
                        <div className="flex items-start space-x-3">
                          <span className={`${color} flex-shrink-0 mt-0.5`}>{icon}</span>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-vscode-fg">
                              {problem.message}
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-1 text-xs text-vscode-fg-muted">
                              <span>
                                Line {problem.location.line}, Column {problem.location.column}
                              </span>
                              {problem.code && (
                                <span className="font-mono bg-vscode-keybinding-bg px-1 rounded">
                                  {problem.code}
                                </span>
                              )}
                              {showSourceIcons && (
                                <span className="flex items-center space-x-1">
                                  <span>{getSourceIcon(problem.source)}</span>
                                  <span>{problem.source}</span>
                                </span>
                              )}
                            </div>

                            {/* Quick Fixes */}
                            {problem.fixes && problem.fixes.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {problem.fixes.map((fix, index) => (
                                  <button
                                    key={index}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApplyFix(fix, problem);
                                    }}
                                    className="text-xs bg-vscode-accent hover:bg-vscode-accent-hover text-white px-2 py-1 rounded mr-2"
                                  >
                                    🔧 {fix.title}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Description */}
                            {problem.description && isSelected && (
                              <div className="mt-2 text-xs text-vscode-fg-muted p-2 bg-vscode-bg rounded">
                                {problem.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 