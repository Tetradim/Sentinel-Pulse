// Support both VITE_ (Vite) and REACT_APP_ (Create React App) prefixes
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || '';

export async function apiFetch(path: string, options?: RequestInit & { rawText?: boolean }) {
  const { rawText, ...fetchOptions } = options || {};
  const url = `${BACKEND_URL}${path}`;

  // 10-second timeout to prevent UI from appearing frozen
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(fetchOptions?.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || res.statusText);
    }
    return rawText ? res.text() : res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.warn(`API timeout (no backend?): ${path}`);
      // Return default values for specific endpoints to prevent crashes
      if (path === '/api/fx-rates') return { rates: { USD: 1 } };
      if (path === '/api/settings/currency-display') return { mode: 'usd' };
      throw new Error(`Request timeout after 10s: ${path}`);
    }
    throw err;
  }
}
