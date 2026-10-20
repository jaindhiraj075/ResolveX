import axios from 'axios';
import { formatErrorMessage } from '../utils/errorUtils';

// Resolve base URL from environment or default to relative path proxy.
// Trim trailing slash to avoid double-slash issues (e.g. https://api.com//api/auth/login).
const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token if stored
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('resolvex_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error extraction & 401 token expiration handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.friendlyMessage =
        'Unable to connect to the ResolveX server. Please check your network or verify the backend service is running.';
    } else {
      const status = error.response.status;
      const backendMsg =
        typeof error.response.data?.message === 'string'
          ? error.response.data.message
          : typeof error.response.data?.error === 'string'
          ? error.response.data.error
          : null;

      if (status === 401) {
        // Don't loop redirect if already on login or register
        const isAuthPage =
          window.location.pathname.startsWith('/login') ||
          window.location.pathname.startsWith('/register');

        if (!isAuthPage) {
          localStorage.removeItem('resolvex_token');
          localStorage.removeItem('resolvex_user');

          window.dispatchEvent(
            new CustomEvent('resolvex:session_expired', {
              detail: { message: 'Your session has expired. Please sign in again.' },
            })
          );
        }
        error.friendlyMessage = backendMsg || 'Authentication required or credentials invalid. Please sign in.';
      } else if (status === 403) {
        error.friendlyMessage = backendMsg || 'Access denied: You do not have permission for this resource.';
      } else if (status === 404) {
        // Helpful diagnostic message for production setups (e.g. Vercel)
        error.friendlyMessage =
          backendMsg ||
          'API endpoint not found (HTTP 404). If running on a static host like Vercel, ensure the backend API is deployed and VITE_API_BASE_URL is configured.';
      } else if (status === 422) {
        error.friendlyMessage = backendMsg || 'Validation error: Please review the submitted information.';
      } else if (status === 413) {
        error.friendlyMessage = backendMsg || 'The submitted payload or file exceeds the allowed size limit.';
      } else if (status === 500) {
        error.friendlyMessage = 'An internal server error occurred. Please try again shortly.';
      } else if (status === 502 || status === 503) {
        error.friendlyMessage =
          'ResolveX backend service is initializing or temporarily unreachable. Please retry momentarily.';
      } else {
        error.friendlyMessage = backendMsg || formatErrorMessage(error);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts a safe, user-friendly error string without leaking internals or raw stack traces.
 * Always returns a primitive string.
 */
export function getErrorMessage(error: any): string {
  return formatErrorMessage(error);
}

export default api;

