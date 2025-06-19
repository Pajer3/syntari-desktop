// Syntari AI IDE - Service Layer Index
// Centralized exports for all Tauri backend integration services

// Core services
export * from './terminalService';
export * from './searchService';
export * from './commandService';
export * from './aiService';
export * from './projectService';
export * from './types';

// Additional services that were missing
export * from './fileSystemService';
export * from './fileManagementService';
export * from './contextMenuService';
export * from './languageService';
export * from './chatService';
export * from './gitService';
export * from './costTrackingService';

// Service Manager for dependency injection and lifecycle management
export class ServiceManager {
  private static instance: ServiceManager;
  private services = new Map<string, any>();
  private initializationOrder: string[] = [];
  private initializationPromises = new Map<string, Promise<void>>();

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  // Register a service with dependency information
  register<T>(name: string, serviceFactory: () => T, dependencies: string[] = []): void {
    if (this.services.has(name)) {
      console.warn(`Service ${name} already registered, skipping`);
      return;
    }

    this.services.set(name, {
      factory: serviceFactory,
      dependencies,
      instance: null,
      initialized: false,
    });
  }

  // Get a service instance, initializing if needed
  async get<T>(name: string): Promise<T> {
    const serviceInfo = this.services.get(name);
    if (!serviceInfo) {
      throw new Error(`Service ${name} not registered`);
    }

    if (serviceInfo.instance) {
      return serviceInfo.instance;
    }

    // Initialize dependencies first
    for (const dep of serviceInfo.dependencies) {
      await this.get(dep);
    }

    // Create and initialize the service
    if (!this.initializationPromises.has(name)) {
      this.initializationPromises.set(name, this.initializeService(name, serviceInfo));
    }

    await this.initializationPromises.get(name);
    return serviceInfo.instance;
  }

  private async initializeService(name: string, serviceInfo: any): Promise<void> {
    try {
      serviceInfo.instance = serviceInfo.factory();
      
      // Call initialize method if it exists
      if (serviceInfo.instance && typeof serviceInfo.instance.initialize === 'function') {
        await serviceInfo.instance.initialize();
      }
      
      serviceInfo.initialized = true;
      this.initializationOrder.push(name);
      
      console.log(`✅ Service ${name} initialized successfully`);
    } catch (error) {
      console.error(`❌ Failed to initialize service ${name}:`, error);
      throw error;
    }
  }

  // Initialize all registered services
  async initializeAll(): Promise<void> {
    const serviceNames = Array.from(this.services.keys());
    await Promise.all(serviceNames.map(name => this.get(name)));
  }

  // Shutdown all services in reverse order
  async shutdown(): Promise<void> {
    for (const name of this.initializationOrder.reverse()) {
      const serviceInfo = this.services.get(name);
      if (serviceInfo?.instance && typeof serviceInfo.instance.shutdown === 'function') {
        try {
          await serviceInfo.instance.shutdown();
          console.log(`🔄 Service ${name} shutdown completed`);
        } catch (error) {
          console.error(`⚠️ Error shutting down service ${name}:`, error);
        }
      }
    }
  }

  // Get service health status
  getHealthStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [name, serviceInfo] of this.services.entries()) {
      status[name] = serviceInfo.initialized && serviceInfo.instance !== null;
    }
    return status;
  }
}

// Convenience function for service registration during app startup
export function registerCoreServices(): void {
  const serviceManager = ServiceManager.getInstance();
  
  // Register services with their dependencies
  serviceManager.register('fileSystem', () => import('./fileSystemService').then(m => new m.VSCodeLikeFileSystemService()));
  serviceManager.register('ai', () => import('./aiService').then(m => new (m as any).AIService()));
  serviceManager.register('terminal', () => import('./terminalService').then(m => new (m as any).TerminalService()));
  serviceManager.register('git', () => import('./gitService').then(m => new (m as any).GitService()), ['fileSystem']);
  serviceManager.register('chat', () => import('./chatService').then(m => new (m as any).ChatService()), ['ai']);
  serviceManager.register('project', () => import('./projectService').then(m => new (m as any).ProjectService()), ['fileSystem', 'git']);
  serviceManager.register('contextMenu', () => import('./contextMenuService').then(m => new (m as any).ContextMenuService()), ['fileSystem']);
  serviceManager.register('search', () => import('./searchService').then(m => new (m as any).SearchService()), ['fileSystem']);
  serviceManager.register('language', () => import('./languageService').then(m => new (m as any).LanguageService()));
  serviceManager.register('costTracking', () => import('./costTrackingService').then(m => new (m as any).CostTrackingService()), ['ai']);
}

// Export singleton instance for global access
export const serviceManager = ServiceManager.getInstance(); 