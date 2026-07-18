import { useMe } from '@/lib/query/queries/auth.queries';
import {
  useLogin,
  useRegister,
  useLogout,
} from '@/lib/query/mutations/auth.mutations';
import { LoginRequest, RegisterRequest, UserProfile } from '@/types/auth';

export interface UseAuthReturn {
  // User data
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;

  // Auth actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;

  // Mutation states
  isLoginLoading: boolean;
  isRegisterLoading: boolean;
  isLogoutLoading: boolean;
  loginError: Error | null;
  registerError: Error | null;
}

export const useAuth = (options?: { fetchUser?: boolean }): UseAuthReturn => {
  const { data: user, isLoading, error } = useMe({ 
    enabled: options?.fetchUser ?? false 
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  return {
    // User data
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading,
    error,

    // Auth actions
    login: async (data: LoginRequest) => {
      await loginMutation.mutateAsync(data);
    },
    register: async (data: RegisterRequest) => {
      await registerMutation.mutateAsync(data);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },

    // Mutation states
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
};
