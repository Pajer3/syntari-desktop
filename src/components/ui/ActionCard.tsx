// Syntari AI IDE - Action Card Component
// Extracted from WelcomeScreen.tsx for better reusability

import React from 'react';

interface ActionCardProps {
  name: string;
  icon: string;
  description: string;
  category: string;
  index: number;
  onClick: (actionName: string) => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  name,
  icon,
  description,
  category,
  index,
  onClick,
}) => {
  return (
    <button
      onClick={() => onClick(name)}
      className="group relative bg-gray-800/40 hover:bg-gray-750/50 border border-gray-700/50 hover:border-gray-600/60 rounded-lg p-4 md:p-6 lg:p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl backdrop-blur-sm animate-fade-in-up"
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: 'both'
      }}
    >
      {/* Category Badge */}
      <div className="absolute top-3 md:top-4 right-3 md:right-4">
        <span className="px-2 py-1 text-xs font-medium text-gray-400 bg-gray-700/30 rounded-md">
          {category}
        </span>
      </div>

      {/* Icon */}
      <div className="mb-3 md:mb-4">
        <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-gray-700/40 rounded-lg flex items-center justify-center group-hover:bg-gray-600/40 transition-colors duration-300">
          <img 
            src={icon} 
            alt={name} 
            className="w-5 h-5 md:w-7 md:h-7 lg:w-8 lg:h-8 opacity-80 filter brightness-110" 
          />
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-semibold text-white text-sm md:text-base lg:text-lg group-hover:text-blue-100 transition-colors duration-300">
          {name}
        </h3>
        <p className="text-xs md:text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Hover indicator */}
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-lg"></div>
    </button>
  );
}; 