import client from '../client';
import {
  LoginRequest,
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
