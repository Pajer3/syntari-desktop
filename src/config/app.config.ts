// Application Configuration - Centralized Settings Management
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useCallback } from 'react';

export interface AppConfig {
  ai: {
    defaultProvider: string;
    maxTokens: number;
    temperature: number;
    cacheEnabled: boolean;
    costLimitPerDay: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: number;
    fontFamily: string;
    sidebarWidth: number;
    terminalHeight: number;
    animationsEnabled: boolean;
    maxFileSize: number;
    defaultChunkSize: number;
    maxDepth: number;
  };
  scanner: {
    maxFileSize: number;
    chunkSize: number;
    maxDepth: number;
    excludePatterns: string[];
    includePatterns: string[];
  };
  terminal: {
    shell: string;
    maxHistory: number;
    scrollback: number;
    defaultWorkingDirectory: string;
  };
  dev: {
    enableDevTools: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    openDevToolsOnStart: boolean;
  };
}

const defaultConfig: AppConfig = {
  ai: {
    defaultProvider: 'gemini-pro',
    maxTokens: 4096,
    temperature: 0.7,
    cacheEnabled: true,
    costLimitPerDay: 5.00,
  },
  ui: {
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'JetBrains Mono, monospace',
    sidebarWidth: 250,
    terminalHeight: 300,
    animationsEnabled: true,
    maxFileSize: 1024 * 1024 * 10, // 10MB
    defaultChunkSize: 1024 * 8, // 8KB
    maxDepth: 5,
  },
  scanner: {
    maxFileSize: 1024 * 1024, // 1MB
    chunkSize: 1024 * 4, // 4KB
    maxDepth: 5,
    excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next'],
    includePatterns: ['*.ts', '*.tsx', '*.js', '*.jsx', '*.vue', '*.svelte'],
  },
  terminal: {
    shell: process.platform === 'win32' ? 'powershell' : 'bash',
    maxHistory: 1000,
    scrollback: 1000,
    defaultWorkingDirectory: '~',
  },
  dev: {
    enableDevTools: false,
    logLevel: 'info',
    openDevToolsOnStart: false,
  },
};

class ConfigManagerClass {
  private config: AppConfig;
  private userOverrides: Partial<AppConfig> = {};
  private listeners: Array<(config: AppConfig) => void> = [];

  constructor() {
    this.config = { ...defaultConfig };
    this.loadUserPreferences();
  }

  private async loadUserPreferences(): Promise<void> {
    try {
      const saved = localStorage.getItem('syntari-config');
      if (saved) {
        this.userOverrides = JSON.parse(saved);
        this.mergeConfig();
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  private mergeConfig(): void {
    this.config = this.deepMerge(defaultConfig, this.userOverrides);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.userOverrides = this.deepMerge(this.userOverrides, updates);
    this.mergeConfig();
    this.saveUserPreferences();
    this.notifyListeners();
  }

  resetToDefaults(): void {
    this.userOverrides = {};
    this.config = { ...defaultConfig };
    this.saveUserPreferences();
    this.notifyListeners();
  }

  // Environment-specific optimizations
  applyEnvironmentOptimizations(): void {
    const overrides: Partial<AppConfig> = {};

    // Memory optimization for low-memory environments
    const deviceMemory = (navigator as any).deviceMemory;
    if (deviceMemory && deviceMemory < 4) {
      const maxFileSize = 1024 * 1024 * 2; // 2MB
      const chunkSize = 1024 * 2; // 2KB
      const maxDepth = 3;

      overrides.scanner = { ...this.config.scanner, maxFileSize };
      overrides.ui = { ...this.config.ui, maxFileSize };
      overrides.scanner = { ...this.config.scanner, chunkSize };
      overrides.ui = { ...this.config.ui, defaultChunkSize: chunkSize };
      overrides.scanner = { ...this.config.scanner, maxDepth };
      overrides.ui = { ...this.config.ui, maxDepth };
    }

    // Performance optimization for older devices
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      overrides.ui = { ...this.config.ui, animationsEnabled: false };
    }

    // Environment variable overrides
    if (import.meta.env.VITE_AI_PROVIDER) {
      overrides.ai = { ...this.config.ai, defaultProvider: import.meta.env.VITE_AI_PROVIDER };
    }

    if (import.meta.env.MODE === 'development') {
      overrides.dev = { ...this.config.dev, openDevToolsOnStart: true };
    }

    if (Object.keys(overrides).length > 0) {
      this.updateConfig(overrides);
    }
  }

  // Live configuration updates without restart
  async syncWithBackend(): Promise<void> {
    try {
      const backendConfig = await invoke<Partial<AppConfig>>('get_config');
      if (backendConfig) {
        this.userOverrides = { ...this.userOverrides, ...backendConfig };
        this.mergeConfig();
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('Failed to sync with backend config:', error);
    }
  }

  async saveToBackend(): Promise<void> {
    try {
      await invoke('save_config', { config: this.userOverrides });
    } catch (error) {
      console.warn('Failed to save to backend:', error);
    }
  }

  exportConfig(): string {
    return JSON.stringify(this.userOverrides, null, 2);
  }

  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      this.updateConfig(imported);
      return true;
    } catch (error) {
      console.error('Invalid config format:', error);
      return false;
    }
  }

  validateConfig(config: Partial<AppConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.ai?.maxTokens && (config.ai.maxTokens < 1 || config.ai.maxTokens > 32000)) {
      errors.push('AI maxTokens must be between 1 and 32000');
    }

    if (config.ui?.fontSize && (config.ui.fontSize < 8 || config.ui.fontSize > 32)) {
      errors.push('UI fontSize must be between 8 and 32');
    }

    if (config.ai?.temperature && (config.ai.temperature < 0 || config.ai.temperature > 2)) {
      errors.push('AI temperature must be between 0 and 2');
    }

    return { valid: errors.length === 0, errors };
  }

  // Configuration change listeners for reactive updates
  addListener(listener: (config: AppConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Config listener error:', error);
      }
    });
  }

  private saveUserPreferences(): void {
    try {
      localStorage.setItem('syntari-config', JSON.stringify(this.userOverrides));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }

  // Getters for specific config sections
  getAiConfig() { return this.config.ai; }
  getUiConfig() { return this.config.ui; }
  getScannerConfig() { return this.config.scanner; }
  getTerminalConfig() { return this.config.terminal; }
  getDevConfig() { return this.config.dev; }
}

// React hook for configuration management
export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(configManager.getConfig());

  useEffect(() => {
    const unsubscribe = configManager.addListener(setConfig);
    return unsubscribe;
  }, []);

  const updateConfig = useCallback((updates: Partial<AppConfig>) => {
    configManager.updateConfig(updates);
  }, []);

  const resetConfig = useCallback(() => {
    configManager.resetToDefaults();
  }, []);

  return {
    config,
    updateConfig,
    resetConfig,
    exportConfig: () => configManager.exportConfig(),
    importConfig: (json: string) => configManager.importConfig(json),
    validateConfig: (cfg: Partial<AppConfig>) => configManager.validateConfig(cfg),
  };
}

export const configManager = new ConfigManagerClass();
export { ConfigManagerClass as ConfigManager }; 