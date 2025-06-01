// Test Setup - Vitest Configuration and Global Test Utilities
import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, expect } from 'vitest';

// Mock Tauri APIs globally
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

// Mock ResizeObserver (used by some UI components)
(globalThis as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver (used by virtual scrolling)
(globalThis as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock console methods for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' && 
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
export const TEST_TIMEOUT = 5000;

// Mock data for tests
export const mockFileInfo = {
  path: '/test/file.txt',
  name: 'file.txt',
  depth: 1,
  size: 1024,
  last_modified: Date.now() / 1000,
  extension: 'txt',
  is_directory: false,
};

export const mockDirectoryInfo = {
  path: '/test/directory',
  name: 'directory',
  depth: 0,
  size: 0,
  last_modified: Date.now() / 1000,
  extension: '',
  is_directory: true,
};

export const mockChatMessage = {
  id: 'test-message-1',
  type: 'user' as const,
  content: 'Test message',
  timestamp: new Date(),
  metadata: {
    provider: 'test-provider',
    cost: 0.001,
  },
};

// Helper for async testing
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for testing error states
export const expectError = async (fn: () => Promise<any>, expectedMessage?: string) => {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (expectedMessage) {
      expect(error).toHaveProperty('message', expectedMessage);
    }
    return error;
  }
}; 