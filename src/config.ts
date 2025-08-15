// Client-side configuration for ChessSpace
// This file handles dynamic server URL configuration for deployment

// Global variables defined by Vite
declare const __BACKEND_PORT__: string;
declare const __FRONTEND_PORT__: string;

interface ClientConfig {
  serverUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

// Get the backend URL dynamically based on environment
const getBackendUrl = (): string => {
  // Check for environment variable first
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // In development, use Vite proxy (dynamic port)
  if (import.meta.env.DEV) {
    const devPort = import.meta.env.VITE_FRONTEND_PORT || __FRONTEND_PORT__ || '3000';
    return `http://localhost:${devPort}`; // Vite proxy
  }
  
  // In production, use the same hostname as the frontend
  const hostname = window.location.hostname;
  const port = import.meta.env.VITE_BACKEND_PORT || __BACKEND_PORT__ || '3001';
  
  // If running on same domain, use relative URL
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${hostname}:${port}`;
  }
  
  // For production deployment, use the same hostname
  return `http://${hostname}:${port}`;
};

const config: ClientConfig = {
  serverUrl: getBackendUrl(),
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD
};

export default config;
