import { useEffect, useState } from 'react';
import { api } from './api.js';

const cache = new Map();

function cached(key, loader) {
  if (!cache.has(key)) cache.set(key, loader().catch((err) => { cache.delete(key); throw err; }));
  return cache.get(key);
}

export const invalidateDirectory = () => cache.clear();

function useCached(key, loader, fallback) {
  const [data, setData] = useState(fallback);
  useEffect(() => {
    let alive = true;
    cached(key, loader).then((d) => alive && setData(d)).catch(() => {});
    return () => { alive = false; };
  }, [key]);
  return data;
}

export const useTeam = () => useCached('team', () => api.get('/users/directory'), []);
export const useLeadMeta = () => useCached('meta', () => api.get('/leads/meta'), { sources: [], tags: [] });
