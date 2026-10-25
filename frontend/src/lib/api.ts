import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/v1`
    : '/api/v1',
});

// In-memory cache for GET requests to eliminate navigation buffer and make route switching instant
interface CacheEntry {
  data: any;
  status: number;
  statusText: string;
  headers: any;
  timestamp: number;
}

const getCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds cache for rapid navigation

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    getCache.clear();
  } else {
    for (const key of getCache.keys()) {
      if (key.includes(prefix)) {
        getCache.delete(key);
      }
    }
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Any mutation (POST, PUT, DELETE, PATCH) invalidates cache
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') {
    clearApiCache();
  }

  return config;
});

// Custom get wrapper to serve instantly from getCache when available
const originalGet = api.get;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(api as any).get = async function (url: string, config?: any) {
  const noCache = config?.headers?.['Cache-Control'] === 'no-cache' || config?.params?.noCache;
  const cacheKey = `${url}?${JSON.stringify(config?.params || {})}`;

  if (!noCache && getCache.has(cacheKey)) {
    const entry = getCache.get(cacheKey)!;
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return {
        data: entry.data,
        status: entry.status,
        statusText: entry.statusText,
        headers: entry.headers,
        config: config || {},
      };
    }
    getCache.delete(cacheKey);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response: any = await originalGet.call(api, url, config);
  if (!noCache && response.status >= 200 && response.status < 300) {
    getCache.set(cacheKey, {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      timestamp: Date.now(),
    });
  }
  return response;
};

export interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  phone?: string;
  address_text?: string;
  centre_id?: string;
  approval_status?: string;
  photo_url?: string;
}