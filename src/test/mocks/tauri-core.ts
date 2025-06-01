// Tauri Core API Mocks for Testing
import { vi } from 'vitest';

export const invoke = vi.fn().mockImplementation((command: string, _args?: any) => {
  // Default successful responses for common commands
  switch (command) {
    case 'initialize_app':
      return Promise.resolve({
        success: true,
        data: { status: 'initialized' },
        message: 'App initialized successfully',
      });
      
    case 'scan_everything_clean':
      return Promise.resolve({
        success: true,
        data: [
          {
            path: '/test/file1.txt',
            name: 'file1.txt',
            depth: 0,
            size: 1024,
            last_modified: Date.now() / 1000,
            extension: 'txt',
            is_directory: false,
          },
          {
            path: '/test/directory',
            name: 'directory',
            depth: 0,
            size: 0,
            last_modified: Date.now() / 1000,
            extension: '',
            is_directory: true,
          },
        ],
        message: 'Scan completed',
      });
      
    case 'read_file':
      return Promise.resolve({
        success: true,
        data: 'Mock file content',
        message: 'File read successfully',
      });
      
    case 'save_file':
      return Promise.resolve({
        success: true,
        data: 'File saved',
        message: 'File saved successfully',
      });
      
    case 'get_ai_providers':
      return Promise.resolve({
        success: true,
        data: ['gpt-4', 'claude-3', 'gemini-pro'],
        message: 'Providers retrieved',
      });
      
    case 'generate_ai_response':
      return Promise.resolve({
        success: true,
        data: {
          content: 'Mock AI response',
          provider: 'gpt-4',
          cost: 0.001,
        },
        message: 'Response generated',
      });
      
    case 'create_chat_session':
      return Promise.resolve({
        success: true,
        data: {
          id: 'mock-session-id',
          name: 'Test Session',
          created_at: new Date().toISOString(),
        },
        message: 'Session created',
      });
      
    default:
      return Promise.resolve({
        success: true,
        data: null,
        message: `Mock response for ${command}`,
      });
  }
});

// Helper to mock specific command responses
export const mockInvokeResponse = (command: string, response: any) => {
  invoke.mockImplementation((cmd: string, _args?: any) => {
    if (cmd === command) {
      return Promise.resolve(response);
    }
    return invoke(cmd, _args);
  });
};

// Helper to mock command errors
export const mockInvokeError = (command: string, error: string) => {
  invoke.mockImplementation((cmd: string, _args?: any) => {
    if (cmd === command) {
      return Promise.reject(new Error(error));
    }
    return invoke(cmd, _args);
  });
};

// Reset all mocks
export const resetInvokeMocks = () => {
  invoke.mockClear();
}; 