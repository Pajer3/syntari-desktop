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

  // Only log once during initial setup
  // console.log('🚀 Monaco workers configured for enhanced language support');
};

// ================================
// LANGUAGE CONFIGURATION
// ================================

export const configureMonacoLanguages = async () => {
  try {
    // Get all supported languages from our language service
    const supportedLanguages = getAllSupportedLanguages();
    
    // Reduce logging frequency
    // console.log(`🔧 Configuring ${supportedLanguages.length} languages for Monaco Editor`);
    
    // Configure specific language features
    await configureTypeScriptDefaults();
    await configureJavaScriptDefaults();
    await configureCSSDefaults();
    await configureHTMLDefaults();
    await configureJSONDefaults();
    
    // console.log('✅ Monaco language configuration complete');
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
  
  // Enhanced TypeScript compiler options
  languages.typescript.typescriptDefaults.setCompilerOptions({
    target: languages.typescript.ScriptTarget.ES2020,
    lib: [
      'ES2020',
      'DOM',
      'DOM.Iterable',
      'WebWorker'
    ],
    allowNonTsExtensions: true,
    moduleResolution: languages.typescript.ModuleResolutionKind.NodeJs,
    module: languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: languages.typescript.JsxEmit.ReactJSX,
    reactNamespace: 'React',
    allowJs: true,
    checkJs: false,
    allowSyntheticDefaultImports: true,
    strict: true,
    noImplicitAny: false,
    strictNullChecks: true,
    strictFunctionTypes: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
    isolatedModules: true,
    useDefineForClassFields: true
  });
  
  // Enhanced TypeScript diagnostics options
  languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    onlyVisible: true
  });

  // Reduced logging
  // console.log('📝 TypeScript defaults configured');
};

const configureJavaScriptDefaults = async () => {
  const { languages } = await import('monaco-editor');
  
  // Enhanced JavaScript compiler options
  languages.typescript.javascriptDefaults.setCompilerOptions({
    target: languages.typescript.ScriptTarget.ES2020,
    lib: [
      'ES2020',
      'DOM',
      'DOM.Iterable',
      'WebWorker'
    ],
    allowNonTsExtensions: true,
    moduleResolution: languages.typescript.ModuleResolutionKind.NodeJs,
    module: languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: languages.typescript.JsxEmit.ReactJSX,
    allowJs: true,
    checkJs: true,
    allowSyntheticDefaultImports: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    skipLibCheck: true,
    resolveJsonModule: true
  });
  
  // Enhanced JavaScript diagnostics
  languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    onlyVisible: true
  });

  // console.log('📝 JavaScript defaults configured');
};

const configureCSSDefaults = async () => {
  const { languages } = await import('monaco-editor');
  
  // Enhanced CSS validation and IntelliSense
  languages.css.cssDefaults.setOptions({
    validate: true,
    lint: {
      compatibleVendorPrefixes: 'warning',
      vendorPrefix: 'warning',
      duplicateProperties: 'warning',
      emptyRulesets: 'warning',
      importStatement: 'warning',
      boxModel: 'warning',
      universalSelector: 'warning',
      zeroUnits: 'warning',
      fontFaceProperties: 'warning',
      hexColorLength: 'warning',
      argumentsInColorFunction: 'warning',
      unknownProperties: 'warning',
      ieHack: 'warning',
      unknownVendorSpecificProperties: 'warning',
      propertyIgnoredDueToDisplay: 'warning',
      important: 'warning',
      float: 'warning',
      idSelector: 'warning'
    },
    completion: {
      triggerPropertyValueCompletion: true,
      completePropertyWithSemicolon: true
    },
    hover: {
      documentation: true,
      references: true
    },
    documentSymbols: true
  });

  // console.log('🎨 CSS defaults configured');
};

const configureHTMLDefaults = async () => {
  const { languages } = await import('monaco-editor');
  
  // Enhanced HTML configuration
  languages.html.htmlDefaults.setOptions({
    format: {
      tabSize: 2,
      insertSpaces: true,
      wrapLineLength: 120,
      unformatted: 'default',
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
    },
    validate: true,
    autoClosingTags: true,
    autoCreateQuotes: true,
    completion: {
      attributeDefaultValue: 'doublequotes'
    }
  });

  // console.log('🏷️ HTML defaults configured');
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
    comments: 'warning',
    trailingCommas: 'warning'
  });

  // console.log('📄 JSON defaults configured');
};

// ================================
// MAIN CONFIGURATION FUNCTION
// ================================

export const configureMonaco = async (): Promise<boolean> => {
  try {
    // Reduced startup logging
    // console.log('🚀 Initializing Monaco Editor configuration...');
    
    // Step 1: Configure workers
    configureMonacoWorkers();
    
    // Step 2: Configure languages
    await configureMonacoLanguages();
    
    // Step 3: Initialize language service (this registers all languages)
    // Language service is already initialized on import
    
    // Only log successful completion
    // console.log('✅ Monaco Editor fully configured with enhanced language support');
    return true;
  } catch (error) {
    console.error('❌ Failed to configure Monaco Editor:', error);
    return false;
  }
};

// ================================
// MONACO CONFIGURATION COMPLETION HANDLER
// ================================

export const handleMonacoConfigurationComplete = (): void => {
  try {
    // Final configuration steps
    const completionTime = performance.now();
    
    // Log completion only once
    // console.log('🎉 Monaco configuration completed successfully');
    
    // Emit configuration complete event
    const event = new CustomEvent('monaco-configuration-complete', {
      detail: { 
        timestamp: completionTime,
        status: 'success' 
      }
    });
    window.dispatchEvent(event);
    
  } catch (error) {
    console.error('❌ Error in Monaco configuration completion:', error);
  }
};

// ================================
// UTILITY FUNCTIONS
// ================================

// Legacy compatibility - re-export from language service
export { getLanguageFromPath } from '../services/languageService';

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