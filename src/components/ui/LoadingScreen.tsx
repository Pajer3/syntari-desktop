import React from 'react';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Initializing Syntari AI IDE",
  submessage = "Loading AI providers and enterprise features..."
}) => (
  <div className="flex items-center justify-center h-full bg-gray-900 text-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4 mx-auto"></div>
      <h2 className="text-xl font-semibold mb-2">{message}</h2>
      <p className="text-gray-400">{submessage}</p>
    </div>
  </div>
); 