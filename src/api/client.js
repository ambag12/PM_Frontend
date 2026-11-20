import axios from 'axios';

// API base URL is configurable at build time (VITE_API_URL); falls back to the hosted backend.
const API_URL = import.meta.env.VITE_API_URL || 'https://overall-calli-evantagesoft-7926b7a5.koyeb.app/api/v1/';

const client = axios.create({
  baseURL: API_URL.endsWith('/') ? API_URL : `${API_URL}/`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Backend quirk: ProjectViewSet.initial() checks admin permissions before the project object
// is loaded, so admin-only project endpoints (PATCH projects/:id, modules, tags, logo, due date…)
// only pass when the project id is also present in the query string. Add it automatically.
const PROJECT_DETAIL_RE = /^\/?projects\/(\d+)(\/|$|\?)/;

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = (config.method || 'get').toLowerCase();
    const match = typeof config.url === 'string' && config.url.match(PROJECT_DETAIL_RE);
    if (match && method !== 'get') {
      config.params = { project: match[1], ...(config.params || {}) };
    }

    // Let the browser set the multipart boundary for FormData bodies.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Expired/invalid token: clear the session and send the user to the login page.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    if (status === 401 && !url.startsWith('auth')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

// Normalise the API / custom-endpoint error payloads into a readable message.
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;
  if (typeof data === 'string') return data.slice(0, 300);
  if (data._error_message) return data._error_message;
  if (data.error) {
    if (typeof data.error === 'string') return data.error;
    return Object.entries(data.error).map(([k, v]) => `${k}: ${[].concat(v).join(', ')}`).join('; ');
  }
  if (data.detail) return data.detail;
  const parts = Object.entries(data)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `${k}: ${[].concat(v).map(x => (typeof x === 'object' ? JSON.stringify(x) : x)).join(', ')}`);
  return parts.length ? parts.join('; ') : fallback;
};

export { API_URL };
export default client;
