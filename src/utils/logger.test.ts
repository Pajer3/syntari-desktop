import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, LogLevel, createCategoryLogger, withPerformanceLogging } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logger.clearLogs();
    
    // Mock console methods for each test
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'time').mockImplementation(() => {});
    vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
  });

  describe('basic logging', () => {
    it('logs debug messages', () => {
      logger.debug('test', 'debug message', { data: 'test' });
      
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('[test] debug message'),
        { data: 'test' }
      );
    });

    it('logs info messages', () => {
      logger.info('test', 'info message');
      
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[test] info message'),
        undefined
      );
    });

    it('logs warning messages', () => {
      logger.warn('test', 'warning message');
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[test] warning message'),
        undefined
      );
    });

    it('logs error messages', () => {
      const error = new Error('test error');
      logger.error('test', 'error occurred', error);
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[test] error occurred: test error'),
        expect.objectContaining({
          name: 'Error',
          message: 'test error',
          stack: expect.any(String),
        })
      );
    });
  });

  describe('category logger', () => {
    it('creates category-specific logger', () => {
      const categoryLogger = createCategoryLogger('TestCategory');
      
      categoryLogger.info('test message');
      
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestCategory] test message'),
        undefined
      );
    });
  });

  describe('performance logging', () => {
    it('wraps function with performance logging using explicit label', () => {
      const testFn = vi.fn().mockReturnValue('result');
      const wrappedFn = withPerformanceLogging(testFn, 'TestCategory', 'testFunction');
      
      const result = wrappedFn('arg1', 'arg2');
      
      expect(testFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('result');
      expect(console.time).toHaveBeenCalledWith('testFunction');
      expect(console.timeEnd).toHaveBeenCalledWith('testFunction');
    });

    it('wraps function with performance logging using function name', () => {
      function namedTestFunction() {
        return 'result';
      }
      const testFn = vi.fn(namedTestFunction);
      const wrappedFn = withPerformanceLogging(testFn, 'TestCategory');
      
      const result = wrappedFn();
      
      expect(result).toBe('result');
      expect(console.time).toHaveBeenCalledWith('TestCategory:namedTestFunction');
      expect(console.timeEnd).toHaveBeenCalledWith('TestCategory:namedTestFunction');
    });

    it('handles async functions', async () => {
      const asyncFn = vi.fn().mockResolvedValue('async result');
      const wrappedFn = withPerformanceLogging(asyncFn, 'TestCategory');
      
      const result = await wrappedFn();
      
      expect(result).toBe('async result');
      expect(console.timeEnd).toHaveBeenCalled();
    });
  });

  describe('log storage and retrieval', () => {
    it('stores logs when storage is enabled', () => {
      logger.info('test', 'stored message');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: LogLevel.INFO,
        category: 'test',
        message: 'stored message',
      });
    });

    it('filters logs by level', () => {
      logger.debug('test', 'debug message');
      logger.info('test', 'info message');
      logger.warn('test', 'warn message');
      logger.error('test', 'error message');
      
      const errorLogs = logger.getLogs({ level: LogLevel.ERROR });
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe(LogLevel.ERROR);
    });

    it('filters logs by category', () => {
      logger.info('category1', 'message 1');
      logger.info('category2', 'message 2');
      logger.info('category1', 'message 3');
      
      const category1Logs = logger.getLogs({ category: 'category1' });
      expect(category1Logs).toHaveLength(2);
    });
  });
}); 