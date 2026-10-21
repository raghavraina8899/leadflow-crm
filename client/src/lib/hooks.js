import { useCallback, useEffect, useRef, useState } from 'react';

export function useQuery(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const requestId = useRef(0);

  const run = useCallback(() => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true }));
    return fetcher()
      .then((data) => id === requestId.current && setState({ data, error: null, loading: false }))
      .catch((error) => id === requestId.current && setState((s) => ({ ...s, error, loading: false })));
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}

export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useClickOutside(ref, onOutside, active = true) {
  useEffect(() => {
    if (!active) return;
    const handle = (e) => ref.current && !ref.current.contains(e.target) && onOutside();
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [ref, onOutside, active]);
}

export function useHotkey(match, handler) {
  useEffect(() => {
    const onKey = (e) => match(e) && handler(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [match, handler]);
}

const LEADS_CHANGED = 'leadflow:leads-changed';

export const announceLeadsChanged = () => window.dispatchEvent(new Event(LEADS_CHANGED));

export function useLeadsChanged(callback) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener(LEADS_CHANGED, handler);
    return () => window.removeEventListener(LEADS_CHANGED, handler);
  }, []);
}
