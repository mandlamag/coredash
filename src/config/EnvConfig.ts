/**
 * Environment configuration for LedgerCore Dashboard
 * 
 * This file provides a centralized way to access environment variables
 * and provides fallback values for development.
 * 
 * Supports three ways of configuration:
 * 1. Default hardcoded values (fallback)
 * 2. Runtime environment variables via window.__ENV__ (for Docker)
 * 3. Build-time environment variables (for production builds)
 */

// Define the type for our environment variables
interface EnvConfig {
  // API URLs
  API_URL: string;
  GRAPHQL_API_URL: string;
  
  // Neo4j Connection Defaults
  DEFAULT_NEO4J_URL: string;
  DEFAULT_NEO4J_PORT: string;
  DEFAULT_NEO4J_DATABASE: string;
  
  // Application Settings
  DEFAULT_DASHBOARD_TITLE: string;
  ALLOW_QUERIES_WITHOUT_LOGIN: boolean;
  
  // Branding
  DASHBOARD_HEADER_COLOR: string;
  DASHBOARD_HEADER_BUTTON_COLOR: string;
  DASHBOARD_HEADER_TITLE_COLOR: string;
}

// Default configuration values (fallback)
const DEFAULT_CONFIG: EnvConfig = {
  // API URLs
  API_URL: 'http://localhost:8080/api',
  GRAPHQL_API_URL: 'http://localhost:8080/graphql',
  
  // Neo4j Connection Defaults
  DEFAULT_NEO4J_URL: 'localhost',
  DEFAULT_NEO4J_PORT: '7687',
  DEFAULT_NEO4J_DATABASE: 'neo4j',
  
  // Application Settings
  DEFAULT_DASHBOARD_TITLE: 'New dashboard',
  ALLOW_QUERIES_WITHOUT_LOGIN: true,
  
  // Branding
  DASHBOARD_HEADER_COLOR: '#0B297D',
  DASHBOARD_HEADER_BUTTON_COLOR: '',
  DASHBOARD_HEADER_TITLE_COLOR: '#FFFFFF',
};

// Check for runtime environment variables (for Docker)
declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

// Function to get environment variables with type conversion
function getEnvValue<T>(key: string, defaultValue: T): T {
  // First check window.__ENV__ (for Docker runtime injection)
  if (window.__ENV__ && window.__ENV__[key] !== undefined) {
    const value = window.__ENV__[key];
    // Type conversion based on default value type
    if (typeof defaultValue === 'boolean') {
      return (value.toLowerCase() === 'true') as unknown as T;
    }
    return value as unknown as T;
  }
  
  // Return default value if not found
  return defaultValue;
}

// Build the configuration object
const ENV_CONFIG: EnvConfig = {
  // API URLs
  API_URL: getEnvValue('API_URL', DEFAULT_CONFIG.API_URL),
  GRAPHQL_API_URL: getEnvValue('GRAPHQL_API_URL', DEFAULT_CONFIG.GRAPHQL_API_URL),
  
  // Neo4j Connection Defaults
  DEFAULT_NEO4J_URL: getEnvValue('DEFAULT_NEO4J_URL', DEFAULT_CONFIG.DEFAULT_NEO4J_URL),
  DEFAULT_NEO4J_PORT: getEnvValue('DEFAULT_NEO4J_PORT', DEFAULT_CONFIG.DEFAULT_NEO4J_PORT),
  DEFAULT_NEO4J_DATABASE: getEnvValue('DEFAULT_NEO4J_DATABASE', DEFAULT_CONFIG.DEFAULT_NEO4J_DATABASE),
  
  // Application Settings
  DEFAULT_DASHBOARD_TITLE: getEnvValue('DEFAULT_DASHBOARD_TITLE', DEFAULT_CONFIG.DEFAULT_DASHBOARD_TITLE),
  ALLOW_QUERIES_WITHOUT_LOGIN: getEnvValue('ALLOW_QUERIES_WITHOUT_LOGIN', DEFAULT_CONFIG.ALLOW_QUERIES_WITHOUT_LOGIN),
  
  // Branding
  DASHBOARD_HEADER_COLOR: getEnvValue('DASHBOARD_HEADER_COLOR', DEFAULT_CONFIG.DASHBOARD_HEADER_COLOR),
  DASHBOARD_HEADER_BUTTON_COLOR: getEnvValue('DASHBOARD_HEADER_BUTTON_COLOR', DEFAULT_CONFIG.DASHBOARD_HEADER_BUTTON_COLOR),
  DASHBOARD_HEADER_TITLE_COLOR: getEnvValue('DASHBOARD_HEADER_TITLE_COLOR', DEFAULT_CONFIG.DASHBOARD_HEADER_TITLE_COLOR),
};

// Export all configuration values
export const API_URL = ENV_CONFIG.API_URL;
export const GRAPHQL_API_URL = ENV_CONFIG.GRAPHQL_API_URL;

export const DEFAULT_NEO4J_URL = ENV_CONFIG.DEFAULT_NEO4J_URL;
export const DEFAULT_NEO4J_PORT = ENV_CONFIG.DEFAULT_NEO4J_PORT;
export const DEFAULT_NEO4J_DATABASE = ENV_CONFIG.DEFAULT_NEO4J_DATABASE;

export const DEFAULT_DASHBOARD_TITLE = ENV_CONFIG.DEFAULT_DASHBOARD_TITLE;
export const ALLOW_QUERIES_WITHOUT_LOGIN = ENV_CONFIG.ALLOW_QUERIES_WITHOUT_LOGIN;

export const DASHBOARD_HEADER_COLOR = ENV_CONFIG.DASHBOARD_HEADER_COLOR;
export const DASHBOARD_HEADER_BUTTON_COLOR = ENV_CONFIG.DASHBOARD_HEADER_BUTTON_COLOR;
export const DASHBOARD_HEADER_TITLE_COLOR = ENV_CONFIG.DASHBOARD_HEADER_TITLE_COLOR;

// For debugging
const isDevelopment = true; // In production build, this would be set to false

// Log configuration in development mode
if (isDevelopment) {
  console.log('EnvConfig loaded with:', {
    API_URL,
    GRAPHQL_API_URL,
    DEFAULT_NEO4J_URL,
    DEFAULT_NEO4J_PORT,
    DEFAULT_NEO4J_DATABASE,
    ALLOW_QUERIES_WITHOUT_LOGIN,
  });
}
