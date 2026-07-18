export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  TIMEOUT: 30000, // 30 seconds
} as const;

export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    LOGIN: '/login',
    SIGNUP: '/signup',
  },
  PROTECTED: {
    EDITOR: '/editor',
  },
  AUTH: {
    AFTER_LOGIN: '/workspaces',
    AFTER_LOGOUT: '/login',
  },
} as const;
