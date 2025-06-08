// Syntari AI IDE - Enhanced Minimap Component
// Advanced code overview navigation with AI-powered insights and performance optimization

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export interface MinimapRange {
  startLine: number;
  endLine: number;
  type: 'selection' | 'viewport' | 'search' | 'error' | 'warning' | 'modification';
  color?: string;
  opacity?: number;
}

export interface MinimapMarker {
  line: number;
  type: 'error' | 'warning' | 'info' | 'bookmark' | 'breakpoint' | 'modification' | 'ai-insight';
  message?: string;
  severity?: 'high' | 'medium' | 'low';
  confidence?: number; // AI confidence score
}

export interface MinimapAIInsight {
  line: number;
  type: 'complexity' | 'performance' | 'security' | 'maintainability' | 'suggestion';
  level: 'high' | 'medium' | 'low';
  message: string;
  confidence: number;
}

interface EnhancedMinimapProps {
  content: string;
  language: string;
  currentLine: number;
  viewportStartLine: number;
  viewportEndLine: number;
  totalLines: number;
  markers?: MinimapMarker[];
  ranges?: MinimapRange[];
  aiInsights?: MinimapAIInsight[];
  searchMatches?: number[];
  onLineClick: (line: number) => void;
  onRangeSelect?: (startLine: number, endLine: number) => void;
  width?: number;
  maxHeight?: number;
  showLineNumbers?: boolean;
  showAIInsights?: boolean;
  className?: string;
}

export const EnhancedMinimap: React.FC<EnhancedMinimapProps> = ({
  content,
  currentLine,
  viewportStartLine,
  viewportEndLine,
  totalLines,
  markers = [],
  ranges = [],
  aiInsights = [],
  searchMatches = [],
  onLineClick,
  onRangeSelect,
  width = 120,
  maxHeight = 600,
  showLineNumbers = true,
  showAIInsights = true,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate dimensions and scaling
  const lineHeight = useMemo(() => {
    return Math.max(1, Math.min(4, maxHeight / totalLines));
  }, [maxHeight, totalLines]);

  const actualHeight = useMemo(() => {
    return Math.min(maxHeight, totalLines * lineHeight);
  }, [maxHeight, totalLines, lineHeight]);

  // Parse content for syntax highlighting preview
  const codeLines = useMemo(() => {
    return content.split('\n').map((line, index) => ({
      number: index + 1,
      content: line.trim(),
      indent: line.length - line.trimStart().length,
      isEmpty: line.trim().length === 0,
      isComment: line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*'),
      isFunction: /^(function|const|let|var|class|interface|type|export|import)/i.test(line.trim()),
      isControl: /^(if|else|for|while|switch|case|try|catch|return)/i.test(line.trim()),
      complexity: calculateLineComplexity(line)
    }));
  }, [content]);

  // Calculate line complexity for AI insights
  function calculateLineComplexity(line: string): number {
    let complexity = 0;
    
    // Control structures add complexity
    if (/\b(if|else|for|while|switch|case)\b/g.test(line)) complexity += 1;
    if (/\b(try|catch|throw)\b/g.test(line)) complexity += 2;
    if (/\b(async|await|Promise)\b/g.test(line)) complexity += 1;
    
    // Nested structures
    const braceCount = (line.match(/[{}]/g) || []).length;
    complexity += braceCount * 0.5;
    
    // Long lines are potentially complex
    if (line.length > 120) complexity += 1;
    if (line.length > 200) complexity += 2;
    
    return Math.min(5, complexity);
  }

  // Enhanced marker processing with AI insights
  const processedMarkers = useMemo(() => {
    const allMarkers = [...markers];
    
    // Add AI insights as markers if enabled
    if (showAIInsights) {
      aiInsights.forEach(insight => {
        allMarkers.push({
          line: insight.line,
          type: 'ai-insight',
          message: insight.message,
          severity: insight.level as 'high' | 'medium' | 'low',
          confidence: insight.confidence
        });
      });
    }
    
    // Add complexity markers for very complex lines
    codeLines.forEach((codeLine, index) => {
      if (codeLine.complexity >= 4) {
        allMarkers.push({
          line: index + 1,
          type: 'warning',
          message: `High complexity line (${codeLine.complexity}/5)`,
          severity: codeLine.complexity >= 5 ? 'high' : 'medium'
        });
      }
    });
    
    return allMarkers.sort((a, b) => a.line - b.line);
  }, [markers, aiInsights, showAIInsights, codeLines]);

  // Draw the minimap content
  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = actualHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${actualHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = 'rgba(30, 30, 30, 1)';
    ctx.fillRect(0, 0, width, actualHeight);

    // Draw code lines with syntax-aware coloring
    codeLines.forEach((codeLine, index) => {
      const y = index * lineHeight;
      const lineWidth = Math.min(width - 10, (codeLine.content.length * 1.2) + (codeLine.indent * 2));
      
      if (codeLine.isEmpty) return;
      
      // Color based on line type
      let color = 'rgba(212, 212, 212, 0.8)'; // Default text
      
      if (codeLine.isComment) {
        color = 'rgba(106, 153, 85, 0.6)'; // Green for comments
      } else if (codeLine.isFunction) {
        color = 'rgba(220, 220, 170, 0.8)'; // Yellow for functions
      } else if (codeLine.isControl) {
        color = 'rgba(197, 134, 192, 0.8)'; // Purple for control flow
      }
      
      // Adjust opacity based on complexity
      const complexityAlpha = Math.max(0.4, 1 - (codeLine.complexity * 0.1));
      
      ctx.fillStyle = color.replace(/[\d.]+\)$/, `${complexityAlpha})`);
      ctx.fillRect(codeLine.indent * 0.5, y, lineWidth, Math.max(1, lineHeight - 0.5));
    });

    // Draw search matches
    searchMatches.forEach(line => {
      const y = (line - 1) * lineHeight;
      ctx.fillStyle = 'rgba(255, 193, 7, 0.8)';
      ctx.fillRect(0, y, width, Math.max(1, lineHeight));
    });

    // Draw ranges
    ranges.forEach(range => {
      const startY = (range.startLine - 1) * lineHeight;
      const endY = range.endLine * lineHeight;
      const height = Math.max(1, endY - startY);
      
      ctx.fillStyle = range.color || getRangeColor(range.type);
      ctx.fillRect(0, startY, width, height);
    });

  }, [width, actualHeight, lineHeight, codeLines, searchMatches, ranges]);

  // Draw overlay (markers, viewport, selection)
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = actualHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${actualHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear overlay
    ctx.clearRect(0, 0, width, actualHeight);

    // Draw viewport indicator
    const viewportStartY = (viewportStartLine - 1) * lineHeight;
    const viewportEndY = viewportEndLine * lineHeight;
    const viewportHeight = Math.max(lineHeight, viewportEndY - viewportStartY);
    
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, viewportStartY, width - 2, viewportHeight);
    
    ctx.fillStyle = 'rgba(14, 165, 233, 0.1)';
    ctx.fillRect(1, viewportStartY, width - 2, viewportHeight);

    // Draw current line indicator
    const currentY = (currentLine - 1) * lineHeight;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, currentY, width, Math.max(1, lineHeight));

    // Draw markers
    processedMarkers.forEach(marker => {
      const y = (marker.line - 1) * lineHeight;
      const markerColor = getMarkerColor(marker.type, marker.severity);
      const markerSize = getMarkerSize(marker.type);
      
      // Draw marker background
      ctx.fillStyle = markerColor;
      ctx.fillRect(width - markerSize - 2, y, markerSize, Math.max(1, lineHeight));
      
      // Draw AI confidence indicator for AI insights
      if (marker.type === 'ai-insight' && marker.confidence) {
        const confidenceWidth = (marker.confidence * markerSize);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(width - markerSize - 2, y, confidenceWidth, Math.max(1, lineHeight * 0.3));
      }
    });

    // Draw selection range
    if (selectedRange) {
      const startY = (selectedRange.start - 1) * lineHeight;
      const endY = selectedRange.end * lineHeight;
      const height = Math.max(lineHeight, endY - startY);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(1, startY, width - 2, height);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(1, startY, width - 2, height);
    }

    // Draw hover line
    if (isHovered && hoveredLine !== null) {
      const hoverY = (hoveredLine - 1) * lineHeight;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, hoverY, width, Math.max(1, lineHeight));
    }

  }, [width, actualHeight, lineHeight, viewportStartLine, viewportEndLine, currentLine, processedMarkers, selectedRange, isHovered, hoveredLine]);

  // Helper functions for colors and sizes
  function getRangeColor(type: string): string {
    switch (type) {
      case 'selection': return 'rgba(14, 165, 233, 0.3)';
      case 'search': return 'rgba(255, 193, 7, 0.4)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
      case 'modification': return 'rgba(34, 197, 94, 0.3)';
      default: return 'rgba(156, 163, 175, 0.3)';
    }
  }

  function getMarkerColor(type: string, severity?: string): string {
    switch (type) {
      case 'error': return 'rgba(239, 68, 68, 0.8)';
      case 'warning': return 'rgba(245, 158, 11, 0.8)';
      case 'info': return 'rgba(59, 130, 246, 0.8)';
      case 'bookmark': return 'rgba(147, 51, 234, 0.8)';
      case 'breakpoint': return 'rgba(239, 68, 68, 1)';
      case 'modification': return 'rgba(34, 197, 94, 0.8)';
      case 'ai-insight': 
        switch (severity) {
          case 'high': return 'rgba(255, 69, 58, 0.8)';
          case 'medium': return 'rgba(255, 159, 10, 0.8)';
          case 'low': return 'rgba(52, 199, 89, 0.8)';
          default: return 'rgba(14, 165, 233, 0.8)';
        }
      default: return 'rgba(156, 163, 175, 0.8)';
    }
  }

  function getMarkerSize(type: string): number {
    switch (type) {
      case 'error':
      case 'breakpoint': return 8;
      case 'warning':
      case 'ai-insight': return 6;
      default: return 4;
    }
  }

  // Mouse event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const line = Math.floor(y / lineHeight) + 1;
    setHoveredLine(Math.min(totalLines, Math.max(1, line)));

    if (isDragging && dragStart !== null) {
      const currentLine = Math.min(totalLines, Math.max(1, line));
      setSelectedRange({
        start: Math.min(dragStart, currentLine),
        end: Math.max(dragStart, currentLine)
      });
    }
  }, [lineHeight, totalLines, isDragging, dragStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const line = Math.floor(y / lineHeight) + 1;
    const clickedLine = Math.min(totalLines, Math.max(1, line));

    if (e.shiftKey && onRangeSelect) {
      setIsDragging(true);
      setDragStart(clickedLine);
    } else {
      onLineClick(clickedLine);
      setSelectedRange(null);
    }
  }, [lineHeight, totalLines, onLineClick, onRangeSelect]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && selectedRange && onRangeSelect) {
      onRangeSelect(selectedRange.start, selectedRange.end);
    }
    setIsDragging(false);
    setDragStart(null);
  }, [isDragging, selectedRange, onRangeSelect]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setHoveredLine(null);
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setSelectedRange(null);
    }
  }, [isDragging]);

  // Draw when dependencies change
  useEffect(() => {
    drawMinimap();
  }, [drawMinimap]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Tooltip for hovered elements
  const getTooltipContent = useCallback((): string | null => {
    if (!isHovered || hoveredLine === null) return null;

    const lineMarkers = processedMarkers.filter(m => m.line === hoveredLine);
    if (lineMarkers.length > 0) {
      return lineMarkers.map(m => {
        let prefix = '';
        switch (m.type) {
          case 'error': prefix = '❌ '; break;
          case 'warning': prefix = '⚠️ '; break;
          case 'info': prefix = 'ℹ️ '; break;
          case 'ai-insight': prefix = '🤖 '; break;
          case 'bookmark': prefix = '🔖 '; break;
          case 'breakpoint': prefix = '🔴 '; break;
          default: prefix = '• ';
        }
        return `${prefix}${m.message || `${m.type} at line ${m.line}`}`;
      }).join('\n');
    }

    const codeLine = codeLines[hoveredLine - 1];
    if (codeLine && codeLine.complexity >= 3) {
      return `Line ${hoveredLine}: Complexity ${codeLine.complexity}/5\n${codeLine.content.substring(0, 100)}${codeLine.content.length > 100 ? '...' : ''}`;
    }

    return `Line ${hoveredLine}`;
  }, [isHovered, hoveredLine, processedMarkers, codeLines]);

  return (
    <div
      ref={containerRef}
      className={`minimap-container relative border-l border-vscode-border bg-vscode-editor ${className}`}
      style={{ width, height: actualHeight }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      title={getTooltipContent() || undefined}
    >
      {/* Main minimap canvas */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 cursor-pointer"
        style={{ width, height: actualHeight }}
      />
      
      {/* Overlay canvas for interactive elements */}
      <canvas
        ref={overlayRef}
        className="absolute top-0 left-0 cursor-pointer pointer-events-none"
        style={{ width, height: actualHeight }}
      />

      {/* Line numbers overlay (optional) */}
      {showLineNumbers && isHovered && (
        <div className="absolute top-0 left-full ml-2 bg-vscode-tooltip text-vscode-tooltip-fg px-2 py-1 rounded text-xs font-mono pointer-events-none z-10">
          {hoveredLine && `Line ${hoveredLine}`}
        </div>
      )}

      {/* AI Insights summary */}
      {showAIInsights && aiInsights.length > 0 && (
        <div className="absolute bottom-0 left-0 w-full bg-vscode-bg/90 border-t border-vscode-border p-2">
          <div className="text-xs text-vscode-fg-muted">
            🤖 {aiInsights.length} AI insights
          </div>
        </div>
      )}
    </div>
  );
};

// Export additional types and utilities
export const minimapUtils = {
  calculateOptimalWidth: (contentLength: number): number => {
    return Math.max(80, Math.min(200, contentLength * 0.8));
  },
  
  getLineFromPosition: (y: number, lineHeight: number): number => {
    return Math.floor(y / lineHeight) + 1;
  },
  
  getPositionFromLine: (line: number, lineHeight: number): number => {
    return (line - 1) * lineHeight;
  }
};