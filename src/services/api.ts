import axios from 'axios';

// Resolve base URL from environment or default to relative path proxy
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
      error.friendlyMessage = 'Unable to connect to the server. Please check your network connection.';
    } else {
      const status = error.response.status;
      const backendMsg = error.response.data?.message;

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
        error.friendlyMessage = backendMsg || 'Authentication required. Please sign in.';
      } else if (status === 403) {
        error.friendlyMessage = backendMsg || 'Access denied: You do not have permission for this resource.';
      } else if (status === 404) {
        error.friendlyMessage = backendMsg || 'The requested resource was not found.';
      } else if (status === 422) {
        error.friendlyMessage = backendMsg || 'Validation error: Please review the submitted information.';
      } else if (status === 413) {
        error.friendlyMessage = backendMsg || 'The submitted payload or file exceeds the allowed size limit.';
      } else if (status === 500) {
        error.friendlyMessage = 'An internal server error occurred. Please try again shortly.';
      } else {
        error.friendlyMessage = backendMsg || 'An unexpected error occurred. Please try again.';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts a safe, user-friendly error string without leaking internals or raw stack traces.
 */
export function getErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';
  if (error.friendlyMessage) return error.friendlyMessage;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message && !error.message.includes('status code')) return error.message;
  return 'Unable to complete request. Please try again.';
}

export default api;
