export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  TIMEOUT: 30000, // 30 seconds
} as const;

export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    LOGIN: '/login',
    SIGNUP: '/signup',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    VERIFY_EMAIL: '/verify-email',
  },
  PROTECTED: {
    EDITOR: '/editor',
  },
  AUTH: {
    AFTER_LOGIN: '/workspaces',
    AFTER_LOGOUT: '/login',
  },
} as const;

export const PUBLIC_ROUTES = new Set<string>(Object.values(ROUTES.PUBLIC));
export const AUTH_ENTRY_ROUTES = new Set<string>([
  ROUTES.PUBLIC.LOGIN,
  ROUTES.PUBLIC.SIGNUP,
]);
