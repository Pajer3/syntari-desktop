import React, { useState, useEffect } from 'react';
import { getOSCommands, type OSTerminalInfo } from './OSTerminalTheme';

interface AutoCompleteProps {
  input: string;
  osInfo: OSTerminalInfo;
  workingDirectory: string;
  onSelect: (completion: string) => void;
  onClose: () => void;
  visible: boolean;
}

interface Suggestion {
  text: string;
  type: 'command' | 'file' | 'directory' | 'flag';
  description?: string;
}

export const TerminalAutoComplete: React.FC<AutoCompleteProps> = ({
  input,
  osInfo,
  workingDirectory,
  onSelect,
  onClose,
  visible,
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!visible || !input.trim()) {
      setSuggestions([]);
      return;
    }

    const generateSuggestions = () => {
      const words = input.trim().split(' ');
      const currentWord = words[words.length - 1];
      const isFirstWord = words.length === 1;

      const newSuggestions: Suggestion[] = [];

      if (isFirstWord) {
        // Command suggestions
        const osCommands = getOSCommands(osInfo.os);
        const allCommands = [
          ...osCommands,
          'git', 'npm', 'yarn', 'node', 'python', 'pip',
          'cargo', 'rustc', 'go', 'javac', 'java',
          'docker', 'kubectl', 'terraform',
          'ai', 'ask', 'help', 'clear', 'exit'
        ];

        allCommands
          .filter(cmd => cmd.toLowerCase().startsWith(currentWord.toLowerCase()))
          .forEach(cmd => {
            newSuggestions.push({
              text: cmd,
              type: 'command',
              description: getCommandDescription(cmd, osInfo.os),
            });
          });
      } else {
        // File/directory suggestions for non-first words
        // This would typically involve calling a backend service to list files
        // For now, we'll provide some common file extensions and patterns
        const commonFiles = [
          'package.json', 'Cargo.toml', 'go.mod', 'pom.xml',
          'Dockerfile', 'docker-compose.yml', '.gitignore',
          'README.md', 'LICENSE', 'tsconfig.json'
        ];

        commonFiles
          .filter(file => file.toLowerCase().startsWith(currentWord.toLowerCase()))
          .forEach(file => {
            newSuggestions.push({
              text: file,
              type: 'file',
            });
          });

        // Add common flags for known commands
        const firstCommand = words[0];
        const flags = getCommandFlags(firstCommand, osInfo.os);
        flags
          .filter(flag => flag.toLowerCase().startsWith(currentWord.toLowerCase()))
          .forEach(flag => {
            newSuggestions.push({
              text: flag,
              type: 'flag',
              description: getFlagDescription(firstCommand, flag),
            });
          });
      }

      setSuggestions(newSuggestions.slice(0, 10)); // Limit to 10 suggestions
      setSelectedIndex(0);
    };

    generateSuggestions();
  }, [input, osInfo, workingDirectory, visible]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!visible || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Tab':
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex].text);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, suggestions, selectedIndex]);

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-600 rounded shadow-lg max-h-48 overflow-y-auto z-50">
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.text}-${index}`}
          className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
            index === selectedIndex ? 'bg-blue-600' : 'hover:bg-gray-700'
          }`}
          onClick={() => onSelect(suggestion.text)}
        >
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-1 rounded ${getTypeColor(suggestion.type)}`}>
              {suggestion.type}
            </span>
            <span className="text-white font-mono">{suggestion.text}</span>
          </div>
          {suggestion.description && (
            <span className="text-gray-400 text-xs">{suggestion.description}</span>
          )}
        </div>
      ))}
    </div>
  );
};

function getTypeColor(type: string): string {
  switch (type) {
    case 'command': return 'bg-green-600 text-white';
    case 'file': return 'bg-blue-600 text-white';
    case 'directory': return 'bg-yellow-600 text-white';
    case 'flag': return 'bg-purple-600 text-white';
    default: return 'bg-gray-600 text-white';
  }
}

function getCommandDescription(command: string, os: string): string {
  const descriptions: Record<string, string> = {
    // Universal commands
    'git': 'Version control system',
    'npm': 'Node package manager',
    'node': 'JavaScript runtime',
    'python': 'Python interpreter',
    'ai': 'Ask AI assistant',
    'help': 'Show help information',
    'clear': 'Clear terminal screen',
    'exit': 'Exit terminal',

    // Linux/macOS commands
    'ls': 'List directory contents',
    'cd': 'Change directory',
    'pwd': 'Print working directory',
    'cat': 'Display file contents',
    'grep': 'Search text patterns',
    'find': 'Find files and directories',
    'mkdir': 'Create directory',
    'rm': 'Remove files/directories',
    'cp': 'Copy files/directories',
    'mv': 'Move/rename files',
    'chmod': 'Change file permissions',
    'sudo': 'Execute as superuser',
    'apt': 'Package manager (Debian/Ubuntu)',
    'yum': 'Package manager (RHEL/CentOS)',
    'brew': 'Package manager (macOS)',

    // Windows commands
    'dir': 'List directory contents',
    'type': 'Display file contents',
    'copy': 'Copy files',
    'move': 'Move files',
    'del': 'Delete files',
    'mkdir': 'Create directory',
    'rmdir': 'Remove directory',
    'where': 'Locate command',
    'set': 'Set environment variable',
  };

  return descriptions[command] || '';
}

function getCommandFlags(command: string, os: string): string[] {
  const flags: Record<string, string[]> = {
    'ls': ['-l', '-a', '-la', '-h', '-R', '-t', '-S'],
    'dir': ['/a', '/b', '/s', '/p', '/w'],
    'git': ['--help', '--version', 'status', 'add', 'commit', 'push', 'pull', 'clone', 'branch'],
    'npm': ['install', 'start', 'build', 'test', 'run', '--save', '--save-dev', '--global'],
    'docker': ['run', 'build', 'ps', 'images', 'exec', 'logs', '--help'],
    'python': ['-m', '-c', '-u', '--version', '--help'],
    'node': ['-v', '--version', '-e', '-p', '--help'],
  };

  return flags[command] || [];
}

function getFlagDescription(command: string, flag: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    'ls': {
      '-l': 'Long format',
      '-a': 'Show hidden files',
      '-h': 'Human readable sizes',
      '-R': 'Recursive',
      '-t': 'Sort by time',
    },
    'git': {
      'status': 'Show working tree status',
      'add': 'Add files to staging',
      'commit': 'Record changes',
      'push': 'Upload changes',
      'pull': 'Download changes',
    },
    'npm': {
      'install': 'Install packages',
      'start': 'Run start script',
      'build': 'Run build script',
      '--save': 'Save to dependencies',
      '--global': 'Install globally',
    },
  };

  return descriptions[command]?.[flag] || '';
} 