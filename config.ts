// Configuration file for ChessSpace deployment
// Update these values based on your server's available ports

// Load environment variables first
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from the root directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

interface Config {
  server: {
    port: number;
    host: string;
  };
  client: {
    port: number;
    serverUrl: string;
  };
  isProduction: boolean;
  socket: {
    cors: {
      origin: string;
      methods: string[];
    };
  };
}

// Get dynamic server URL based on environment
const getServerUrl = (): string => {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  
  const host = process.env.BACKEND_HOST || '0.0.0.0';
  const port = process.env.BACKEND_PORT || '3001';
  
  // If host is 0.0.0.0, use localhost for URL
  const urlHost = host === '0.0.0.0' ? 'localhost' : host;
  return `http://${urlHost}:${port}`;
};

// Get dynamic client URL based on environment
const getClientUrl = (): string => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  const host = process.env.FRONTEND_HOST || 'localhost';
  const port = process.env.FRONTEND_PORT || '3000';
  return `http://${host}:${port}`;
};

const config: Config = {
  // Backend configuration
  server: {
    port: parseInt(process.env.BACKEND_PORT || '3001', 10),
    host: process.env.BACKEND_HOST || '0.0.0.0'
  },
  
  // Frontend configuration
  client: {
    port: parseInt(process.env.FRONTEND_PORT || '3000', 10),
    // Backend URL for frontend to connect to
    serverUrl: getServerUrl()
  },
  
  // Development vs Production
  isProduction: process.env.NODE_ENV === 'production',
  
  // Socket.IO configuration
  socket: {
    cors: {
      origin: getClientUrl(),
      methods: ["GET", "POST"]
    }
  }
};

export default config;
