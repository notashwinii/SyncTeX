import client from '../client';
import { UserSearchResult } from '@/types/user';

export const userApi = {
  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    const response = await client.get<UserSearchResult[]>('/users/search', {
      params: { q: query },
    });
    return response.data;
  },

  getUserByEmail: async (email: string): Promise<UserSearchResult | null> => {
    try {
      const response = await client.get<UserSearchResult>(`/users/email/${encodeURIComponent(email)}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  getUserById: async (id: string): Promise<UserSearchResult | null> => {
    try {
      const response = await client.get<UserSearchResult>(`/users/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },
};
