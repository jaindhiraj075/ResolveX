import api from './api';

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  role?: string;
  department_id?: number | null;
  phone?: string;
  student_id_number?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  phone?: string;
}

export const authService = {
  async register(payload: RegisterPayload) {
    const response = await api.post('/api/auth/register', payload);
    return response.data;
  },

  async login(payload: LoginPayload) {
    const response = await api.post('/api/auth/login', payload);
    return response.data;
  },

  async logout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignored if offline or token expired
    } finally {
      localStorage.removeItem('resolvex_token');
      localStorage.removeItem('resolvex_user');
    }
  },

  async getMe() {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  async updateProfile(payload: ProfileUpdatePayload) {
    const response = await api.put('/api/auth/profile', payload);
    return response.data;
  },

  getToken(): string | null {
    return localStorage.getItem('resolvex_token');
  },

  setToken(token: string) {
    localStorage.setItem('resolvex_token', token);
  },

  getUser(): any {
    const stored = localStorage.getItem('resolvex_user');
    return stored ? JSON.parse(stored) : null;
  },

  setUser(user: any) {
    localStorage.setItem('resolvex_user', JSON.stringify(user));
  },
};

export default authService;
