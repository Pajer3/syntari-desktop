#!/bin/bash

# Syntari AI IDE - Development Setup Script
# Handles Linux WebKit issues and provides convenient development commands

set -e

echo "🚀 Syntari AI IDE - Development Setup"
echo "======================================"

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "📱 Detected OS: ${MACHINE}"

# Check if we're on Linux and need WebKit fix
if [ "${MACHINE}" = "Linux" ]; then
    echo "🐧 Linux detected - applying WebKit compositing fix"
    export WEBKIT_DISABLE_COMPOSITING_MODE=1
    echo "✅ WEBKIT_DISABLE_COMPOSITING_MODE=1 set"
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Check if Rust dependencies are built
if [ ! -d "src-tauri/target" ]; then
    echo "🦀 First time setup - Rust compilation may take several minutes..."
fi

echo ""
echo "🎯 Starting development server..."
echo "   - File explorer: ✅ Fixed (missing Tauri commands implemented)"
echo "   - Developer tools: ✅ Fixed (using debug builds + devtools feature)"
echo "   - Developer tools will open automatically in debug builds"
echo "   - Right-click → Inspect Element also available"
echo ""

# Start the development server
if [ "${MACHINE}" = "Linux" ]; then
    echo "🔧 Using Linux-optimized debug command..."
    WEBKIT_DISABLE_COMPOSITING_MODE=1 npm run tauri dev --debug
else
    echo "🔧 Using standard debug command..."
    npm run tauri dev --debug
fi 