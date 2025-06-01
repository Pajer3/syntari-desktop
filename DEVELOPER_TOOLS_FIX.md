# Developer Tools Fix for Syntari AI IDE

## Issues Resolved

### 1. File Explorer "No files found" Issue ✅ FIXED

**Problem**: The file explorer was showing "No files found" when opening directories that clearly contained files.

**Root Cause**: Missing Tauri backend commands that the frontend was trying to invoke:
- `scan_directories_only`
- `scan_files_chunked` 
- `get_directory_mtime`

**Solution**: Implemented all missing Tauri commands in `src-tauri/src/lib.rs`:

```rust
// Added these structs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryInfo { /* ... */ }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfoChunk { /* ... */ }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanFilesResult { /* ... */ }

// Added these commands
#[tauri::command]
async fn get_directory_mtime(path: String) -> Result<TauriResult<u64>, String>

#[tauri::command]
async fn scan_directories_only(path: String, max_depth: Option<u32>, ignore_patterns: Option<Vec<String>>) -> Result<TauriResult<Vec<DirectoryInfo>>, String>

#[tauri::command]
async fn scan_files_chunked(path: String, offset: usize, limit: usize, ignore_patterns: Option<Vec<String>>, include_hidden: Option<bool>) -> Result<TauriResult<ScanFilesResult>, String>
```

### 2. Developer Tools Crash Issue ✅ FIXED

**Problem**: Right-clicking and selecting "Inspect Element" would crash the application on Linux, and `"devtools": true` in tauri.conf.json caused configuration errors.

**Root Cause**: Two issues:
1. WebKit compositing mode conflicts with developer tools on Linux
2. `"devtools": true` property is not valid in Tauri 2.x configuration schema

**Solution**: Implemented the correct Tauri 2.x approach:

1. **Added devtools feature to Cargo.toml**:
   ```toml
   [dependencies]
   tauri = { version = "2.5.1", features = ["devtools"] }
   ```

2. **Programmatically open devtools in debug builds**:
   ```rust
   .setup(|app| {
       #[cfg(debug_assertions)] // Only enable devtools in debug builds
       {
           if let Some(window) = app.get_webview_window("main") {
               window.open_devtools();
               tracing::info!("Developer tools opened automatically in debug build");
           }
       }
       Ok(())
   })
   ```

3. **Use debug builds for development**:
   ```bash
   WEBKIT_DISABLE_COMPOSITING_MODE=1 npm run tauri dev --debug
   ```

## How to Use

### Quick Start (Recommended)

```bash
# Use the automated setup script
./dev-setup.sh
```

### Manual Commands

```bash
# Linux users - use this command for development
npm run tauri:dev

# Or manually set the environment variable
WEBKIT_DISABLE_COMPOSITING_MODE=1 npm run tauri dev

# For debug builds
npm run tauri:dev-debug
```

### Opening Developer Tools

Once the app is running with the fix:

1. **Right-click** anywhere in the app window
2. Select **"Inspect Element"**
3. Or use keyboard shortcuts:
   - **Linux/Windows**: `Ctrl + Shift + I`
   - **macOS**: `Cmd + Option + I`

## Technical Details

### WebKit Compositing Mode

The `WEBKIT_DISABLE_COMPOSITING_MODE=1` environment variable:

- ✅ **Fixes**: Developer tools crashes on Linux
- ✅ **Maintains**: Full debugging capabilities
- ⚠️ **May disable**: Some CSS effects like backdrop filters
- ✅ **Safe for**: Development and debugging

### File System Commands

The implemented commands provide:

- **Directory scanning** with configurable depth limits
- **File chunking** for performance with large directories  
- **Ignore patterns** for `.git`, `node_modules`, etc.
- **Hidden file filtering** options
- **Metadata caching** with modification time checks

## Verification

To verify both fixes are working:

1. **File Explorer**: 
   - Open the app
   - Navigate to any directory (e.g., `/home/pajer/anaconda3`)
   - Should see files and folders listed

2. **Developer Tools**:
   - Right-click in the app
   - Select "Inspect Element"
   - Should open without crashing

## References

- [Tauri GitHub Issue #3407](https://github.com/tauri-apps/tauri/issues/3407) - WebKit developer tools crash
- [Tauri 2.x Debug Documentation](https://v2.tauri.app/develop/debug/)
- [WebKit Compositing Mode Documentation](https://webkit.org/blog/3162/web-inspector-support-for-css-compositing/)

## Troubleshooting

If you still encounter issues:

1. **Clear caches**:
   ```bash
   cargo clean  # In src-tauri directory
   rm -rf node_modules && npm install
   ```

2. **Check environment**:
   ```bash
   echo $WEBKIT_DISABLE_COMPOSITING_MODE  # Should output: 1
   ```

3. **Verify Tauri version**:
   ```bash
   npm run tauri info
   ```

4. **Check for other WebKit issues**:
   ```bash
   # Try with additional WebKit flags if needed
   export WEBKIT_DISABLE_COMPOSITING_MODE=1
   export WEBKIT_DISABLE_DMABUF_RENDERER=1
   npm run tauri dev
   ``` 