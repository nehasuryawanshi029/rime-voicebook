/**
 * VoiceBook API client utilities.
 * 
 * Provides centralized, environment-aware resolution of backend URLs for REST and WebSockets:
 * - Strips trailing slashes to prevent double-slash route errors (e.g., //api/auth/login).
 * - Avoids hardcoded localhost in production deployments.
 * - Prevents IPv6 ::1 vs IPv4 127.0.0.1 connection drops on Windows.
 * - Prevents HTTP/HTTPS mixed content blocking.
 */

/**
 * Resolves the base URL for REST API requests.
 */
export function getApiBaseUrl(): string {
  // 1. Explicit environment variable takes top precedence
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  // 2. Client-side browser execution
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0';

    if (isLocal) {
      // In local dev, use IPv4 loopback 127.0.0.1:8000 to avoid Windows IPv6 (::1) socket drops
      const protocol = window.location.protocol; // http: or https:
      return `${protocol}//127.0.0.1:8000`;
    }

    // In production deployment without NEXT_PUBLIC_API_URL:
    // Return empty string to make same-origin relative requests (/api/...)
    // through Next.js rewrites or a reverse proxy. NO hardcoded localhost!
    return '';
  }

  // 3. Server-side rendering (SSR) fallback
  return process.env.BACKEND_URL?.trim().replace(/\/+$/, '') || 'http://127.0.0.1:8000';
}

/**
 * Resolves WebSocket URL for real-time audio streams.
 */
export function getWsUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    const base = configuredUrl.replace(/\/+$/, '');
    const wsBase = base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    return `${wsBase}${cleanPath}`;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0';

    if (isLocal) {
      return `ws://127.0.0.1:8000${cleanPath}`;
    }

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}${cleanPath}`;
  }

  return `ws://127.0.0.1:8000${cleanPath}`;
}

/**
 * Safe JSON parser that avoids syntax errors when a server or proxy
 * returns an HTML error page (e.g. 502 Bad Gateway or 504 Gateway Timeout).
 */
export async function safeParseJson<T = any>(response: Response): Promise<{ data: T | null; error?: string }> {
  try {
    const text = await response.text();
    if (!text || !text.trim()) {
      return { data: null };
    }
    const json = JSON.parse(text);
    return { data: json };
  } catch (err: any) {
    return {
      data: null,
      error: response.statusText || `Request returned status ${response.status}`,
    };
  }
}
