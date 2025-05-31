// Syntari AI IDE - Editor Utility Functions
// Extracted from CodeEditor.tsx for better maintainability

import { LANGUAGE_MAP, FILE_ICONS } from '../constants/editorConfig';

export const getLanguageFromExtension = (extension: string): string => {
  return LANGUAGE_MAP[extension] || 'plaintext';
};

export const getFileIcon = (extension: string): string => {
  return FILE_ICONS[extension] || '📄';
}; 