// Syntari AI IDE - Configurable File Template System
// Extensible template configuration for new file creation

export interface FileTemplate {
  id: string;
  name: string;
  extension: string;
  content: string;
  description: string;
  icon: string;
  category: string;
  tags: string[];
  isUserTemplate?: boolean;
  projectTypes?: string[]; // If specified, only show for these project types
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'web', name: 'Web Development', icon: '🌐', order: 1 },
  { id: 'typescript', name: 'TypeScript', icon: '🔷', order: 2 },
  { id: 'javascript', name: 'JavaScript', icon: '🟨', order: 3 },
  { id: 'styling', name: 'Styles', icon: '🎨', order: 4 },
  { id: 'markup', name: 'Markup', icon: '📝', order: 5 },
  { id: 'data', name: 'Data', icon: '📄', order: 6 },
  { id: 'config', name: 'Configuration', icon: '⚙️', order: 7 },
  { id: 'documentation', name: 'Documentation', icon: '📋', order: 8 },
  { id: 'testing', name: 'Testing', icon: '🧪', order: 9 },
  { id: 'custom', name: 'Custom', icon: '📋', order: 99 },
];

export const DEFAULT_TEMPLATES: FileTemplate[] = [
  // TypeScript Category
  {
    id: 'typescript-file',
    name: 'TypeScript File',
    extension: '.ts',
    content: `// TypeScript file\n\nexport default function() {\n  // Your code here\n}\n`,
    description: 'TypeScript source file',
    icon: '🔷',
    category: 'typescript',
    tags: ['typescript', 'source'],
  },
  {
    id: 'typescript-interface',
    name: 'TypeScript Interface',
    extension: '.ts',
    content: `// TypeScript interface definition\n\nexport interface MyInterface {\n  // Define your interface here\n  id: string;\n  name: string;\n}\n`,
    description: 'TypeScript interface definition',
    icon: '🔷',
    category: 'typescript',
    tags: ['typescript', 'interface', 'types'],
  },
  {
    id: 'typescript-types',
    name: 'TypeScript Types',
    extension: '.d.ts',
    content: `// TypeScript type definitions\n\nexport type MyType = string | number;\n\nexport interface MyInterface {\n  // Define your types here\n}\n`,
    description: 'TypeScript type definitions',
    icon: '🔷',
    category: 'typescript',
    tags: ['typescript', 'types', 'definitions'],
  },

  // Web Development Category  
  {
    id: 'react-component',
    name: 'React Component',
    extension: '.tsx',
    content: `import React from 'react';\n\ninterface Props {\n  // Define component props here\n}\n\nexport const MyComponent: React.FC<Props> = (props) => {\n  return (\n    <div>\n      {/* Component content */}\n    </div>\n  );\n};\n\nexport default MyComponent;\n`,
    description: 'React TypeScript component',
    icon: '⚛️',
    category: 'web',
    tags: ['react', 'component', 'tsx'],
    projectTypes: ['react', 'next', 'web'],
  },
  {
    id: 'react-hook',
    name: 'React Hook',
    extension: '.ts',
    content: `import { useState, useEffect } from 'react';\n\nexport const useMyHook = () => {\n  const [state, setState] = useState();\n\n  useEffect(() => {\n    // Hook logic here\n  }, []);\n\n  return {\n    state,\n    setState,\n  };\n};\n`,
    description: 'Custom React hook',
    icon: '🪝',
    category: 'web',
    tags: ['react', 'hook', 'custom'],
    projectTypes: ['react', 'next', 'web'],
  },
  {
    id: 'html-page',
    name: 'HTML Page',
    extension: '.html',
    content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n`,
    description: 'HTML document',
    icon: '🌐',
    category: 'web',
    tags: ['html', 'web', 'page'],
  },

  // JavaScript Category
  {
    id: 'javascript-file',
    name: 'JavaScript File',
    extension: '.js',
    content: `// JavaScript file\n\nfunction main() {\n  // Your code here\n}\n\nexport default main;\n`,
    description: 'JavaScript source file',
    icon: '🟨',
    category: 'javascript',
    tags: ['javascript', 'source'],
  },
  {
    id: 'javascript-module',
    name: 'JavaScript Module',
    extension: '.mjs',
    content: `// ES6 Module\n\nexport function myFunction() {\n  // Your function here\n}\n\nexport const myConstant = 'value';\n\nexport default {\n  myFunction,\n  myConstant,\n};\n`,
    description: 'ES6 JavaScript module',
    icon: '📦',
    category: 'javascript',
    tags: ['javascript', 'module', 'es6'],
  },

  // Styling Category
  {
    id: 'css-file',
    name: 'CSS Stylesheet',
    extension: '.css',
    content: `/* Stylesheet */\n\n.container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n`,
    description: 'CSS stylesheet',
    icon: '🎨',
    category: 'styling',
    tags: ['css', 'styles'],
  },
  {
    id: 'scss-file',
    name: 'SCSS Stylesheet',
    extension: '.scss',
    content: `// SCSS Stylesheet\n\n$primary-color: #007acc;\n$secondary-color: #ffffff;\n\n.container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  \n  .header {\n    color: $primary-color;\n  }\n}\n`,
    description: 'SCSS stylesheet with variables',
    icon: '🎨',
    category: 'styling',
    tags: ['scss', 'sass', 'styles'],
  },

  // Data Category
  {
    id: 'json-config',
    name: 'JSON Configuration',
    extension: '.json',
    content: `{\n  "name": "example",\n  "version": "1.0.0",\n  "description": "Example configuration"\n}\n`,
    description: 'JSON configuration file',
    icon: '📄',
    category: 'data',
    tags: ['json', 'config'],
  },
  {
    id: 'yaml-config',
    name: 'YAML Configuration',
    extension: '.yml',
    content: `# YAML Configuration\nname: example\nversion: 1.0.0\ndescription: Example configuration\n\nservices:\n  - name: api\n    port: 3000\n  - name: database\n    port: 5432\n`,
    description: 'YAML configuration file',
    icon: '📄',
    category: 'data',
    tags: ['yaml', 'config'],
  },

  // Documentation Category
  {
    id: 'markdown-doc',
    name: 'Markdown Document',
    extension: '.md',
    content: `# Document Title\n\nYour markdown content here.\n\n## Section\n\n- List item 1\n- List item 2\n\n### Code Example\n\n\`\`\`typescript\n// Code example\nconsole.log('Hello, World!');\n\`\`\`\n\n### Links\n\n[Link text](https://example.com)\n`,
    description: 'Markdown documentation',
    icon: '📝',
    category: 'documentation',
    tags: ['markdown', 'documentation'],
  },
  {
    id: 'readme',
    name: 'README',
    extension: '.md',
    content: `# Project Name\n\nBrief description of your project.\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\n\`\`\`bash\nnpm start\n\`\`\`\n\n## Contributing\n\nContributions are welcome! Please read the contributing guidelines.\n\n## License\n\nMIT License\n`,
    description: 'Project README file',
    icon: '📋',
    category: 'documentation',
    tags: ['readme', 'documentation', 'project'],
  },

  // Testing Category
  {
    id: 'test-file',
    name: 'Test File',
    extension: '.test.ts',
    content: `import { describe, it, expect } from 'vitest';\n\ndescribe('MyFunction', () => {\n  it('should work correctly', () => {\n    // Test implementation\n    expect(true).toBe(true);\n  });\n\n  it('should handle edge cases', () => {\n    // Edge case tests\n  });\n});\n`,
    description: 'Test file with basic structure',
    icon: '🧪',
    category: 'testing',
    tags: ['test', 'vitest', 'testing'],
  },

  // Configuration Category
  {
    id: 'env-file',
    name: 'Environment Variables',
    extension: '.env',
    content: `# Environment Variables\n# Copy this file to .env.local and add your actual values\n\nDATABASE_URL=postgresql://localhost:5432/mydb\nAPI_KEY=your-api-key-here\nNODE_ENV=development\n`,
    description: 'Environment variables file',
    icon: '⚙️',
    category: 'config',
    tags: ['env', 'environment', 'config'],
  },
  {
    id: 'gitignore',
    name: 'Git Ignore',
    extension: '.gitignore',
    content: `# Dependencies\nnode_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n\n# Environment variables\n.env\n.env.local\n.env.development.local\n.env.test.local\n.env.production.local\n\n# Build outputs\nbuild/\ndist/\n.next/\n\n# IDE\n.vscode/\n.idea/\n*.swp\n*.swo\n\n# OS\n.DS_Store\nThumbs.db\n`,
    description: 'Git ignore patterns',
    icon: '🚫',
    category: 'config',
    tags: ['git', 'ignore', 'version-control'],
  },

  // Empty template
  {
    id: 'empty-file',
    name: 'Empty File',
    extension: '',
    content: '',
    description: 'Empty file with custom extension',
    icon: '📋',
    category: 'custom',
    tags: ['empty', 'custom'],
  },
];

export class TemplateManager {
  private static userTemplates: FileTemplate[] = [];
  private static projectTemplates: Map<string, FileTemplate[]> = new Map();

  static getAllTemplates(projectType?: string): FileTemplate[] {
    let templates = [...DEFAULT_TEMPLATES];

    // Add user templates
    templates.push(...this.userTemplates);

    // Add project-specific templates
    if (projectType && this.projectTemplates.has(projectType)) {
      templates.push(...(this.projectTemplates.get(projectType) || []));
    }

    // Filter by project type if specified
    if (projectType) {
      templates = templates.filter(template => 
        !template.projectTypes || 
        template.projectTypes.includes(projectType)
      );
    }

    return templates;
  }

  static getTemplatesByCategory(category: string, projectType?: string): FileTemplate[] {
    return this.getAllTemplates(projectType).filter(template => 
      template.category === category
    );
  }

  static addUserTemplate(template: Omit<FileTemplate, 'id' | 'isUserTemplate'>): FileTemplate {
    const newTemplate: FileTemplate = {
      ...template,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isUserTemplate: true,
    };
    
    this.userTemplates.push(newTemplate);
    return newTemplate;
  }

  static removeUserTemplate(templateId: string): boolean {
    const index = this.userTemplates.findIndex(t => t.id === templateId);
    if (index > -1) {
      this.userTemplates.splice(index, 1);
      return true;
    }
    return false;
  }

  static addProjectTemplate(projectType: string, template: Omit<FileTemplate, 'id'>): FileTemplate {
    const newTemplate: FileTemplate = {
      ...template,
      id: `project-${projectType}-${Date.now()}`,
    };

    if (!this.projectTemplates.has(projectType)) {
      this.projectTemplates.set(projectType, []);
    }
    
    this.projectTemplates.get(projectType)!.push(newTemplate);
    return newTemplate;
  }

  static searchTemplates(query: string, projectType?: string): FileTemplate[] {
    const templates = this.getAllTemplates(projectType);
    const lowerQuery = query.toLowerCase();
    
    return templates.filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      template.extension.toLowerCase().includes(lowerQuery)
    );
  }

  static getRecentTemplates(limit: number = 5): FileTemplate[] {
    // In a real implementation, this would track usage
    // For now, return the most commonly used templates
    const commonTemplateIds = [
      'typescript-file',
      'react-component', 
      'javascript-file',
      'css-file',
      'markdown-doc'
    ];
    
    return commonTemplateIds
      .map(id => this.getAllTemplates().find(t => t.id === id))
      .filter(Boolean)
      .slice(0, limit) as FileTemplate[];
  }

  static saveUserTemplates(): void {
    // Save to localStorage or user preferences
    try {
      localStorage.setItem('syntari-user-templates', JSON.stringify(this.userTemplates));
    } catch (error) {
      console.error('Failed to save user templates:', error);
    }
  }

  static loadUserTemplates(): void {
    // Load from localStorage or user preferences
    try {
      const saved = localStorage.getItem('syntari-user-templates');
      if (saved) {
        this.userTemplates = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load user templates:', error);
    }
  }
}

// Initialize template manager
TemplateManager.loadUserTemplates(); 