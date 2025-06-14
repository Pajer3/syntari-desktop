// Syntari AI IDE - Icon System Integration Test
// Quick verification that our comprehensive SVG system is working

import { EnhancedFileIcon } from '../ui/EnhancedFileIcon';

const TEST_FILES = [
  'app.js', 'component.tsx', 'styles.css', 'main.py', 'server.go', 
  'index.html', 'config.json', 'README.md', 'package.json', 'Dockerfile'
];

export const IconSystemTest: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      background: '#1e1e1e', 
      color: '#d4d4d4',
      fontFamily: 'monospace'
    }}>
      <h2>🎨 Syntari AI IDE - Icon System Test</h2>
      <p>Testing our comprehensive SVG icon system with {TEST_FILES.length} sample files:</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px',
        marginTop: '20px'
      }}>
        {TEST_FILES.map(fileName => (
          <div 
            key={fileName}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px',
              background: '#2d2d30',
              borderRadius: '8px',
              border: '1px solid #404040'
            }}
          >
            <EnhancedFileIcon 
              fileName={fileName}
              size={24}
              style={{ marginRight: '12px' }}
            />
            <span style={{ fontSize: '14px' }}>{fileName}</span>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
        ✅ If you see SVG icons instead of emojis, the new system is working!
      </div>
    </div>
  );
}; 