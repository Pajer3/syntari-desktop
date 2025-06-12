// Syntari AI IDE - Comprehensive Language Service
// Modular language support with Monaco, Tree-sitter, and LSP integration

import { languages } from 'monaco-editor';

// ================================
// LANGUAGE REGISTRY
// ================================

export interface LanguageDefinition {
  id: string;
  name: string;
  extensions: string[];
  aliases?: string[];
  mimeTypes?: string[];
  configuration?: languages.LanguageConfiguration;
  monarchGrammar?: languages.IMonarchLanguage;
  worker?: {
    label: string;
    src: string;
  };
  lsp?: {
    serverCommand: string;
    initializationOptions?: any;
  };
  treeSitter?: {
    grammarPath: string;
    highlightsPath: string;
  };
}

// Core Programming Languages with Enhanced Support
export const CORE_LANGUAGES: LanguageDefinition[] = [
  // ================================
  // WEB TECHNOLOGIES
  // ================================
  {
    id: 'typescript',
    name: 'TypeScript',
    extensions: ['.ts', '.tsx'],
    aliases: ['TypeScript', 'ts'],
    mimeTypes: ['text/typescript'],
    worker: {
      label: 'typescript',
      src: 'monaco-editor/esm/vs/language/typescript/ts.worker.js'
    },
    lsp: {
      serverCommand: 'typescript-language-server',
      initializationOptions: {
        preferences: {
          includeCompletionsForModuleExports: true,
          includeCompletionsWithInsertText: true,
        }
      }
    }
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    aliases: ['JavaScript', 'js'],
    mimeTypes: ['text/javascript'],
    worker: {
      label: 'typescript',
      src: 'monaco-editor/esm/vs/language/typescript/ts.worker.js'
    }
  },
  {
    id: 'html',
    name: 'HTML',
    extensions: ['.html', '.htm', '.xhtml'],
    aliases: ['HTML', 'html'],
    mimeTypes: ['text/html'],
    worker: {
      label: 'html',
      src: 'monaco-editor/esm/vs/language/html/html.worker.js'
    }
  },
  {
    id: 'css',
    name: 'CSS',
    extensions: ['.css'],
    aliases: ['CSS', 'css'],
    mimeTypes: ['text/css'],
    worker: {
      label: 'css',
      src: 'monaco-editor/esm/vs/language/css/css.worker.js'
    }
  },
  {
    id: 'json',
    name: 'JSON',
    extensions: ['.json', '.jsonc'],
    aliases: ['JSON', 'json'],
    mimeTypes: ['application/json'],
    worker: {
      label: 'json',
      src: 'monaco-editor/esm/vs/language/json/json.worker.js'
    }
  },

  // ================================
  // SYSTEMS PROGRAMMING
  // ================================
  {
    id: 'rust',
    name: 'Rust',
    extensions: ['.rs'],
    aliases: ['Rust', 'rust'],
    mimeTypes: ['text/rust'],
    lsp: {
      serverCommand: 'rust-analyzer',
      initializationOptions: {
        cargo: {
          buildScripts: {
            enable: true
          }
        },
        checkOnSave: {
          command: "clippy"
        }
      }
    }
  },
  {
    id: 'cpp',
    name: 'C++',
    extensions: ['.cpp', '.cxx', '.cc', '.hpp', '.hxx', '.h'],
    aliases: ['C++', 'cpp', 'cxx'],
    mimeTypes: ['text/x-c++src'],
    lsp: {
      serverCommand: 'clangd',
      initializationOptions: {
        clangdFileStatus: true,
        usePlaceholders: true,
        completeUnimported: true,
        semanticHighlighting: true
      }
    }
  },
  {
    id: 'c',
    name: 'C',
    extensions: ['.c', '.h'],
    aliases: ['C', 'c'],
    mimeTypes: ['text/x-csrc'],
    lsp: {
      serverCommand: 'clangd'
    }
  },
  {
    id: 'go',
    name: 'Go',
    extensions: ['.go'],
    aliases: ['Go', 'golang'],
    mimeTypes: ['text/x-go'],
    lsp: {
      serverCommand: 'gopls',
      initializationOptions: {
        usePlaceholders: true,
        completeUnimported: true,
        deepCompletion: true
      }
    }
  },

  // ================================
  // HIGH-LEVEL LANGUAGES
  // ================================
  {
    id: 'python',
    name: 'Python',
    extensions: ['.py', '.pyw', '.pyi'],
    aliases: ['Python', 'py'],
    mimeTypes: ['text/x-python'],
    lsp: {
      serverCommand: 'pyright-langserver',
      initializationOptions: {
        settings: {
          python: {
            analysis: {
              typeCheckingMode: "basic",
              autoSearchPaths: true,
              useLibraryCodeForTypes: true
            }
          }
        }
      }
    }
  },
  {
    id: 'java',
    name: 'Java',
    extensions: ['.java'],
    aliases: ['Java', 'java'],
    mimeTypes: ['text/x-java-source'],
    lsp: {
      serverCommand: 'jdtls'
    }
  },
  {
    id: 'csharp',
    name: 'C#',
    extensions: ['.cs', '.csx'],
    aliases: ['C#', 'csharp'],
    mimeTypes: ['text/x-csharp'],
    lsp: {
      serverCommand: 'omnisharp'
    }
  },

  // ================================
  // FUNCTIONAL LANGUAGES
  // ================================
  {
    id: 'haskell',
    name: 'Haskell',
    extensions: ['.hs', '.lhs'],
    aliases: ['Haskell', 'haskell'],
    mimeTypes: ['text/x-haskell'],
    lsp: {
      serverCommand: 'haskell-language-server-wrapper'
    }
  },
  {
    id: 'ocaml',
    name: 'OCaml',
    extensions: ['.ml', '.mli'],
    aliases: ['OCaml', 'ocaml'],
    mimeTypes: ['text/x-ocaml'],
    lsp: {
      serverCommand: 'ocamllsp'
    }
  },
  {
    id: 'fsharp',
    name: 'F#',
    extensions: ['.fs', '.fsx', '.fsi'],
    aliases: ['F#', 'fsharp'],
    mimeTypes: ['text/x-fsharp']
  },

  // ================================
  // MARKUP & CONFIG
  // ================================
  {
    id: 'markdown',
    name: 'Markdown',
    extensions: ['.md', '.markdown', '.mdown', '.mkdn'],
    aliases: ['Markdown', 'md'],
    mimeTypes: ['text/markdown']
  },
  {
    id: 'yaml',
    name: 'YAML',
    extensions: ['.yaml', '.yml'],
    aliases: ['YAML', 'yaml'],
    mimeTypes: ['text/yaml']
  },
  {
    id: 'toml',
    name: 'TOML',
    extensions: ['.toml'],
    aliases: ['TOML', 'toml'],
    mimeTypes: ['text/toml']
  },
  {
    id: 'xml',
    name: 'XML',
    extensions: ['.xml', '.xsd', '.xsl'],
    aliases: ['XML', 'xml'],
    mimeTypes: ['text/xml']
  },

  // ================================
  // DATABASES & QUERY
  // ================================
  {
    id: 'sql',
    name: 'SQL',
    extensions: ['.sql'],
    aliases: ['SQL', 'sql'],
    mimeTypes: ['text/x-sql']
  },

  // ================================
  // SHELL & SCRIPTS
  // ================================
  {
    id: 'shell',
    name: 'Shell Script',
    extensions: ['.sh', '.bash', '.zsh', '.fish'],
    aliases: ['Shell', 'bash', 'sh'],
    mimeTypes: ['text/x-shellscript']
  },
  {
    id: 'powershell',
    name: 'PowerShell',
    extensions: ['.ps1', '.psm1', '.psd1'],
    aliases: ['PowerShell', 'pwsh'],
    mimeTypes: ['text/x-powershell']
  },

  // ================================
  // MODERN LANGUAGES
  // ================================
  {
    id: 'swift',
    name: 'Swift',
    extensions: ['.swift'],
    aliases: ['Swift', 'swift'],
    mimeTypes: ['text/x-swift'],
    lsp: {
      serverCommand: 'sourcekit-lsp'
    }
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    extensions: ['.kt', '.kts'],
    aliases: ['Kotlin', 'kotlin'],
    mimeTypes: ['text/x-kotlin']
  },
  {
    id: 'dart',
    name: 'Dart',
    extensions: ['.dart'],
    aliases: ['Dart', 'dart'],
    mimeTypes: ['text/x-dart'],
    lsp: {
      serverCommand: 'dart_language_server'
    }
  },
  {
    id: 'lua',
    name: 'Lua',
    extensions: ['.lua'],
    aliases: ['Lua', 'lua'],
    mimeTypes: ['text/x-lua']
  },

  // ================================
  // SPECIALIZED
  // ================================
  {
    id: 'dockerfile',
    name: 'Dockerfile',
    extensions: ['.dockerfile', 'Dockerfile'],
    aliases: ['Dockerfile', 'docker'],
    mimeTypes: ['text/x-dockerfile']
  },
  {
    id: 'graphql',
    name: 'GraphQL',
    extensions: ['.graphql', '.gql'],
    aliases: ['GraphQL', 'gql'],
    mimeTypes: ['application/graphql']
  }
];

// ================================
// LANGUAGE SERVICE CLASS
// ================================

export class LanguageService {
  private static instance: LanguageService;
  private registeredLanguages = new Map<string, LanguageDefinition>();
  private extensionMap = new Map<string, string>();
  private _lspClients = new Map<string, any>(); // Future: LSP client storage

  static getInstance(): LanguageService {
    if (!LanguageService.instance) {
      LanguageService.instance = new LanguageService();
    }
    return LanguageService.instance;
  }

  constructor() {
    // Auto-register core languages on instantiation
    CORE_LANGUAGES.forEach(lang => {
      this.registerLanguage(lang);
    });
    
    // Reduced logging frequency - only log summary on startup
    // console.log(`🚀 Language Service initialized with ${CORE_LANGUAGES.length} languages`);
  }

  registerLanguage(langDef: LanguageDefinition): void {
    this.registeredLanguages.set(langDef.id, langDef);
    
    // Map extensions to language IDs
    langDef.extensions.forEach(ext => {
      this.extensionMap.set(ext.toLowerCase(), langDef.id);
    });

    // Register Monaco language if configuration exists
    if (langDef.configuration) {
      languages.setLanguageConfiguration(langDef.id, langDef.configuration);
    }

    // Register Monarch grammar if exists
    if (langDef.monarchGrammar) {
      languages.setMonarchTokensProvider(langDef.id, langDef.monarchGrammar);
    }

    // Reduce logging frequency - only log when debug mode is enabled
    // console.log(`📝 Registered language: ${langDef.name} (${langDef.extensions.join(', ')})`);
  }

  getLanguageByExtension(extension: string): string {
    const ext = extension.toLowerCase();
    if (ext.startsWith('.')) {
      return this.extensionMap.get(ext) || 'plaintext';
    }
    return this.extensionMap.get(`.${ext}`) || 'plaintext';
  }

  getLanguageByFilename(filename: string): string {
    const parts = filename.split('.');
    if (parts.length < 2) {
      // Handle special files without extensions
      const specialFiles: Record<string, string> = {
        'dockerfile': 'dockerfile',
        'makefile': 'makefile',
        'rakefile': 'ruby',
        'gemfile': 'ruby',
        'pipfile': 'toml'
      };
      return specialFiles[filename.toLowerCase()] || 'plaintext';
    }
    
    const extension = `.${parts[parts.length - 1]}`;
    return this.getLanguageByExtension(extension);
  }

  getAllLanguages(): LanguageDefinition[] {
    return Array.from(this.registeredLanguages.values());
  }

  getLanguageDefinition(languageId: string): LanguageDefinition | undefined {
    return this.registeredLanguages.get(languageId);
  }

  getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }

  // LSP Integration (Future)
  async startLSPForLanguage(languageId: string): Promise<boolean> {
    const langDef = this.registeredLanguages.get(languageId);
    if (!langDef?.lsp) {
      console.warn(`No LSP configuration for language: ${languageId}`);
      return false;
    }

    // Check if LSP client already exists
    if (this._lspClients.has(languageId)) {
      console.log(`LSP client already running for ${languageId}`);
      return true;
    }

    // TODO: Implement actual LSP client startup
    console.log(`🚀 Starting LSP for ${languageId}: ${langDef.lsp.serverCommand}`);
    
    // Placeholder for future LSP client
    this._lspClients.set(languageId, { status: 'starting' });
    
    return true;
  }

  // Tree-sitter Integration (Future)
  async loadTreeSitterGrammar(languageId: string): Promise<boolean> {
    const langDef = this.registeredLanguages.get(languageId);
    if (!langDef?.treeSitter) {
      console.warn(`No Tree-sitter grammar for language: ${languageId}`);
      return false;
    }

    // TODO: Implement Tree-sitter grammar loading
    console.log(`🌳 Loading Tree-sitter grammar for ${languageId}`);
    return true;
  }
}

// ================================
// CONVENIENCE FUNCTIONS
// ================================

export const languageService = LanguageService.getInstance();

export const getLanguageFromPath = (filePath: string): string => {
  if (!filePath) return 'plaintext';
  
  const filename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
  return languageService.getLanguageByFilename(filename);
};

export const getLanguageFromExtension = (extension: string): string => {
  return languageService.getLanguageByExtension(extension);
};

export const getAllSupportedLanguages = (): LanguageDefinition[] => {
  return languageService.getAllLanguages();
};

export const isLanguageSupported = (languageId: string): boolean => {
  return languageService.getLanguageDefinition(languageId) !== undefined;
};

// Initialize on import
// Initialize language service - reduce startup logging
// console.log('🚀 Language Service module loaded'); 