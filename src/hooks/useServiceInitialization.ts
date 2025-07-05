// Syntari AI IDE - Service Initialization Hook
// Initializes all Tauri backend services on app startup

import { useEffect, useState } from 'react';
import {
  AIService,
  // projectService - used in initialization function
  commandService,
  searchService,
} from '../services';

// Create AIService instance
const aiService = new AIService();

interface ServiceStatus {
  // terminal: 'loading' | 'ready' | 'error'; - removed
  search: 'loading' | 'ready' | 'error';
  command: 'loading' | 'ready' | 'error';
  ai: 'loading' | 'ready' | 'error';
}

interface UseServiceInitializationReturn {
  status: ServiceStatus;
  isReady: boolean;
  errors: string[];
  retryInitialization: () => void;
}

export const useServiceInitialization = (): UseServiceInitializationReturn => {
  const [status, setStatus] = useState<ServiceStatus>({
    // terminal: 'loading', - removed
    search: 'loading',
    command: 'loading',
    ai: 'loading',
  });

  const [errors, setErrors] = useState<string[]>([]);

  const initializeServices = async () => {
    const newErrors: string[] = [];
    const newStatus: ServiceStatus = {
      // terminal: 'loading', - removed
      search: 'loading',
      command: 'loading',
      ai: 'loading',
    };

    // Terminal initialization removed - XTerminalPanel handles its own initialization

    // Initialize Search Service
    try {
      await searchService.initialize();
      newStatus.search = 'ready';
    } catch (error) {
      console.error('Failed to initialize search service:', error);
      newStatus.search = 'error';
      newErrors.push(`Search: ${error}`);
    }

    // Initialize Command Service
    try {
      await commandService.initialize();
      newStatus.command = 'ready';
    } catch (error) {
      console.error('Failed to initialize command service:', error);
      newStatus.command = 'error';
      newErrors.push(`Command: ${error}`);
    }

    // Initialize AI Service
    try {
      await aiService.initialize();
      newStatus.ai = 'ready';
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      newStatus.ai = 'error';
      newErrors.push(`AI: ${error}`);
    }

    // All services initialized

    setStatus(newStatus);
    setErrors(newErrors);
  };

  useEffect(() => {
    initializeServices();
  }, []);

  const isReady = Object.values(status).every(s => s === 'ready');

  const retryInitialization = () => {
    setErrors([]);
    initializeServices();
  };

  return {
    status,
    isReady,
    errors,
    retryInitialization,
  };
};
