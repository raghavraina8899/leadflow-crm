const TOKEN_KEY = 'leadflow:token';

function storage(action, value) {
  try {
    if (action === 'get') return localStorage.getItem(TOKEN_KEY);
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const getToken = () => storage('get');
export const setToken = (token) => storage('set', token);

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body, { raw = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('leadflow:signed-out'));
  }
  if (res.ok && raw) return res;
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
  download: async (path, fallbackName) => {
    const res = await request('GET', path, undefined, { raw: true });
    const name = res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] || fallbackName;
    const url = URL.createObjectURL(await res.blob());
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    link.click();
    URL.revokeObjectURL(url);
  },
};

export const qs = (params) => {
  const entries = Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
};
