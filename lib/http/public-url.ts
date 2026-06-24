/**
 * Resolve the public-facing origin for an incoming request.
 *
 * Behind a proxy (Vercel, ngrok, etc.) `request.url` reflects the *internal*
 * host/protocol the function was invoked with — on Vercel that is typically
 * an `http://` localhost-style address, not the public `https://` domain the
 * browser used. Relying on it produces broken OAuth redirects and image URLs
 * that Meta cannot fetch.
 *
 * We therefore trust the standard forwarding headers first (Vercel always sets
 * `x-forwarded-host` / `x-forwarded-proto`), then an explicit `APP_URL` /
 * `NEXTAUTH_URL` override, and only fall back to the raw request URL.
 */
export function publicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (forwardedHost) {
    const isLocal = forwardedHost.startsWith("localhost") || forwardedHost.startsWith("127.0.0.1");
    const proto = request.headers.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return `${proto}://${forwardedHost}`;
  }

  const envUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    try {
      return new URL(envUrl).origin;
    } catch {
      // Ignore a malformed env override and fall through to the request URL.
    }
  }

  return new URL(request.url).origin;
}

/** Build an absolute URL on the public origin for the given path. */
export function publicUrl(path: string, request: Request): string {
  return new URL(path, publicOrigin(request)).toString();
}
