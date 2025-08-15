import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  server: {
    host: "0.0.0.0", // Allow connections from any IP
    port: parseInt(process.env.FRONTEND_PORT || '3000', 10),
    cors: true, // Allow CORS for all origins
    strictPort: false, // Allow fallback to other ports if specified port is busy
    hmr: {
      host: 'localhost'
    },
    proxy: {
      '/socket.io': {
        target: process.env.BACKEND_URL || `http://localhost:${process.env.BACKEND_PORT || '3001'}`,
        changeOrigin: true,
        ws: true,
        secure: false
      }
    }
  },
  plugins: [
    react(),
  ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
        supported: {
          'top-level-await': true
        },
      },
    },
    build: {
      target: 'esnext',
    },
    define: {
      // Pass environment variables to the client
      __BACKEND_PORT__: JSON.stringify(process.env.BACKEND_PORT || '3001'),
      __FRONTEND_PORT__: JSON.stringify(process.env.FRONTEND_PORT || '3000'),
    },
});
