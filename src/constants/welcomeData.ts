// Syntari AI IDE - Welcome Screen Data Constants
// Extracted from WelcomeScreen.tsx for better maintainability

export interface WelcomeAction {
  name: string;
  icon: string;
  description: string;
  category: string;
}

export interface GettingStartedStep {
  title: string;
  description: string;
  icon: string;
  color: string;
}

export const WELCOME_ACTIONS: WelcomeAction[] = [
  { 
    name: 'Open Project', 
    icon: '/tree.png', 
    description: 'Browse and import existing codebases',
    category: 'Development'
  },
  { 
    name: 'Clone Repository', 
    icon: '/Git-icon.png', 
    description: 'Clone from Git repositories and version control',
    category: 'Source Control'
  },
  { 
    name: 'Remote Environment', 
    icon: '/terminal-gradient.png', 
    description: 'Connect to remote development environments',
    category: 'Infrastructure'
  },
  { 
    name: 'Code Playground', 
    icon: '/sandbox.png', 
    description: 'Experimental development sandbox',
    category: 'Development'
  },
  { 
    name: 'Extension Manager', 
    icon: '/plugin.png', 
    description: 'Install and manage development tools',
    category: 'Tools'
  },
  { 
    name: 'Workspace Optimizer', 
    icon: '/clean-up.png', 
    description: 'Optimize storage and performance',
    category: 'Maintenance'
  }
];

export const GETTING_STARTED_STEPS: GettingStartedStep[] = [
  {
    title: 'Open or Create a Project',
    description: 'Start by opening an existing project or creating a new one to begin development',
    icon: '⭐',
    color: 'blue',
  },
  {
    title: 'AI Assistant',
    description: 'Use the chat panel to get intelligent code suggestions and development help',
    icon: '✅',
    color: 'green',
  },
  {
    title: 'Smart Routing',
    description: 'Enable smart routing for optimal AI model selection based on your queries',
    icon: '🔄',
    color: 'purple',
  },
  {
    title: 'Customize Settings',
    description: 'Configure your IDE preferences, AI providers, and workspace settings',
    icon: '⚙️',
    color: 'orange',
  },
]; 