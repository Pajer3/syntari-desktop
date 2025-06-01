// Application Configuration - Centralized Settings Management
export interface AppConfig {
  app: {
    name: string;
    version: string;
    debug: boolean;
    environment: 'development' | 'production' | 'test';
  };
  
  ui: {
    defaultChunkSize: number;
    maxFileSize: number;
    maxDepth: number;
    debounceMs: number;
    virtualScrollItemHeight: number;
  };
  
  scanner: {
    maxDepth: number;
    maxFileSize: number;
    chunkSize: number;
    includeHidden: boolean;
    defaultIgnorePatterns: string[];
  };
  
  ai: {
    defaultProvider: string;
    maxTokens: number;
    temperature: number;
    smartRoutingEnabled: boolean;
  };
  
  dev: {
    openDevToolsOnStart: boolean;
    enableDetailedLogging: boolean;
    showPerformanceMetrics: boolean;
  };
}

// Default configuration
const DEFAULT_CONFIG: AppConfig = {
  app: {
    name: 'Syntari AI IDE',
    version: '0.1.0',
    debug: import.meta.env.DEV,
    environment: import.meta.env.DEV ? 'development' : 'production',
  },
  
  ui: {
    defaultChunkSize: 50,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxDepth: 20,
    debounceMs: 300,
    virtualScrollItemHeight: 24,
  },
  
  scanner: {
    maxDepth: 20,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    chunkSize: 100,
    includeHidden: true,
    defaultIgnorePatterns: [
      'node_modules',
      '.git',
      'dist',
      'build',
      'target',
      '.next',
      '.cache',
      '*.log'
    ],
  },
  
  ai: {
    defaultProvider: 'gpt-4',
    maxTokens: 4000,
    temperature: 0.7,
    smartRoutingEnabled: true,
  },
  
  dev: {
    openDevToolsOnStart: import.meta.env.DEV,
    enableDetailedLogging: import.meta.env.DEV,
    showPerformanceMetrics: import.meta.env.DEV,
  },
};

// Configuration manager with environment overrides
class ConfigManager {
  private config: AppConfig;
  
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadEnvironmentOverrides();
  }
  
  private loadEnvironmentOverrides(): void {
    // Load from environment variables if available
    if (import.meta.env.VITE_MAX_FILE_SIZE) {
      this.config.scanner.maxFileSize = parseInt(import.meta.env.VITE_MAX_FILE_SIZE);
      this.config.ui.maxFileSize = this.config.scanner.maxFileSize;
    }
    
    if (import.meta.env.VITE_CHUNK_SIZE) {
      this.config.scanner.chunkSize = parseInt(import.meta.env.VITE_CHUNK_SIZE);
      this.config.ui.defaultChunkSize = this.config.scanner.chunkSize;
    }
    
    if (import.meta.env.VITE_MAX_DEPTH) {
      this.config.scanner.maxDepth = parseInt(import.meta.env.VITE_MAX_DEPTH);
      this.config.ui.maxDepth = this.config.scanner.maxDepth;
    }
  }
  
  public get(): AppConfig {
    return { ...this.config };
  }
  
  public getSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    return { ...this.config[section] };
  }
  
  public updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  public updateSection<K extends keyof AppConfig>(
    section: K, 
    updates: Partial<AppConfig[K]>
  ): void {
    this.config[section] = { ...this.config[section], ...updates };
  }
  
  public isDevelopment(): boolean {
    return this.config.app.environment === 'development';
  }
  
  public isProduction(): boolean {
    return this.config.app.environment === 'production';
  }
  
  public shouldOpenDevTools(): boolean {
    return this.config.dev.openDevToolsOnStart && this.isDevelopment();
  }
}

// Singleton instance
export const configManager = new ConfigManager();

// Convenience exports
export const config = configManager.get();
export const getConfig = () => configManager.get();
export const getConfigSection = <K extends keyof AppConfig>(section: K) => 
  configManager.getSection(section); 