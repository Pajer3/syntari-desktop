// Syntari AI IDE - Production Project AI Assistant
// Real AI integration with proper styling and functionality

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ProjectContext, FileInfo, ChatMessage } from '../types';

// ================================
// TYPES
// ================================

interface ProjectAIAssistantProps {
  project: ProjectContext;
  currentFile: FileInfo | null;
  onSendMessage: (message: string, context?: any) => Promise<string>;
}

interface AiResponse {
  id: string;
  content: string;
  provider: string;
  cost: number;
  responseTime: number;
  confidence: number;
}

// ================================
// PROJECT AI ASSISTANT COMPONENT
// ================================

export const ProjectAIAssistant: React.FC<ProjectAIAssistantProps> = ({
  project,
  currentFile,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setIsLoading(true);

    try {
      // Send message to backend with project context
      const response = await invoke<AiResponse>('generate_ai_response', {
        request: {
          id: `req-${Date.now()}`,
          prompt: input.trim(),
          context: {
            project: project,
            currentFile: currentFile,
            openFiles: project.openFiles,
          },
          max_tokens: 2000,
          temperature: 0.7,
        },
      });

      const aiMessage: ChatMessage = {
        id: response.id,
        type: 'ai',
        content: response.content,
        timestamp: Date.now(),
        metadata: {
          provider: response.provider,
          cost: response.cost,
          responseTime: response.responseTime,
          confidence: response.confidence,
        },
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  }, [input, isTyping, project, currentFile]);

  const handleQuickAction = useCallback(async (action: string) => {
    const prompts: Record<string, string> = {
      explain: currentFile 
        ? `Explain the current file: ${currentFile.name}. What does this code do?`
        : `Explain this project: ${project.projectType} project at ${project.rootPath}`,
      optimize: currentFile
        ? `Analyze and suggest optimizations for ${currentFile.name}`
        : 'Analyze this project and suggest overall optimizations',
      bugs: currentFile
        ? `Find potential bugs or issues in ${currentFile.name}`
        : 'Analyze this project for potential bugs or issues',
      tests: currentFile
        ? `Generate unit tests for ${currentFile.name}`
        : 'Suggest a testing strategy for this project',
      docs: currentFile
        ? `Generate documentation for ${currentFile.name}`
        : 'Help me create documentation for this project',
      refactor: currentFile
        ? `Suggest refactoring improvements for ${currentFile.name}`
        : 'Suggest architectural improvements for this project',
    };

    const prompt = prompts[action];
    if (prompt) {
      setInput(prompt);
      inputRef.current?.focus();
    }
  }, [currentFile, project]);

  const formatCost = (cost: number) => {
    return cost < 0.000001 ? '<$0.000001' : `$${cost.toFixed(6)}`;
  };

  const formatTime = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="h-full bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-medium">AI</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
              <p className="text-sm text-gray-400">
                {project.projectType} • {project.rootPath.split('/').pop()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">
              {messages.length} messages
            </div>
            {currentFile && (
              <div className="text-xs text-blue-400">
                {currentFile.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800/50 border-b border-gray-700 p-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickAction('explain')}
            className="quick-action-button bg-blue-600/10 border border-blue-600/20 text-blue-400 hover:bg-blue-600/20"
          >
            💡 Explain
          </button>
          <button
            onClick={() => handleQuickAction('optimize')}
            className="quick-action-button bg-green-600/10 border border-green-600/20 text-green-400 hover:bg-green-600/20"
          >
            🚀 Optimize
          </button>
          <button
            onClick={() => handleQuickAction('bugs')}
            className="quick-action-button bg-red-600/10 border border-red-600/20 text-red-400 hover:bg-red-600/20"
          >
            🐛 Find Bugs
          </button>
          <button
            onClick={() => handleQuickAction('tests')}
            className="quick-action-button bg-purple-600/10 border border-purple-600/20 text-purple-400 hover:bg-purple-600/20"
          >
            🧪 Tests
          </button>
          <button
            onClick={() => handleQuickAction('docs')}
            className="quick-action-button bg-yellow-600/10 border border-yellow-600/20 text-yellow-400 hover:bg-yellow-600/20"
          >
            📚 Docs
          </button>
          <button
            onClick={() => handleQuickAction('refactor')}
            className="quick-action-button bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 hover:bg-indigo-600/20"
          >
            🔧 Refactor
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 ide-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              AI Assistant Ready
            </h3>
            <p className="text-gray-500 mb-4">
              Ask questions about your code, get suggestions, or request help with your project.
            </p>
            <div className="text-sm text-gray-600">
              <p>Project: <span className="text-blue-400">{project.projectType}</span></p>
              <p>Files: <span className="text-green-400">{project.openFiles.length}</span></p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-4xl message-bubble ${message.type}`}>
                {message.type === 'ai' && (
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">AI</span>
                    </div>
                    <span className="text-xs text-gray-400">Assistant</span>
                  </div>
                )}
                
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>

                {message.metadata && (
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-2 border-t border-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <span className="text-blue-400">{message.metadata.provider}</span>
                      <span>•</span>
                      <span>{formatCost(message.metadata.cost)}</span>
                      <span>•</span>
                      <span>{formatTime(message.metadata.responseTime)}</span>
                    </div>
                    {message.metadata.confidence && (
                      <div className="text-green-400">
                        {Math.round(message.metadata.confidence * 100)}% confidence
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-4xl message-bubble ai">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">AI</span>
                </div>
                <span className="text-xs text-gray-400">Assistant is thinking...</span>
              </div>
              <div className="loading-dots">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your project..."
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 text-sm"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-white font-medium text-sm"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending</span>
              </div>
            ) : (
              'Send'
            )}
          </button>
        </form>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <div className="flex items-center space-x-4">
            <span>✨ Powered by Syntari AI Router</span>
            <span>💰 97% cost savings</span>
          </div>
          <div>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Ctrl+K</kbd> to focus
          </div>
        </div>
      </div>
    </div>
  );
}; 