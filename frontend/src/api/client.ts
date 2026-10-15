/**
 * LandOS Central API Client
 * - Cookie-based authentication (credentials: 'include')
 * - Double Submit Cookie CSRF defense: extracts `landos_csrf_token` cookie and sends `X-CSRF-Token`
 * - Standardized error handling:
 *   - 401: Session expired/unauthorized -> redirect to login preserving current location
 *   - 403: Forbidden role/permission
 *   - 429: Friendly rate limit retry notification
 *   - 5xx: Server error with retry capability
 */

export interface ApiErrorDetail {
  message: string;
  statusCode: number;
  isMfaRequired?: boolean;
  retryAfterSeconds?: number;
}

export class ApiError extends Error {
  statusCode: number;
  isMfaRequired: boolean;
  retryAfterSeconds?: number;

  constructor(message: string, statusCode: number, isMfaRequired = false, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isMfaRequired = isMfaRequired;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Extract a cookie by name from document.cookie
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Get current CSRF token from landos_csrf_token cookie
 */
export function getCsrfToken(): string | null {
  return getCookie('landos_csrf_token');
}

type OnUnauthorizedCallback = (message: string, returnUrl?: string) => void;
let unauthorizedHandler: OnUnauthorizedCallback | null = null;

export function setUnauthorizedHandler(handler: OnUnauthorizedCallback) {
  unauthorizedHandler = handler;
}

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || '';

/**
 * Core fetch wrapper with CSRF injection, cookie credentials, and error classification
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  // For state-changing methods, inject CSRF token from landos_csrf_token cookie
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  // Set Content-Type to application/json if sending a JSON body and not FormData
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  // Always include cookies for session persistence
  const init: RequestInit = {
    ...options,
    method,
    headers,
    credentials: 'include',
  };

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (netErr) {
    throw new ApiError(
      'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।',
      0
    );
  }

  if (response.status === 401) {
    const isMfa =
      response.headers.get('X-LandOS-MFA-Required') === 'true' ||
      response.headers.get('x-landos-mfa-required') === 'true';

    let errorDetail = 'অধিবেশন সমাপ্ত হয়েছে বা লগইন প্রয়োজন।';
    try {
      const data = await response.json();
      if (data?.detail) errorDetail = data.detail;
    } catch {
      // fallback message
    }

    if (!isMfa && unauthorizedHandler) {
      unauthorizedHandler(
        'আপনার সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।',
        window.location.pathname
      );
    }

    throw new ApiError(errorDetail, 401, isMfa);
  }

  if (response.status === 403) {
    let errorDetail = 'আপনার এই পৃষ্ঠা বা তথ্য দেখার অনুমতি নেই (403 Forbidden)।';
    try {
      const data = await response.json();
      if (data?.detail) errorDetail = data.detail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, 403);
  }

  if (response.status === 429) {
    const retryHeader = response.headers.get('Retry-After');
    const retrySec = retryHeader ? parseInt(retryHeader, 10) : 60;
    throw new ApiError(
      `অতিরিক্ত অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে ${retrySec} সেকেন্ড অপেক্ষা করে পুনরায় চেষ্টা করুন।`,
      429,
      false,
      retrySec
    );
  }

  if (response.status >= 500) {
    let errorDetail = 'সার্ভারে সাময়িক সমস্যা দেখা দিয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।';
    try {
      const data = await response.json();
      if (data?.detail) errorDetail = data.detail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  if (!response.ok) {
    let errorDetail = `অনুরোধ ব্যর্থ হয়েছে (${response.status})`;
    try {
      const data = await response.json();
      if (data?.detail) errorDetail = data.detail;
    } catch {
      // fallback
    }
    throw new ApiError(errorDetail, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
