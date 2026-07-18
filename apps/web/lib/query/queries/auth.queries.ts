import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api/endpoints/auth';
import { UserProfile } from '@/types/auth';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export const useMe = (options?: { enabled?: boolean }) => {
  return useQuery<UserProfile, Error>({
    queryKey: authKeys.me(),
    queryFn: authApi.getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: options?.enabled ?? true,
  });
};
