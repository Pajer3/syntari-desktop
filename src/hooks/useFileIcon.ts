// Syntari AI IDE - React Hook for File Icons
// Provides easy integration with the file icon mapping system

import { useMemo } from 'react';
import { getFileIcon, getIconPath, hasSpecificIcon, FALLBACK_ICONS } from '../config/fileIconMap';

export interface UseFileIconOptions {
  filename: string;
  isDirectory?: boolean;
  isOpen?: boolean;
  preferLightIcons?: boolean;
}

export interface FileIconResult {
  iconFilename: string;
  iconPath: string;
  hasSpecificIcon: boolean;
  isDefault: boolean;
  iconType: 'file' | 'directory' | 'specific';
}

/**
 * React hook for getting appropriate file icons
 * @param options - Configuration for the file icon
 * @returns Icon information and paths
 */
export function useFileIcon(options: UseFileIconOptions): FileIconResult {
  const { filename, isDirectory = false, isOpen = false, preferLightIcons = false } = options;

  return useMemo(() => {
    let iconFilename = getFileIcon(filename, isDirectory, isOpen);
    
    // Handle light icon preference
    if (preferLightIcons && iconFilename.startsWith('file_type_')) {
      const lightVersion = iconFilename.replace('file_type_', 'file_type_light_');
      // You could add logic here to check if the light version exists
      // For now, we'll use the regular version as fallback
    }

    const iconPath = getIconPath(iconFilename);
    
    // Determine if this is a specific icon or fallback
    const extension = filename.includes('.') 
      ? filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()
      : '';
    
    const hasSpecific = hasSpecificIcon(extension) || hasSpecificIcon(filename.toLowerCase());
    const isDefault = iconFilename === FALLBACK_ICONS.default;
    
    let iconType: 'file' | 'directory' | 'specific' = 'file';
    if (isDirectory) {
      iconType = 'directory';
    } else if (hasSpecific) {
      iconType = 'specific';
    }

    return {
      iconFilename,
      iconPath,
      hasSpecificIcon: hasSpecific,
      isDefault,
      iconType
    };
  }, [filename, isDirectory, isOpen, preferLightIcons]);
}

/**
 * Hook for getting multiple file icons at once (useful for file lists)
 * @param files - Array of file information
 * @returns Array of icon results
 */
export function useFileIcons(files: Array<{
  filename: string;
  isDirectory?: boolean;
  isOpen?: boolean;
}>): FileIconResult[] {
  return useMemo(() => {
    return files.map(file => {
      const iconFilename = getFileIcon(file.filename, file.isDirectory, file.isOpen);
      const iconPath = getIconPath(iconFilename);
      
      const extension = file.filename.includes('.') 
        ? file.filename.substring(file.filename.lastIndexOf('.') + 1).toLowerCase()
        : '';
      
      const hasSpecific = hasSpecificIcon(extension) || hasSpecificIcon(file.filename.toLowerCase());
      const isDefault = iconFilename === FALLBACK_ICONS.default;
      
      let iconType: 'file' | 'directory' | 'specific' = 'file';
      if (file.isDirectory) {
        iconType = 'directory';
      } else if (hasSpecific) {
        iconType = 'specific';
      }

      return {
        iconFilename,
        iconPath,
        hasSpecificIcon: hasSpecific,
        isDefault,
        iconType
      };
    });
  }, [files]);
}

/**
 * Get icon statistics for debugging/analytics
 * @param files - Array of filenames to analyze
 * @returns Statistics about icon usage
 */
export function useIconStats(files: string[]) {
  return useMemo(() => {
    const stats = {
      total: files.length,
      withSpecificIcons: 0,
      usingDefaults: 0,
      byType: {} as Record<string, number>
    };

    files.forEach(filename => {
      const iconFilename = getFileIcon(filename, false, false);
      const extension = filename.includes('.') 
        ? filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()
        : 'no-extension';
      
      if (hasSpecificIcon(extension) || hasSpecificIcon(filename.toLowerCase())) {
        stats.withSpecificIcons++;
      }
      
      if (iconFilename === FALLBACK_ICONS.default) {
        stats.usingDefaults++;
      }
      
      stats.byType[extension] = (stats.byType[extension] || 0) + 1;
    });

    return stats;
  }, [files]);
} 