import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/endpoints/auth';
import { LoginRequest, RegisterRequest, SessionResponse } from '@/types/auth';
import { authKeys } from '../queries/auth.queries';
import { ROUTES } from '@/lib/config';

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation<SessionResponse, Error, LoginRequest>({
    mutationFn: authApi.login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || ROUTES.AUTH.AFTER_LOGIN;
      window.location.href = redirectTo;
    },
    onError: (error) => {
      console.error('Login failed:', error);
    },
  });
};

export const useRegister = () => {
  const router = useRouter();

  return useMutation<{ message: string }, Error, RegisterRequest>({
    mutationFn: authApi.register,
    onSuccess: () => {
      router.push(ROUTES.PUBLIC.LOGIN);
    },
    onError: (error) => {
      console.error('Registration failed:', error);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      
      window.location.href = ROUTES.AUTH.AFTER_LOGOUT;
    },
  });
};

export const useRefreshToken = () => {
  return useMutation<SessionResponse, Error, void>({
    mutationFn: authApi.refresh,
  });
};
