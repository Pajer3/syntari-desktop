// Syntari AI IDE - File Icon System Viewer
// Professional file icon system showcase and testing component

import React, { useState, useMemo } from 'react';
import { EnhancedFileIcon, FileIconWithLoading } from '../ui/EnhancedFileIcon';
import { useIconStats, useFileIcons } from '../../hooks/useFileIcon';
import { FILE_ICON_MAP, getFileIcon, hasSpecificIcon } from '../../config/fileIconMap';

// Sample files for demonstration
const DEMO_FILES = [
  // Programming Languages
  'app.js', 'component.tsx', 'styles.css', 'api.py', 'main.rs', 'server.go',
  'index.html', 'config.json', 'README.md', 'package.json',
  
  // Configuration Files
  'tsconfig.json', 'webpack.config.js', '.eslintrc.js', '.prettierrc',
  'docker-compose.yml', 'Dockerfile', '.gitignore', '.env',
  
  // Documentation
  'CHANGELOG.md', 'LICENSE', 'docs.mdx', 'guide.rst',
  
  // Assets
  'logo.svg', 'background.png', 'icon.ico', 'video.mp4',
  
  // Specialized Files
  'Cargo.toml', 'poetry.lock', 'requirements.txt', 'go.mod',
  'babel.config.js', 'jest.config.ts', 'cypress.config.js',
  
  // Mobile & Game Development
  'App.swift', 'MainActivity.kt', 'scene.unity', 'player.gd',
  
  // Data & Database
  'users.sql', 'schema.prisma', 'data.csv', 'backup.db',
  
  // Special Syntari Files
  '.cursorrules', 'syntari.config.js'
];

const DEMO_DIRECTORIES = [
  'src', 'components', 'assets', 'node_modules', '.git', 'dist'
];

interface FileIconViewerProps {
  className?: string;
}

export const FileIconViewer: React.FC<FileIconViewerProps> = ({ className = '' }) => {
  const [selectedSize, setSelectedSize] = useState(24);
  const [showStats, setShowStats] = useState(false);
  const [preferLightIcons, setPreferLightIcons] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get statistics about our icon coverage
  const iconStats = useIconStats(DEMO_FILES);
  
  // Filter files based on search
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return DEMO_FILES;
    return DEMO_FILES.filter(file => 
      file.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const filteredDirectories = useMemo(() => {
    if (!searchTerm) return DEMO_DIRECTORIES;
    return DEMO_DIRECTORIES.filter(dir => 
      dir.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Get icon information for all filtered files
  const fileIcons = useFileIcons(
    filteredFiles.map(filename => ({ filename }))
  );

  return (
    <div className={`file-icon-demo ${className}`} style={{ padding: '20px', maxWidth: '1200px' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>
        🎨 Syntari File Icon System
      </h2>
      
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Professional file icon system with <strong>1000+ SVG icons</strong> 
        mapped to file extensions and specific filenames.
      </p>

      {/* Controls */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Icon Size:</span>
          <select 
            value={selectedSize} 
            onChange={(e) => setSelectedSize(Number(e.target.value))}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value={16}>16px</option>
            <option value={20}>20px</option>
            <option value={24}>24px</option>
            <option value={32}>32px</option>
            <option value={48}>48px</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={preferLightIcons}
            onChange={(e) => setPreferLightIcons(e.target.checked)}
          />
          <span>Prefer Light Icons</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={showStats}
            onChange={(e) => setShowStats(e.target.checked)}
          />
          <span>Show Statistics</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Search:</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter files..."
            style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              border: '1px solid #ddd',
              minWidth: '150px'
            }}
          />
        </label>
      </div>

      {/* Statistics */}
      {showStats && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          background: '#e8f5e8', 
          borderRadius: '8px',
          border: '1px solid #c3e6c3'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2d5a2d' }}>📊 Icon Coverage Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div>
              <strong>Total Files:</strong> {iconStats.total}
            </div>
            <div>
              <strong>With Specific Icons:</strong> {iconStats.withSpecificIcons} 
              <span style={{ color: '#28a745' }}>
                ({Math.round((iconStats.withSpecificIcons / iconStats.total) * 100)}%)
              </span>
            </div>
            <div>
              <strong>Using Defaults:</strong> {iconStats.usingDefaults}
              <span style={{ color: '#ffc107' }}>
                ({Math.round((iconStats.usingDefaults / iconStats.total) * 100)}%)
              </span>
            </div>
            <div>
              <strong>Unique Extensions:</strong> {Object.keys(iconStats.byType).length}
            </div>
          </div>
        </div>
      )}

      {/* Directories Section */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px', color: '#555' }}>📁 Directories</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
          gap: '10px',
          padding: '15px',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #eee'
        }}>
          {filteredDirectories.map((dirName) => (
            <div 
              key={dirName}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                padding: '10px',
                borderRadius: '6px',
                background: '#f8f9fa',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e9ecef';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <FileIconWithLoading
                fileName={dirName}
                isDirectory={true}
                isOpen={false}
                size={selectedSize}
                preferLightIcons={preferLightIcons}
              />
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#666',
                textAlign: 'center',
                wordBreak: 'break-word'
              }}>
                {dirName}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Files Section */}
      <div>
        <h3 style={{ marginBottom: '15px', color: '#555' }}>
          📄 Files ({filteredFiles.length} items)
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
          gap: '10px',
          padding: '15px',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #eee'
        }}>
          {filteredFiles.map((fileName, index) => {
            const iconInfo = fileIcons[index];
            const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : 'none';
            const hasSpecific = hasSpecificIcon(extension || '') || hasSpecificIcon(fileName.toLowerCase());
            
            return (
              <div 
                key={fileName}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  padding: '10px',
                  borderRadius: '6px',
                  background: hasSpecific ? '#f0f8ff' : '#fff8f0',
                  border: hasSpecific ? '1px solid #b8daff' : '1px solid #ffd59a',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <FileIconWithLoading
                  fileName={fileName}
                  isDirectory={false}
                  size={selectedSize}
                  preferLightIcons={preferLightIcons}
                />
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '11px', 
                  color: '#666',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  lineHeight: '1.2'
                }}>
                  {fileName}
                </div>
                {showStats && (
                  <div style={{ 
                    marginTop: '4px', 
                    fontSize: '9px', 
                    color: hasSpecific ? '#28a745' : '#ffc107',
                    textAlign: 'center'
                  }}>
                    {hasSpecific ? '✓ Specific' : '⚠ Default'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Reference */}
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        background: '#f1f3f4', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#555'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>🔧 Implementation Notes:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Icons are dynamically loaded from the <code>src/assets/</code> folder</li>
          <li>Fallback system ensures every file gets an appropriate icon</li>
          <li>Configuration supports both file extensions and exact filename matches</li>
          <li>Light theme variants available for many icons</li>
          <li>Performance optimized with loading states and error handling</li>
          <li>Total icon coverage: <strong>{Object.keys(FILE_ICON_MAP).length}</strong> mappings</li>
        </ul>
      </div>
    </div>
  );
};

export default FileIconViewer; 