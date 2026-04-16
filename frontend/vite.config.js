import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: false,  // Disable auto refresh
    allowedHosts: [
      ".emergentcf.cloud",
      ".emergentagent.com",
    ],
    proxy: {
      "/api/ai-assistant": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:4096",
        changeOrigin: true,
      },
      "/global": {
        target: "http://localhost:4096",
        changeOrigin: true,
      },
      "/session": {
        target: "http://localhost:4096",
        changeOrigin: true,
      },
      "/config": {
        target: "http://localhost:4096",
        changeOrigin: true,
      },
      "/provider": {
        target: "http://localhost:4096",
        changeOrigin: true,
      },
      "/file": {
        target: "http://localhost:4096",
        changeOrigin: true,
      },
      "/pty": {
        target: "http://localhost:4096",
        ws: true,
      },
      "/ws": {
        target: "http://localhost:4096",
        ws: true,
      },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          codemirror: ["@uiw/react-codemirror", "codemirror"],
        },
      },
    },
  },
})
