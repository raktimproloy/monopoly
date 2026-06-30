/**
 * Resolves the game server URL for HTTP + Socket.IO.
 * Production must hit the API subdomain (e.g. bdpoly-api.example.com), not :6001 on the frontend host.
 */
export function resolveServerUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL?.trim();

  if (fromEnv && !fromEnv.includes('localhost') && !fromEnv.includes('127.0.0.1')) {
    return fromEnv.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return fromEnv || 'http://localhost:6001';
  }

  const { hostname, protocol } = window.location;
  const isSecure = protocol === 'https:';
  const scheme = isSecure ? 'https' : 'http';

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    let port = '6001';
    try {
      if (fromEnv) {
        const u = new URL(fromEnv);
        if (u.port) port = u.port;
      }
    } catch {
      // ignore
    }
    return `${scheme}://${hostname}:${port}`;
  }

  if (hostname.includes('devtunnels.ms')) {
    let port = '6001';
    try {
      if (fromEnv) {
        const u = new URL(fromEnv);
        if (u.port) port = u.port;
      }
    } catch {
      // ignore
    }
    const secureHost = hostname.replace('-3000', `-${port}`);
    return `https://${secureHost}`;
  }

  // bdpoly.example.com → bdpoly-api.example.com
  const bareHost = hostname.replace(/^www\./, '');
  const apiHost = bareHost.replace(/^([^.]+)\./, '$1-api.');
  if (apiHost !== bareHost) {
    return `${scheme}://${apiHost}`;
  }

  return fromEnv || 'http://localhost:6001';
}
