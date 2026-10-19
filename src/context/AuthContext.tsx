import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import authService, { LoginPayload, RegisterPayload, ProfileUpdatePayload } from '../services/authService';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  department_id?: number | null;
  department_name?: string | null;
  phone?: string | null;
  student_id_number?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  role: 'STUDENT' | 'STAFF' | 'ADMIN' | null;
  isAuthenticated: boolean;
  loading: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<any>;
  register: (payload: RegisterPayload) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<any>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getUser());
  const [token, setToken] = useState<string | null>(() => authService.getToken());
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      if (response?.data?.user) {
        setUser(response.data.user);
        authService.setUser(response.data.user);
      }
    } catch {
      // Ignored
    }
  }, []);

  // Synchronize authentication status with backend
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = authService.getToken();
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();
        if (response?.data?.user) {
          setUser(response.data.user);
          authService.setUser(response.data.user);
        }
      } catch (err: any) {
        // Only invalidate if the backend explicitly returned 401 Unauthorized (invalid or expired token)
        if (err?.response?.status === 401) {
          await authService.logout();
          setUser(null);
          setToken(null);
        } else {
          // If server is initializing (502) or network is reconnecting, retain cached session
          console.warn('[ResolveX Auth] Backend verification deferred, maintaining existing session:', err?.message);
        }
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  // Listen for session expiration events from api interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1';
      }
    };

    window.addEventListener('resolvex:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('resolvex:session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (credentials: LoginPayload) => {
    const response = await authService.login(credentials);
    const receivedToken = response?.data?.token || response?.token;
    const receivedUser = response?.data?.user || response?.user;

    if (receivedToken && receivedUser) {
      authService.setToken(receivedToken);
      authService.setUser(receivedUser);
      setToken(receivedToken);
      setUser(receivedUser);
    }
    return response;
  };

  const register = async (payload: RegisterPayload) => {
    const response = await authService.register(payload);
    if (response?.data) {
      const { token: receivedToken, user: receivedUser } = response.data;
      authService.setToken(receivedToken);
      authService.setUser(receivedUser);
      setToken(receivedToken);
      setUser(receivedUser);
    }
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (payload: ProfileUpdatePayload) => {
    const response = await authService.updateProfile(payload);
    if (response?.data?.user) {
      setUser(response.data.user);
      authService.setUser(response.data.user);
    }
    return response;
  };

  const value: AuthContextType = {
    user,
    token,
    role: (user?.role as 'STUDENT' | 'STAFF' | 'ADMIN') || null,
    isAuthenticated: !!token && !!user,
    loading,
    isLoading: loading,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
