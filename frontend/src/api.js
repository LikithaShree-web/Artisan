const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const AI_BASE = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function request(path, { token, body, headers = {}, ...options } = {}) {
  const requestHeaders = { ...headers };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) requestHeaders['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: requestHeaders,
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the marketplace API. Check that the backend is running.', 0);
  }

  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Some existing endpoints return plain text, including login tokens and errors.
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      sessionStorage.removeItem('artisan-market-auth');
      window.dispatchEvent(new Event('auth-expired'));
    }
    const message = typeof data === 'string' ? data : data?.message || data?.error;
    throw new ApiError(message || `Request failed (${response.status}).`, response.status);
  }

  return data;
}

export async function aiRequest(path, { body, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${AI_BASE}${path}`, {
      ...options,
      headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('AI guidance is unavailable. Start the optional Python AI service to try again.', 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.detail === 'string' ? data.detail : data?.message;
    throw new ApiError(message || `AI request failed (${response.status}).`, response.status);
  }
  return data;
}


export function imageUrl(filename) {
  if (!filename) return '';

  // Use Cloudinary or any full image URL directly
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  // Keep support for older locally stored images
  return `${API_BASE.replace(/\/api\/?$/, '')}/uploads/${encodeURIComponent(filename)}`;
}

export const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);
