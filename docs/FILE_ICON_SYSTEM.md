# 🎨 Syntari AI IDE File Icon System

## Overview

The Syntari AI IDE features a comprehensive file icon system with **1000+ SVG icons** that automatically assigns appropriate icons to files based on their extensions and specific filenames. This system provides a rich visual experience in the file explorer and throughout the IDE.

## 🚀 Features

- **1000+ SVG Icons**: Comprehensive collection covering virtually all file types
- **Smart Mapping**: Maps file extensions and exact filenames to appropriate icons
- **Fallback System**: Ensures every file gets an appropriate icon
- **Light Theme Support**: Many icons have light theme variants
- **Performance Optimized**: Lazy loading and error handling
- **Type Safe**: Full TypeScript support with proper interfaces
- **Extensible**: Easy to add new mappings and icons

## 📁 Architecture

### Core Files

```
src/
├── config/
│   └── fileIconMap.ts          # Main configuration mapping
├── hooks/
│   └── useFileIcon.ts          # React hooks for icon usage
├── components/
│   └── ui/
│       ├── FileIcon.tsx        # Original Material Design component
│       └── EnhancedFileIcon.tsx # New SVG-based component
├── assets/                     # 1000+ SVG icon files
│   ├── file_type_*.svg        # File type specific icons
│   ├── default_file.svg       # Default file fallback
│   ├── default_folder.svg     # Default folder icon
│   └── ...
└── demo/
    └── FileIconDemo.tsx        # Interactive demonstration
```

## 🔧 Basic Usage

### Using the Enhanced File Icon Component

```tsx
import { EnhancedFileIcon } from '../components/ui/EnhancedFileIcon';

// Basic file icon
<EnhancedFileIcon 
  fileName="app.tsx" 
  size={24} 
/>

// Directory icon
<EnhancedFileIcon 
  fileName="components" 
  isDirectory={true}
  isOpen={false}
  size={20} 
/>

// With error handling
<EnhancedFileIcon 
  fileName="config.json" 
  size={16}
  onError={(filename, error) => console.warn('Icon failed:', filename, error)}
/>
```

### Using the React Hook

```tsx
import { useFileIcon } from '../hooks/useFileIcon';

function MyFileComponent({ filename }: { filename: string }) {
  const { iconFilename, iconPath, iconType, isDefault } = useFileIcon({
    filename,
    isDirectory: false,
    preferLightIcons: true
  });

  return (
    <div>
      <img src={iconPath} alt={filename} />
      <span>Type: {iconType}</span>
      {isDefault && <span>Using default icon</span>}
    </div>
  );
}
```

## 📋 Configuration System

### File Extension Mapping

The system supports both extension-based and filename-based mapping:

```typescript
// Extension-based mapping
const FILE_ICON_MAP = {
  'js': 'file_type_js.svg',
  'tsx': 'file_type_reactts.svg',
  'py': 'file_type_python.svg',
  'rs': 'file_type_rust.svg',
  // ... 200+ more mappings
};

// Exact filename mapping
'package.json': 'file_type_npm.svg',
'tsconfig.json': 'file_type_tsconfig.svg',
'Dockerfile': 'file_type_docker.svg',
```

### Fallback System

```typescript
const FALLBACK_ICONS = {
  default: 'default_file.svg',
  directory: 'default_folder.svg',
  directoryOpen: 'default_folder_opened.svg',
  binary: 'file_type_binary.svg',
  text: 'file_type_text.svg',
};
```

## 🎯 Supported File Types

### Programming Languages (50+)
- **JavaScript**: `js`, `mjs`, `cjs` → `file_type_js.svg`
- **TypeScript**: `ts`, `tsx` → `file_type_typescript.svg`, `file_type_reactts.svg`
- **Python**: `py`, `pyc`, `pyw` → `file_type_python.svg`
- **Rust**: `rs` → `file_type_rust.svg`
- **Go**: `go` → `file_type_go.svg`
- **Java**: `java` → `file_type_java.svg`
- **C/C++**: `c`, `cpp`, `h`, `hpp` → `file_type_c.svg`, `file_type_cpp.svg`
- **And many more...**

### Web Technologies (30+)
- **HTML**: `html`, `htm` → `file_type_html.svg`
- **CSS**: `css`, `scss`, `sass`, `less` → `file_type_css.svg`, `file_type_scss.svg`
- **Frameworks**: `vue`, `svelte`, `astro` → `file_type_vue.svg`, etc.

### Configuration Files (40+)
- **JSON**: `json`, `json5`, `jsonld` → `file_type_json.svg`
- **YAML**: `yaml`, `yml` → `file_type_yaml.svg`
- **Environment**: `.env`, `.env.local` → `file_type_dotenv.svg`
- **Build Tools**: `webpack.config.js`, `vite.config.ts` → specific icons

### Documentation (10+)
- **Markdown**: `md`, `mdx` → `file_type_markdown.svg`
- **Text**: `txt`, `rst` → `file_type_text.svg`
- **Documentation**: `README.md`, `CHANGELOG.md` → specific icons

### And Many More...
- **Database**: SQL, SQLite, PostgreSQL files
- **Mobile**: Swift, Kotlin, Flutter files  
- **Game Development**: Unity, Godot files
- **DevOps**: Docker, Kubernetes, CI/CD files
- **Archives**: ZIP, RAR, TAR files
- **Media**: Images, videos, audio files

## 🔍 Advanced Usage

### Multiple Icons at Once

```tsx
import { useFileIcons } from '../hooks/useFileIcon';

const files = [
  { filename: 'app.js' },
  { filename: 'styles.css' },
  { filename: 'components', isDirectory: true }
];

const iconResults = useFileIcons(files);
// Returns array of icon information for each file
```

### Icon Statistics

```tsx
import { useIconStats } from '../hooks/useFileIcon';

const filenames = ['app.js', 'style.css', 'unknown.xyz'];
const stats = useIconStats(filenames);

console.log({
  total: stats.total,                    // 3
  withSpecificIcons: stats.withSpecificIcons, // 2
  usingDefaults: stats.usingDefaults,    // 1
  byType: stats.byType                   // { js: 1, css: 1, xyz: 1 }
});
```

### Custom Error Handling

```tsx
<EnhancedFileIcon
  fileName="config.json"
  onError={(filename, error) => {
    // Log to analytics
    analytics.track('icon_load_error', { filename, error: error.message });
    
    // Show fallback UI
    showToast(`Failed to load icon for ${filename}`);
  }}
/>
```

## 🎨 Styling and Themes

### CSS Classes Applied

The enhanced file icon system applies several CSS classes for styling:

```css
.enhanced-file-icon {
  /* Base icon styles */
}

.enhanced-file-icon.file {
  /* File-specific styles */
}

.enhanced-file-icon.directory {
  /* Directory-specific styles */
}

.enhanced-file-icon.is-specific {
  /* When using a specific icon (not default) */
  opacity: 1;
}

.enhanced-file-icon.is-default {
  /* When using default fallback icon */
  opacity: 0.8;
}
```

### Light Theme Support

Many icons have light theme variants:

```tsx
<EnhancedFileIcon
  fileName="config.toml"
  preferLightIcons={true}  // Will use file_type_light_toml.svg if available
/>
```

## 🔧 Integration with File Explorer

### Example Integration

```tsx
// In your file explorer component
import { EnhancedFileIcon } from '../components/ui/EnhancedFileIcon';

function FileTreeItem({ file }: { file: FileNode }) {
  return (
    <div className="file-tree-item">
      <EnhancedFileIcon
        fileName={file.name}
        isDirectory={file.isDirectory}
        isOpen={file.isExpanded}
        size={16}
        className="file-icon"
      />
      <span className="file-name">{file.name}</span>
    </div>
  );
}
```

### Performance Considerations

For large file lists, consider using:

```tsx
import { InlineFileIcon } from '../components/ui/EnhancedFileIcon';

// Optimized for rendering many icons
<InlineFileIcon fileName={file.name} size={14} />
```

## 📊 Icon Coverage Statistics

Current coverage includes:

- **Total Mappings**: 200+ explicit mappings
- **File Extensions**: 150+ unique extensions  
- **Specific Files**: 50+ exact filename matches
- **Categories**: 15+ major categories (programming, web, config, docs, etc.)
- **Fallback Coverage**: 100% (every file gets an icon)

## 🚀 Performance Features

### Lazy Loading
Icons are loaded on-demand using Vite's asset import system.

### Error Handling
Graceful fallbacks when icons fail to load.

### Caching
Browser caches SVG files for improved performance.

### Bundle Optimization
Only icons that are actually used get included in the build.

## 🔄 Adding New Icons

### Step 1: Add SVG File
Place your new SVG file in `src/assets/` following the naming convention:
```
file_type_newlanguage.svg
file_type_light_newlanguage.svg  (optional light variant)
```

### Step 2: Update Configuration
Add mapping in `src/config/fileIconMap.ts`:
```typescript
const FILE_ICON_MAP = {
  // ... existing mappings
  'newext': 'file_type_newlanguage.svg',
  'specific-file.config': 'file_type_newlanguage.svg',
};
```

### Step 3: Test
Use the demo component to test your new icons:
```tsx
import FileIconDemo from '../components/demo/FileIconDemo';
```

## 🧪 Testing

### Demo Component
Run the interactive demo to test icon mappings:

```bash
# Navigate to the demo route in your app
/demo/file-icons
```

### Manual Testing
```tsx
import { getFileIcon, hasSpecificIcon } from '../config/fileIconMap';

// Test specific files
console.log(getFileIcon('app.tsx'));        // file_type_reactts.svg
console.log(hasSpecificIcon('tsx'));        // true
console.log(getFileIcon('unknown.xyz'));    // default_file.svg
```

## 🔍 Troubleshooting

### Icon Not Loading
1. Check if SVG file exists in `src/assets/`
2. Verify filename in `fileIconMap.ts` matches exactly
3. Check browser console for import errors
4. Ensure file extension is mapped correctly

### Performance Issues
1. Use `InlineFileIcon` for large lists
2. Consider icon size (smaller = faster)
3. Implement virtualization for 1000+ items
4. Monitor bundle size if adding many custom icons

### Styling Issues
1. Check CSS class names match documentation
2. Verify size props are being applied
3. Test with both light and dark themes
4. Ensure proper contrast ratios

## 📚 API Reference

### `getFileIcon(filename, isDirectory?, isOpen?)`
Returns the appropriate SVG filename for a given file.

### `useFileIcon(options)`
React hook that returns icon information and paths.

### `useFileIcons(files)`
Batch version for multiple files.

### `useIconStats(filenames)`
Returns statistics about icon coverage.

### `hasSpecificIcon(extension)`
Checks if a specific icon exists for an extension.

---

**Built for the Syntari AI IDE** - Delivering enterprise-grade visual experiences with intelligent file recognition. 