import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  // Monaco Editor optimization
  optimizeDeps: {
    include: ['@monaco-editor/react', 'monaco-editor'],
  },
  
  define: {
    // Monaco Editor global configuration
    global: 'globalThis',
  },

  // Fix Monaco Editor web worker issues
  worker: {
    format: 'es',
    plugins: () => [react(), tailwindcss()],
  },

  // Build configuration for Monaco workers
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    // Serve Monaco workers from node_modules
    fs: {
      allow: ['..'],
    },
  },
}));
