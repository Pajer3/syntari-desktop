// Centralized Logging System - Structured Logging with Levels
import { configManager } from '../config/app.config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stack?: string;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredEntries: number;
}

class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  
  constructor(config: Partial<LoggerConfig> = {}) {
    const appConfig = configManager.get();
    
    this.config = {
      minLevel: appConfig.dev.enableDetailedLogging ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStorage: appConfig.dev.enableDetailedLogging,
      maxStoredEntries: 1000,
      ...config,
    };
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }
  
  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString().slice(11, 23); // HH:MM:SS.mmm
    const levelName = LogLevel[entry.level].padEnd(5);
    return `[${timestamp}] ${levelName} [${entry.category}] ${entry.message}`;
  }
  
  private log(level: LogLevel, category: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      stack: level === LogLevel.ERROR ? new Error().stack : undefined,
    };
    
    // Console output
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(entry);
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage, data);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, data);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, data);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, data);
          break;
      }
    }
    
    // Storage
    if (this.config.enableStorage) {
      this.entries.push(entry);
      
      // Keep only recent entries
      if (this.entries.length > this.config.maxStoredEntries) {
        this.entries = this.entries.slice(-this.config.maxStoredEntries);
      }
    }
  }
  
  // Public logging methods
  debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }
  
  info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }
  
  warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }
  
  error(category: string, message: string, error?: Error | any): void {
    let data = error;
    let message_with_error = message;
    
    if (error instanceof Error) {
      message_with_error = `${message}: ${error.message}`;
      data = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    
    this.log(LogLevel.ERROR, category, message_with_error, data);
  }
  
  // Performance logging
  time(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label);
    }
  }
  
  timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label);
    }
  }
  
  // Retrieve stored logs
  getLogs(filter?: { 
    level?: LogLevel; 
    category?: string; 
    since?: Date; 
  }): LogEntry[] {
    let filtered = this.entries;
    
    if (filter) {
      if (filter.level !== undefined) {
        filtered = filtered.filter(entry => entry.level >= filter.level!);
      }
      
      if (filter.category) {
        filtered = filtered.filter(entry => 
          entry.category.toLowerCase().includes(filter.category!.toLowerCase())
        );
      }
      
      if (filter.since) {
        filtered = filtered.filter(entry => entry.timestamp >= filter.since!);
      }
    }
    
    return filtered;
  }
  
  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.entries, null, 2);
  }
  
  // Clear stored logs
  clearLogs(): void {
    this.entries = [];
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Category-specific loggers for convenience
export const createCategoryLogger = (category: string) => ({
  debug: (message: string, data?: any) => logger.debug(category, message, data),
  info: (message: string, data?: any) => logger.info(category, message, data),
  warn: (message: string, data?: any) => logger.warn(category, message, data),
  error: (message: string, error?: Error | any) => logger.error(category, message, error),
  time: (label: string) => logger.time(`${category}:${label}`),
  timeEnd: (label: string) => logger.timeEnd(`${category}:${label}`),
});

// Pre-defined category loggers
export const appLogger = createCategoryLogger('App');
export const scannerLogger = createCategoryLogger('Scanner');
export const aiLogger = createCategoryLogger('AI');
export const uiLogger = createCategoryLogger('UI');
export const chatLogger = createCategoryLogger('Chat');

// Performance utilities
export const withPerformanceLogging = <T extends (...args: any[]) => any>(
  fn: T,
  category: string,
  label?: string
): T => {
  return ((...args: any[]) => {
    const perfLabel = label || `${category}:${fn.name}`;
    logger.time(perfLabel);
    
    try {
      const result = fn(...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.finally(() => logger.timeEnd(perfLabel));
      }
      
      logger.timeEnd(perfLabel);
      return result;
    } catch (error) {
      logger.timeEnd(perfLabel);
      logger.error(category, `Function ${fn.name} failed`, error);
      throw error;
    }
  }) as T;
}; 