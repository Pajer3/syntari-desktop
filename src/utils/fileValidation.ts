// Syntari AI IDE - File Validation Utilities
// Cross-platform file name validation based on VS Code's implementation

export interface ValidationResult {
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validates a file name according to file system rules and best practices
 * Based on VS Code's file validation logic
 */
export function validateFileName(fileName: string): ValidationResult | null {
  if (!fileName) {
    return {
      message: 'A file name must be provided.',
      severity: 'error'
    };
  }

  // Trim and check for empty/whitespace-only names
  const trimmed = fileName.trim();
  if (!trimmed || /^\s+$/.test(fileName)) {
    return {
      message: 'A file name must be provided.',
      severity: 'error'
    };
  }

  // Check for leading/trailing spaces
  if (fileName.startsWith(' ') || fileName.endsWith(' ')) {
    return {
      message: 'Leading or trailing whitespace detected in file name.',
      severity: 'warning'
    };
  }

  // Check for absolute paths
  if (fileName.startsWith('/') || fileName.startsWith('\\')) {
    return {
      message: 'A file name cannot start with a slash.',
      severity: 'error'
    };
  }

  // Check for path separators in the middle (multi-level creation)
  if (fileName.includes('/') || fileName.includes('\\')) {
    // Allow this but warn about directory creation
    return {
      message: 'File name contains path separators. Directories will be created if they don\'t exist.',
      severity: 'warning'
    };
  }

  // Platform-specific invalid characters
  const invalidChars = getInvalidCharacters();
  const foundInvalidChars = invalidChars.filter(char => fileName.includes(char));
  
  if (foundInvalidChars.length > 0) {
    return {
      message: `File name contains invalid characters: ${foundInvalidChars.join(', ')}`,
      severity: 'error'
    };
  }

  // Reserved names (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  const nameWithoutExt = fileName.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    return {
      message: `"${nameWithoutExt}" is a reserved system name and cannot be used.`,
      severity: 'error'
    };
  }

  // Check file name length
  if (fileName.length > 255) {
    return {
      message: 'File name is too long. Maximum length is 255 characters.',
      severity: 'error'
    };
  }

  // Check for names ending with dots or spaces (Windows restriction)
  if (fileName.endsWith('.') || fileName.endsWith(' ')) {
    return {
      message: 'File name cannot end with a dot or space.',
      severity: 'error'
    };
  }

  // Check for potentially problematic patterns
  if (fileName.startsWith('.') && fileName.length === 1) {
    return {
      message: 'File name cannot be just a dot.',
      severity: 'error'
    };
  }

  if (fileName === '..') {
    return {
      message: 'File name cannot be "..".',
      severity: 'error'
    };
  }

  // Check for excessive dots
  if (fileName.startsWith('...')) {
    return {
      message: 'File name should not start with multiple dots.',
      severity: 'warning'
    };
  }

  // Check for control characters
  const controlCharPattern = /[\x00-\x1f\x7f]/;
  if (controlCharPattern.test(fileName)) {
    return {
      message: 'File name contains control characters.',
      severity: 'error'
    };
  }

  // Check for very long extensions
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex > 0) {
    const extension = fileName.substring(lastDotIndex + 1);
    if (extension.length > 20) {
      return {
        message: 'File extension is unusually long.',
        severity: 'warning'
      };
    }
  }

  return null; // Valid file name
}

/**
 * Gets platform-specific invalid characters for file names
 */
function getInvalidCharacters(): string[] {
  // Windows has the most restrictive set, so we use these for cross-platform compatibility
  return ['<', '>', ':', '"', '|', '?', '*'];
}

/**
 * Sanitizes a file name by removing or replacing invalid characters
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'untitled';

  let sanitized = fileName.trim();
  
  // Replace invalid characters with underscores
  const invalidChars = getInvalidCharacters();
  invalidChars.forEach(char => {
    sanitized = sanitized.replace(new RegExp(`\\${char}`, 'g'), '_');
  });

  // Replace path separators
  sanitized = sanitized.replace(/[/\\]/g, '_');
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
  
  // Handle reserved names
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  const nameWithoutExt = sanitized.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    sanitized = `file_${sanitized}`;
  }

  // Remove trailing dots and spaces
  sanitized = sanitized.replace(/[. ]+$/, '');
  
  // Ensure not empty
  if (!sanitized) {
    sanitized = 'untitled';
  }

  // Truncate if too long
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  return sanitized;
}

/**
 * Suggests a better file name if the current one has issues
 */
export function suggestFileName(fileName: string): string {
  const validation = validateFileName(fileName);
  
  if (!validation || validation.severity === 'warning') {
    return fileName;
  }

  return sanitizeFileName(fileName);
}

/**
 * Checks if a file name is valid for the current platform
 */
export function isValidFileName(fileName: string): boolean {
  const validation = validateFileName(fileName);
  return !validation || validation.severity !== 'error';
} 