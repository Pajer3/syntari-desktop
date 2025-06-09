// Syntari AI IDE - Material Design File Icon Component
// Real Material Design icons implementation

import React, { useMemo } from 'react';

interface FileIconProps {
  fileName: string;
  isDirectory?: boolean;
  isOpen?: boolean;
  size?: number;
  className?: string;
}

// Material Design Icon Component
const MaterialIcon: React.FC<{ 
  iconName: string;
  color: string;
  size: number; 
  className: string;
}> = ({ iconName, color, size, className }) => {
  // Real Material Design SVG paths from the actual Material Icon Theme
  const materialIcons: Record<string, string> = {
    // JavaScript
    javascript: 'M3 3v18h18V3H3zm16.525 13.707c-.131-.821-.666-1.511-2.252-2.155-.552-.259-1.165-.438-1.349-.854-.068-.248-.078-.382-.034-.529.113-.484.687-.629 1.137-.495.293.09.563.315.732.676.775-.507.775-.507 1.316-.844-.203-.314-.304-.451-.439-.586-.473-.528-1.103-.798-2.126-.798l-.528.067c-.507.124-.991.395-1.283.754-.855.968-.608 2.655.427 3.354 1.023.765 2.521.933 2.712 1.653.18.878-.652 1.159-1.475 1.058-.607-.136-.945-.439-1.316-1.002l-1.372.788c.157.359.337.517.607.832 1.305 1.316 4.567 1.249 5.151-.754.021-.067.18-.528.056-1.237l.034.049zm-6.737-5.434h-1.686c0 1.453-.007 2.898-.007 4.354 0 .924.047 1.772-.104 2.033-.247.517-.883.451-1.175.36-.297-.147-.448-.349-.623-.641-.047-.078-.082-.146-.095-.146l-1.368.844c.229.472.563.879.994 1.137.641.383 1.503.507 2.405.305.588-.169 1.094-.518 1.358-1.058.383-.697.302-1.553.299-2.509.009-1.541 0-3.082 0-4.635l.003-.042z',
    
    // TypeScript
    typescript: 'M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0H1.125zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z',
    
    // React
    react: 'M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44a23.476 23.476 0 0 0-3.107-.534A23.892 23.892 0 0 0 12.769 4.7c1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442a22.73 22.73 0 0 0-3.113.538 15.02 15.02 0 0 1-.254-1.42c-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.36-.034-.471 0-.92.014-1.36.034.44-.572.895-1.096 1.36-1.564zM12 6.898a22.84 22.84 0 0 1 1.79 2.098 22.84 22.84 0 0 1-3.581 0 22.84 22.84 0 0 1 1.791-2.098zm-3.746.724a18.54 18.54 0 0 0 1.914 2.98c-.597.144-1.207.312-1.83.503-.54-1.653-.73-3.177-.084-3.483zm7.492 0c.632.286.458 1.78-.11 3.441a24.4 24.4 0 0 0-1.8-.498A18.54 18.54 0 0 0 15.746 7.622z',
    
    // HTML
    html: 'M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z',
    
    // CSS
    css: 'M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 4.406l9.523-.002.235-2.622-12.986.004.698 2.62zm.059 2.043L8.533 9.75h9.012l-.326 3.426-2.91.804-2.955-.81-.188-2.11H8.553l.33 4.171L12 19.351l5.379-1.443L18.209 9.75H8.59l-.058-3.301z',
    
    // JSON
    json: 'M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146zM11.854 4.146a.5.5 0 0 1 .146.854l-3 1.5a.5.5 0 0 1-.708-.708l3-1.5a.5.5 0 0 1 .562-.146z',
    
    // Python
    python: 'M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05z',
    
    // Rust
    rust: 'M23.8346 11.7033l-1.0073-.6236a13.7268 13.7268 0 0 0-.0283-.2936l.8656-.8069a.3483.3483 0 0 0-.1154-.5702l-1.3647-.6618a5.6855 5.6855 0 0 0-.0951-.2717l.6849-1.0258a.3462.3462 0 0 0-.2257-.5346l-1.5135-.3584a4.6988 4.6988 0 0 0-.1404-.2312l.4522-1.1434a.3462.3462 0 0 0-.3346-.4926L19.5392 6.337a4.3936 4.3936 0 0 0-.1785-.1785l.1867-1.2289a.3483.3483 0 0 0-.4926-.3346l-1.1434.4522a4.6988 4.6988 0 0 0-.2312-.1404L17.341 3.4622a.3462.3462 0 0 0-.5346-.2257l-1.0258.6849a5.6855 5.6855 0 0 0-.2717-.0951L14.8671 2.5616a.3483.3483 0 0 0-.5702-.1154l-.8069.8656a13.7268 13.7268 0 0 0-.2936-.0283L12.5728.1662a.3483.3483 0 0 0-.5346 0l-.6236 1.0073a13.7268 13.7268 0 0 0-.2936.0283l-.8069-.8656a.3483.3483 0 0 0-.5702.1154l-.6618 1.3647a5.6855 5.6855 0 0 0-.2717.0951l1.0258.6849a.3462.3462 0 0 0 .5346-.2257l.3584-1.5135a4.6988 4.6988 0 0 0 .2312-.1404l1.1434.4522a.3462.3462 0 0 0 .4926-.3346l-.1867-1.2289a4.3936 4.3936 0 0 0 .1785-.1785l1.2289.1867a.3462.3462 0 0 0 .3346-.4926l-.4522-1.1434a4.6988 4.6988 0 0 0 .1404-.2312l1.5135-.3584a.3462.3462 0 0 0 .2257-.5346l-.6849-1.0258a5.6855 5.6855 0 0 0 .0951-.2717l1.3647-.6618a.3483.3483 0 0 0 .1154-.5702l-.8656-.8069a13.7268 13.7268 0 0 0 .0283-.2936l1.0073-.6236a.3483.3483 0 0 0 0-.5346z',
    
    // Default file
    file: 'M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0zM9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1z',
    
    // Folder (closed)
    folder: 'M.54 3.87L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h4.672a2 2 0 0 1 2 2l-.04.87a1.99 1.99 0 0 1-.342 1.311l-1.446 2.169a1 1 0 0 0-.168.556v3.294a2 2 0 0 1-2 2H2.5a2 2 0 0 1-2-2v-8.5a2 2 0 0 1 1.96-2z',
    
    // Folder (open)
    folderOpen: 'M.54 3.87L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h4.672a2 2 0 0 1 2 2v2H8.5a1 1 0 0 0-.832.445L6.5 9H2.5V4a1 1 0 0 1 1-1h3.086a.5.5 0 0 0 .353-.146L7.646 2.146A.5.5 0 0 1 8 2h4.672a1 1 0 0 1 1 1v1.5H8.5a2 2 0 0 0-1.664.89L5.5 7H1V4.5a2 2 0 0 1 1.96-2z'
  };

  const iconPath = materialIcons[iconName] || materialIcons['file'];
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d={iconPath} />
    </svg>
  );
};

// Enhanced file type detection with Material Icon Theme mapping
const getFileIconConfig = (fileName: string, isDirectory = false): { iconName: string; color: string } => {
  if (isDirectory) {
    return {
      iconName: 'folder',
      color: '#DCAA3C' // Material folder yellow
    };
  }

  const baseName = fileName.toLowerCase();
  const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';

  // Special file mappings (exact matches)
  const specialFiles: Record<string, { iconName: string; color: string }> = {
    'package.json': { iconName: 'json', color: '#e8274b' },
    'package-lock.json': { iconName: 'json', color: '#e8274b' },
    'tsconfig.json': { iconName: 'typescript', color: '#007acc' },
    'jsconfig.json': { iconName: 'javascript', color: '#f1dd35' },
    'webpack.config.js': { iconName: 'javascript', color: '#8ed6fb' },
    'babel.config.js': { iconName: 'javascript', color: '#f9dc3e' },
    'dockerfile': { iconName: 'file', color: '#0db7ed' },
    'readme.md': { iconName: 'file', color: '#519aba' },
    'license': { iconName: 'file', color: '#d4ac0d' },
    'changelog.md': { iconName: 'file', color: '#87ceeb' },
    '.gitignore': { iconName: 'file', color: '#f14c28' },
    '.gitattributes': { iconName: 'file', color: '#f14c28' },
    '.env': { iconName: 'file', color: '#edc545' },
    '.env.local': { iconName: 'file', color: '#edc545' },
    '.env.development': { iconName: 'file', color: '#edc545' },
    '.env.production': { iconName: 'file', color: '#edc545' },
  };

  if (specialFiles[baseName]) {
    return specialFiles[baseName];
  }

  // Extension-based mappings
  const extensionMap: Record<string, { iconName: string; color: string }> = {
    // JavaScript ecosystem
    'js': { iconName: 'javascript', color: '#f1dd35' },
    'mjs': { iconName: 'javascript', color: '#f1dd35' },
    'cjs': { iconName: 'javascript', color: '#f1dd35' },
    
    // TypeScript
    'ts': { iconName: 'typescript', color: '#007acc' },
    'tsx': { iconName: 'react', color: '#61dafb' },
    'jsx': { iconName: 'react', color: '#61dafb' },
    
    // Web languages
    'html': { iconName: 'html', color: '#e34c26' },
    'htm': { iconName: 'html', color: '#e34c26' },
    'css': { iconName: 'css', color: '#1572b6' },
    'scss': { iconName: 'css', color: '#cf649a' },
    'sass': { iconName: 'css', color: '#cf649a' },
    'less': { iconName: 'css', color: '#1d365d' },
    'stylus': { iconName: 'css', color: '#ff6347' },
    
    // Data formats
    'json': { iconName: 'json', color: '#cbcb41' },
    'json5': { iconName: 'json', color: '#cbcb41' },
    'jsonc': { iconName: 'json', color: '#cbcb41' },
    'yaml': { iconName: 'file', color: '#cb171e' },
    'yml': { iconName: 'file', color: '#cb171e' },
    'toml': { iconName: 'file', color: '#9c4221' },
    'xml': { iconName: 'file', color: '#ff6600' },
    
    // Programming languages
    'py': { iconName: 'python', color: '#3776ab' },
    'pyc': { iconName: 'python', color: '#3776ab' },
    'pyo': { iconName: 'python', color: '#3776ab' },
    'pyw': { iconName: 'python', color: '#3776ab' },
    'rs': { iconName: 'rust', color: '#ce422b' },
    'go': { iconName: 'file', color: '#00add8' },
    'java': { iconName: 'file', color: '#ed8b00' },
    'kt': { iconName: 'file', color: '#7f52ff' },
    'swift': { iconName: 'file', color: '#fa7343' },
    'rb': { iconName: 'file', color: '#cc342d' },
    'php': { iconName: 'file', color: '#777bb4' },
    'cpp': { iconName: 'file', color: '#f34b7d' },
    'c': { iconName: 'file', color: '#555555' },
    'h': { iconName: 'file', color: '#a074c4' },
    'cs': { iconName: 'file', color: '#239120' },
    
    // Frameworks
    'vue': { iconName: 'file', color: '#4fc08d' },
    'svelte': { iconName: 'file', color: '#ff3e00' },
    
    // Documentation
    'md': { iconName: 'file', color: '#519aba' },
    'mdx': { iconName: 'file', color: '#519aba' },
    'markdown': { iconName: 'file', color: '#519aba' },
    'txt': { iconName: 'file', color: '#6d8086' },
    'rst': { iconName: 'file', color: '#6d8086' },
    
    // Images
    'png': { iconName: 'file', color: '#a074c4' },
    'jpg': { iconName: 'file', color: '#a074c4' },
    'jpeg': { iconName: 'file', color: '#a074c4' },
    'gif': { iconName: 'file', color: '#a074c4' },
    'svg': { iconName: 'file', color: '#ff6600' },
    'webp': { iconName: 'file', color: '#a074c4' },
    'ico': { iconName: 'file', color: '#a074c4' },
    'bmp': { iconName: 'file', color: '#a074c4' },
    
    // Audio/Video
    'mp3': { iconName: 'file', color: '#ff6b6b' },
    'wav': { iconName: 'file', color: '#ff6b6b' },
    'mp4': { iconName: 'file', color: '#ff6b6b' },
    'avi': { iconName: 'file', color: '#ff6b6b' },
    'mov': { iconName: 'file', color: '#ff6b6b' },
    
    // Archives
    'zip': { iconName: 'file', color: '#f39c12' },
    'rar': { iconName: 'file', color: '#f39c12' },
    '7z': { iconName: 'file', color: '#f39c12' },
    'tar': { iconName: 'file', color: '#f39c12' },
    'gz': { iconName: 'file', color: '#f39c12' },
    
    // Config files
    'conf': { iconName: 'file', color: '#6d8086' },
    'config': { iconName: 'file', color: '#6d8086' },
    'ini': { iconName: 'file', color: '#6d8086' },
    'cfg': { iconName: 'file', color: '#6d8086' },
    'properties': { iconName: 'file', color: '#6d8086' },
    
    // Shell scripts
    'sh': { iconName: 'file', color: '#89e051' },
    'bash': { iconName: 'file', color: '#89e051' },
    'zsh': { iconName: 'file', color: '#89e051' },
    'fish': { iconName: 'file', color: '#89e051' },
    'ps1': { iconName: 'file', color: '#012456' },
    'bat': { iconName: 'file', color: '#c1f12e' },
    'cmd': { iconName: 'file', color: '#c1f12e' },
  };

  return extensionMap[extension || ''] || { iconName: 'file', color: '#6d8086' };
};

export const FileIcon: React.FC<FileIconProps> = ({
  fileName,
  isDirectory = false,
  isOpen = false,
  size = 16,
  className = ''
}) => {
  const { iconName, color } = useMemo(() => {
    if (isDirectory) {
      return {
        iconName: isOpen ? 'folderOpen' : 'folder',
        color: isOpen ? '#DCAA3C' : '#DCAA3C'
      };
    }
    return getFileIconConfig(fileName);
  }, [fileName, isDirectory, isOpen]);

  return (
    <div 
      className={`file-icon ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        userSelect: 'none'
      }}
      title={fileName}
    >
      <MaterialIcon
        iconName={iconName}
        color={color}
        size={size}
        className="material-icon"
      />
    </div>
  );
};

export default FileIcon; 