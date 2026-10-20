/**
 * Safe, human-readable error formatting utility.
 * Guarantees that the returned value is always a primitive string,
 * preventing React Minified Error #31 ("Objects are not valid as a React child").
 */
export function formatErrorMessage(error: any, fallback = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallback;

  // 1. Primitive string input
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed) return fallback;
    // Don't render raw HTML document strings (e.g. from 404/502 server responses)
    if (trimmed.includes('<!DOCTYPE') || trimmed.includes('<html')) {
      return 'The server returned an unexpected web page response instead of data. Please verify your backend API URL and service status.';
    }
    return trimmed;
  }

  // 2. Axios or network error with response
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // Direct string message from backend response
    if (data && typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }

    // Direct string error from backend response
    if (data && typeof data.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }

    // Nested error object e.g. { error: { message: "..." } } or { error: { field: "..." } }
    if (data?.error && typeof data.error === 'object') {
      const nested = data.error.message || data.error.detail || data.error.description;
      if (typeof nested === 'string' && nested.trim()) {
        return nested.trim();
      }
      try {
        const entries = Object.entries(data.error)
          .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : JSON.stringify(v)}`)
          .filter(Boolean);
        if (entries.length > 0) return entries.join('; ');
      } catch {
        // Continue
      }
    }

    if (data?.message && typeof data.message === 'object') {
      const nested = data.message.message || data.message.detail || data.message.error;
      if (typeof nested === 'string' && nested.trim()) {
        return nested.trim();
      }
      try {
        const entries = Object.entries(data.message)
          .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : JSON.stringify(v)}`)
          .filter(Boolean);
        if (entries.length > 0) return entries.join('; ');
      } catch {
        // Continue
      }
    }

    // Validation dictionary e.g. { errors: { email: ["Invalid email"] } } or { errors: [...] }
    if (data?.errors) {
      if (typeof data.errors === 'string') return data.errors.trim();
      if (Array.isArray(data.errors)) {
        const msgs = data.errors
          .map((item: any) => (typeof item === 'string' ? item : item?.message || JSON.stringify(item)))
          .filter(Boolean);
        if (msgs.length > 0) return msgs.join(', ');
      }
      if (typeof data.errors === 'object') {
        const entries = Object.entries(data.errors).map(([field, val]: [string, any]) => {
          const valStr = typeof val === 'string' ? val : Array.isArray(val) ? val.join(', ') : JSON.stringify(val);
          return `${field}: ${valStr}`;
        });
        if (entries.length > 0) return entries.join('; ');
      }
    }

    // Raw HTML data check in response body (common on Vercel 404 or Nginx 502)
    if (typeof data === 'string' && (data.includes('<!DOCTYPE') || data.includes('<html'))) {
      if (status === 404) {
        return 'Backend API endpoint not found (HTTP 404). In production on Vercel, the Flask API must be deployed and VITE_API_BASE_URL configured.';
      }
      if (status === 502 || status === 503) {
        return 'ResolveX backend service is temporarily unavailable or restarting (HTTP ' + status + '). Please retry shortly.';
      }
      return `Server returned an HTML error response (HTTP ${status}).`;
    }

    // Specific HTTP status code human explanations
    if (status === 404) {
      return 'API endpoint not found (HTTP 404). If deploying frontend on Vercel, please deploy the backend and set VITE_API_BASE_URL to your backend URL.';
    }
    if (status === 401) {
      return 'Invalid email or password. Please verify your credentials.';
    }
    if (status === 403) {
      return 'Access denied: You do not have permission to access this resource.';
    }
    if (status === 422) {
      return 'Submitted data could not be processed. Please check all fields.';
    }
    if (status === 500) {
      return 'Internal server error occurred. Please try again later.';
    }
    if (status === 502 || status === 503) {
      return 'ResolveX backend service is initializing or unreachable. Please retry momentarily.';
    }
  }

  // 3. Network or connection errors
  if (error.code === 'ERR_NETWORK') {
    return 'Unable to reach backend service (Network Error). Please check your internet connection or verify the backend is running.';
  }

  // 4. Custom friendlyMessage property (from Axios response interceptor)
  if (error.friendlyMessage && typeof error.friendlyMessage === 'string') {
    return error.friendlyMessage;
  }

  // 5. Standard Error instance or React Minified Error #31
  if (error instanceof Error || (typeof error === 'object' && error?.message)) {
    const msg = typeof error.message === 'string' ? error.message.trim() : '';
    if (msg.includes('Minified React error #31') || msg.includes('Objects are not valid as a React child')) {
      return 'An object was passed for rendering. Safe error recovery intercepted this to keep your screen functional.';
    }
    if (msg && !msg.toLowerCase().includes('status code')) {
      return msg;
    }
  }

  // 6. Generic object with a message or error field
  if (typeof error === 'object') {
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error.trim();
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}' && serialized.length < 200) {
        return serialized;
      }
    } catch {
      // Fallback
    }
  }

  return typeof fallback === 'string' ? fallback : 'An unexpected error occurred.';
}

export default formatErrorMessage;
