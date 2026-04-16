import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

const proxyConfig = {
  target: "http://localhost:4096",
  changeOrigin: true,
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      "vscode-cf2d29b0-92f2-45ff-8639-8eda0fa478b9.cluster-12.preview.emergentcf.cloud",
      "vscode-034481c2-d2dc-495b-bca1-6b7907b391df.cluster-2.preview.emergentcf.cloud",
      ".emergentcf.cloud",
      ".emergentagent.com",
    ],
    proxy: {
      "/api/ai-assistant": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api": proxyConfig,
      "/global": proxyConfig,
      "/session": proxyConfig,
      "/config": proxyConfig,
      "/provider": proxyConfig,
      "/file": proxyConfig,
      "/pty": { ...proxyConfig, ws: true },
      "/ws": { ...proxyConfig, ws: true },
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
