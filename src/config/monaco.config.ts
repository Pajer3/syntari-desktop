// Syntari AI IDE - Advanced Monaco Editor Configuration
// Comprehensive setup with workers, languages, and performance optimizations

import { languageService, getAllSupportedLanguages } from '../services/languageService';

// ================================
// MONACO WORKER CONFIGURATION
// ================================

// Configure Monaco workers for better performance and IntelliSense
export const configureMonacoWorkers = () => {
  // Configure Monaco to use web workers for language services
  (self as any).MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      // Use different workers based on language type
      switch (label) {
        case 'json':
          return '/monaco-editor/esm/vs/language/json/json.worker.js';
        case 'css':
        case 'scss':
        case 'less':
          return '/monaco-editor/esm/vs/language/css/css.worker.js';
        case 'html':
        case 'handlebars':
        case 'razor':
          return '/monaco-editor/esm/vs/language/html/html.worker.js';
        case 'typescript':
        case 'javascript':
          return '/monaco-editor/esm/vs/language/typescript/ts.worker.js';
        default:
          return '/monaco-editor/esm/vs/editor/editor.worker.js';
      }
    }
  };

  console.log('🚀 Monaco workers configured for enhanced language support');
};

// ================================
// LANGUAGE CONFIGURATION
// ================================

export const configureMonacoLanguages = async () => {
  try {
    // Get all supported languages from our language service
    const supportedLanguages = getAllSupportedLanguages();
    
    console.log(`🔧 Configuring ${supportedLanguages.length} languages for Monaco Editor`);
    
    // Configure specific language features
    await configureTypeScriptDefaults();
    await configureJavaScriptDefaults();
    await configureCSSDefaults();
    await configureHTMLDefaults();
    await configureJSONDefaults();
    
    console.log('✅ Monaco language configuration complete');
    return true;
  } catch (error) {
    console.error('❌ Failed to configure Monaco languages:', error);
    return false;
  }
};

// ================================
// LANGUAGE-SPECIFIC CONFIGURATIONS
// ================================

const configureTypeScriptDefaults = async () => {
  const { languages } = await import('monaco-editor');
  
  // Enhanced TypeScript configuration
  languages.typescript.typescriptDefaults.setCompilerOptions({
    target: languages.typescript.ScriptTarget.ES2020,
    module: languages.typescript.ModuleKind.ESNext,
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    allowJs: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    strict: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: languages.typescript.JsxEmit.ReactJSX,
  });

  // Enhanced diagnostics
  languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  console.log('📝 TypeScript defaults configured');
};

const configureJavaScriptDefaults = async () => {
  const { languages } = await import('monaco-editor');
  
  // Enhanced JavaScript configuration
  languages.typescript.javascriptDefaults.setCompilerOptions({
    target: languages.typescript.ScriptTarget.ES2020,
    module: languages.typescript.ModuleKind.ESNext,
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    allowJs: true,
    checkJs: false, // Disable JS checking for performance
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
  });

  // Lighter diagnostics for JavaScript
  languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,  // Disable for performance
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  console.log('📝 JavaScript defaults configured');
};

const configureCSSDefaults = async () => {
  const { languages } = await import('monaco-editor');
  
  // Enhanced CSS configuration
  languages.css.cssDefaults.setOptions({
    validate: true,
    lint: {
      compatibleVendorPrefixes: 'warning',
      vendorPrefix: 'warning',
      duplicateProperties: 'warning',
      emptyRules: 'warning',
      importStatement: 'ignore',
      boxModel: 'ignore',
      universalSelector: 'ignore',
      zeroUnits: 'ignore',
      fontFaceProperties: 'warning',
      hexColorLength: 'error',
      argumentsInColorFunction: 'error',
      unknownProperties: 'warning',
      ieHack: 'ignore',
      unknownVendorSpecificProperties: 'ignore',
      propertyIgnoredDueToDisplay: 'warning',
      important: 'ignore',
      float: 'ignore',
      idSelector: 'ignore'
    }
  });

  console.log('🎨 CSS defaults configured');
};

const configureHTMLDefaults = async () => {
  const { languages } = await import('monaco-editor');
  
  // Enhanced HTML configuration
  languages.html.htmlDefaults.setOptions({
    format: {
      tabSize: 2,
      insertSpaces: true,
      wrapLineLength: 120,
      unformatted: 'default"',
      contentUnformatted: 'pre,code,textarea',
      indentInnerHtml: false,
      preserveNewLines: true,
      maxPreserveNewLines: 2,
      indentHandlebars: false,
      endWithNewline: false,
      extraLiners: 'head, body, /html',
      wrapAttributes: 'auto'
    },
    suggest: {
      html5: true,
      angular1: false,
      ionic: false
    }
  });

  console.log('🏷️ HTML defaults configured');
};

const configureJSONDefaults = async () => {
  const { languages } = await import('monaco-editor');
  
  // Enhanced JSON configuration
  languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: true,
    schemas: [],
    enableSchemaRequest: true,
    schemaRequest: 'warning',
    schemaValidation: 'warning',
    comments: 'ignore',
    trailingCommas: 'warning'
  });

  console.log('📄 JSON defaults configured');
};

// ================================
// MAIN CONFIGURATION FUNCTION
// ================================

export const configureMonaco = async (): Promise<boolean> => {
  try {
    console.log('🚀 Initializing Monaco Editor configuration...');
    
    // Step 1: Configure workers
    configureMonacoWorkers();
    
    // Step 2: Configure languages
    await configureMonacoLanguages();
    
    // Step 3: Initialize language service (this registers all languages)
    // Language service is already initialized on import
    
    console.log('✅ Monaco Editor fully configured with enhanced language support');
    return true;
  } catch (error) {
    console.error('❌ Failed to configure Monaco Editor:', error);
    return false;
  }
};

// ================================
// UTILITY FUNCTIONS
// ================================

// Legacy compatibility - enhanced version
export const getLanguageFromPath = (filePath: string): string => {
  return languageService.getLanguageByFilename(filePath.split('/').pop() || '');
};

// Get language display name
export const getLanguageDisplayName = (languageId: string): string => {
  const langDef = languageService.getLanguageDefinition(languageId);
  return langDef?.name || languageId;
};

// Check if language has enhanced features
export const hasEnhancedSupport = (languageId: string): boolean => {
  const langDef = languageService.getLanguageDefinition(languageId);
  return !!(langDef?.lsp || langDef?.worker || langDef?.treeSitter);
};

// Get all supported file extensions
export const getSupportedExtensions = (): string[] => {
  return languageService.getSupportedExtensions();
};

// Initialize configuration on import
configureMonaco().then(success => {
  if (success) {
    console.log('🎉 Monaco configuration completed successfully');
  } else {
    console.error('💥 Monaco configuration failed');
  }
}); 