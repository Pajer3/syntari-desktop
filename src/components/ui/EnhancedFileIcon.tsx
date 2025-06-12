// Syntari AI IDE - Enhanced File Icon Component
// Utilizes 1000+ SVG assets from the assets folder

import React, { useMemo } from 'react';
import { useFileIcon } from '../../hooks/useFileIcon';

interface EnhancedFileIconProps {
  fileName: string;
  isDirectory?: boolean;
  isOpen?: boolean;
  size?: number;
  className?: string;
  preferLightIcons?: boolean;
  onError?: (filename: string, error: Error) => void;
}

/**
 * Enhanced File Icon Component
 * Uses the comprehensive SVG asset collection with intelligent fallbacks
 */
export const EnhancedFileIcon: React.FC<EnhancedFileIconProps> = ({
  fileName,
  isDirectory = false,
  isOpen = false,
  size = 16,
  className = '',
  preferLightIcons = false,
  onError
}) => {
  const { iconFilename, iconPath, iconType, isDefault } = useFileIcon({
    filename: fileName,
    isDirectory,
    isOpen,
    preferLightIcons
  });

  const svgUrl = useMemo(() => {
    // Import the SVG dynamically based on the icon filename
    try {
      // Vite-specific asset import
      return new URL(`../../assets/${iconFilename}`, import.meta.url).href;
    } catch (error) {
      console.warn(`Failed to load icon for ${fileName}:`, error);
      onError?.(fileName, error as Error);
      // Fallback to default file icon
      return new URL(`../../assets/default_file.svg`, import.meta.url).href;
    }
  }, [iconFilename, fileName, onError]);

  const iconStyle = useMemo(() => ({
    width: `${size}px`,
    height: `${size}px`,
    display: 'inline-block',
    userSelect: 'none' as const,
    verticalAlign: 'middle',
    flexShrink: 0
  }), [size]);

  return (
    <div
      className={`enhanced-file-icon ${className} ${iconType} ${isDefault ? 'is-default' : 'is-specific'}`}
      style={iconStyle}
      title={`${fileName} (${iconType})`}
      data-file-type={iconType}
      data-extension={fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : 'none'}
    >
      <img
        src={svgUrl}
        alt={`${isDirectory ? 'Folder' : 'File'}: ${fileName}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none'
        }}
        onError={(e) => {
          console.warn(`Failed to load SVG icon: ${iconFilename}`);
          // Fallback to a basic file icon using Material Design
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          // You could implement a fallback rendering here
        }}
        draggable={false}
      />
    </div>
  );
};

/**
 * Optimized File Icon with SVG inlining for better performance
 * Useful when rendering many icons at once (like in file lists)
 */
export const InlineFileIcon: React.FC<EnhancedFileIconProps> = ({
  fileName,
  isDirectory = false,
  isOpen = false,
  size = 16,
  className = '',
  preferLightIcons = false
}) => {
  const { iconFilename, iconType, isDefault } = useFileIcon({
    filename: fileName,
    isDirectory,
    isOpen,
    preferLightIcons
  });

  // For performance-critical scenarios, you could implement SVG inlining here
  // This would require build-time processing or a dynamic import system
  
  return (
    <EnhancedFileIcon
      fileName={fileName}
      isDirectory={isDirectory}
      isOpen={isOpen}
      size={size}
      className={`inline-file-icon ${className}`}
      preferLightIcons={preferLightIcons}
    />
  );
};

/**
 * File Icon with Loading State
 * Shows a placeholder while the icon loads
 */
export const FileIconWithLoading: React.FC<EnhancedFileIconProps & {
  showLoadingPlaceholder?: boolean;
}> = ({
  showLoadingPlaceholder = true,
  ...props
}) => {
  const [isLoading, setIsLoading] = React.useState(showLoadingPlaceholder);
  const [hasError, setHasError] = React.useState(false);

  const handleError = (filename: string, error: Error) => {
    setHasError(true);
    setIsLoading(false);
    props.onError?.(filename, error);
  };

  const iconStyle = {
    width: `${props.size || 16}px`,
    height: `${props.size || 16}px`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  if (hasError) {
    return (
      <div style={iconStyle} className={`file-icon-error ${props.className}`}>
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#f0f0f0',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            color: '#666'
          }}
        >
          ?
        </div>
      </div>
    );
  }

  if (isLoading && showLoadingPlaceholder) {
    return (
      <div style={iconStyle} className={`file-icon-loading ${props.className}`}>
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '2px'
          }}
        />
      </div>
    );
  }

  return (
    <EnhancedFileIcon
      {...props}
      onError={handleError}
      className={`file-icon-loaded ${props.className}`}
    />
  );
};

// Export the enhanced version as the default
export default EnhancedFileIcon;

// CSS animations (should be added to a CSS file)
export const FileIconStyles = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.enhanced-file-icon {
  transition: transform 0.1s ease;
}

.enhanced-file-icon:hover {
  transform: scale(1.05);
}

.enhanced-file-icon.is-default {
  opacity: 0.8;
}

.enhanced-file-icon.is-specific {
  opacity: 1;
}

.enhanced-file-icon.directory {
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
}

.enhanced-file-icon.file {
  filter: drop-shadow(0 0.5px 1px rgba(0,0,0,0.1));
}
`; 