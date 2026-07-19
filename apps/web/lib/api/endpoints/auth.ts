import client from '../client';
import {
  LoginRequest,
  EmailRequest,
  PasswordResetRequest,
  RegisterRequest,
  SessionResponse,
  UserProfile,
} from '@/types/auth';

// Auth API endpoints
export const authApi = {
  login: async (data: LoginRequest): Promise<SessionResponse> => {
    const response = await client.post<SessionResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<{ message: string }> => {
    const response = await client.post<{ message: string }>(
      '/auth/register',
      data
    );
    return response.data;
  },

  resendVerification: async (
    data: EmailRequest
  ): Promise<{ message: string }> => {
    const response = await client.post<{ message: string }>(
      '/auth/verification/resend',
      data
    );
    return response.data;
  },

  confirmVerification: async (token: string): Promise<{ message: string }> => {
    const response = await client.post<{ message: string }>(
      '/auth/verification/confirm',
      { token }
    );
    return response.data;
  },

  forgotPassword: async (
    data: EmailRequest
  ): Promise<{ message: string }> => {
    const response = await client.post<{ message: string }>(
      '/auth/password/forgot',
      data
    );
    return response.data;
  },

  resetPassword: async (
    data: PasswordResetRequest
  ): Promise<{ message: string }> => {
    const response = await client.post<{ message: string }>(
      '/auth/password/reset',
      data
    );
    return response.data;
  },

  refresh: async (): Promise<SessionResponse> => {
    const response = await client.post<SessionResponse>('/auth/refresh', {});
    return response.data;
  },

  getMe: async (): Promise<UserProfile> => {
    const response = await client.get<UserProfile>('/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await client.post('/auth/logout', {});
  },
};
