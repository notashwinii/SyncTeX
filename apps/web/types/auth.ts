// Auth Request Types
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface EmailRequest {
  email: string;
}

export interface PasswordResetRequest {
  token: string;
  password: string;
}

export interface SessionResponse {
  expires_in: number;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
}

export interface UserProfile {
  user_id: string;
  username: string;
}

// JWT Claims Types
export interface Claims {
  user_id: string;
  username: string;
  session_id: string;
  exp?: number;
  iat?: number;
  iss?: string;
  sub?: string;
}

// Auth Error Types
export interface AuthError {
  message: string;
}

// Auth State Types (for context/store)
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
