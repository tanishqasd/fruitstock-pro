const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('fruitstock_token');
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      signal: options.signal || AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
  } catch {
    throw new Error('Unable to reach FruitStock. Check your connection and try again.');
  }
  if (response.status === 401 && path !== '/auth/login') {
    localStorage.removeItem('fruitstock_token');
    window.location.reload();
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('FruitStock is temporarily unavailable. Please try again.');
  }
  const body = await response.json().catch(() => {
    throw new Error('FruitStock returned an unreadable response. Please try again.');
  });
  if (!response.ok) throw new Error(body.message || 'Request failed');
  return body;
}

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const inr = (value: number | string | undefined, compact = false) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: compact ? 'compact' : 'standard' }).format(Number(value || 0));
export const shortDate = (date: string | Date) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
