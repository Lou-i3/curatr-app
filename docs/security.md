# Security

This document describes the security model and protections in Curatr App. It's intended for users who want to understand how their deployment is protected, and for contributors working on security-related code.

---

## Table of Contents

- [Authentication Modes](#authentication-modes)
- [Session Management](#session-management)
- [Cookie Security](#cookie-security)
- [Security Headers](#security-headers)
- [Rate Limiting](#rate-limiting)
- [Role-Based Access Control](#role-based-access-control)
- [HTTPS & Reverse Proxies](#https--reverse-proxies)
- [Content Security Policy](#content-security-policy)
- [Dependency Security](#dependency-security)
- [Reporting Vulnerabilities](#reporting-vulnerabilities)

---

## Authentication Modes

Curatr supports two authentication modes, configured via the `AUTH_MODE` environment variable:

| Mode | Description | Use Case |
|------|-------------|----------|
| `none` (default) | No login required. A built-in admin user is used for all operations. | Single-user, trusted local network |
| `plex` | Plex OAuth login. Users sign in with their Plex account, and access is verified against your Plex server. | Multi-user, shared access |

In **Plex mode**, only users with access to your configured Plex server can log in. The Plex server owner is automatically promoted to admin.

## Session Management

- **Token generation**: Sessions use `crypto.randomUUID()` (128-bit, cryptographically secure)
- **Storage**: Server-side in SQLite (via Prisma). The session token is the primary key.
- **Expiry**: 30-day maximum lifetime, checked on every request
- **Cleanup**: Expired sessions are automatically purged from the database (throttled to once per hour)
- **Logout**: Deletes the session from the database and clears the cookie
- **Deactivation**: If an admin deactivates a user account, all existing sessions for that user become invalid immediately (checked on every request via the `isActive` flag)

Sessions are **not** reused across logins — each successful authentication creates a new session token.

## Cookie Security

The session cookie (`session_token`) is configured with:

| Flag | Value | Purpose |
|------|-------|---------|
| `HttpOnly` | `true` | Prevents JavaScript access (XSS protection) |
| `SameSite` | `Lax` | Prevents cross-site request forgery (CSRF) |
| `Secure` | Dynamic | Set to `true` when the request is over HTTPS (detected via `x-forwarded-proto` header or URL protocol) |
| `Path` | `/` | Cookie is sent for all routes |
| `Max-Age` | 30 days | Browser-side expiry (server also validates) |

The `Secure` flag is set dynamically based on the request protocol, so it works correctly both for direct HTTPS connections and when behind a reverse proxy that terminates TLS.

## Security Headers

All responses include the following security headers (configured in `next.config.ts`):

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking (page cannot be embedded in iframes) |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Disables unused browser APIs |
| `Content-Security-Policy` | See [CSP section](#content-security-policy) | Controls which resources the browser can load |

Additionally, the `X-Powered-By` header is disabled (`poweredByHeader: false` in `next.config.ts`) to avoid leaking framework information.

### Not Included: Strict-Transport-Security (HSTS)

HSTS is **intentionally not set** by the application. Curatr is a self-hosted app, and many users run it on local networks without HTTPS or behind HTTP reverse proxies. Setting HSTS at the app level could lock users out of their own instance.

If you deploy with HTTPS, configure HSTS at your reverse proxy:

- **Caddy**: Enabled by default
- **Traefik**: `traefik.http.middlewares.hsts.headers.stsSeconds=31536000`
- **nginx**: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`

## Rate Limiting

Authentication endpoints are rate-limited to prevent abuse:

| Endpoint | Limit | Purpose |
|----------|-------|---------|
| `POST /api/auth/plex/pin` | 10 req/min per IP | Prevents PIN creation spam |
| `POST /api/auth/plex/callback` | 30 req/min per IP | Prevents brute-force PIN guessing (client polls every 2s) |

Rate limiting is in-memory (no external dependencies). When a client exceeds the limit, they receive a `429 Too Many Requests` response with a `Retry-After` header.

## Role-Based Access Control

Two roles exist:

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full access: scanning, settings, user management, issue management, all CRUD operations |
| **USER** | Read-only library access, report issues, view own submissions |

**API enforcement:**
- All mutation endpoints (POST, PATCH, DELETE) require admin role (`checkAdmin()`)
- All read endpoints (GET) require a valid session (`checkAuth()`) — expired or invalid sessions are rejected
- Auth endpoints (`/api/auth/*`) are public (no auth checks)
- In `AUTH_MODE=none`, the built-in user has admin role (backwards compatible)

## HTTPS & Reverse Proxies

Curatr does **not** enforce HTTPS at the application level. For production deployments exposed to the internet, you should:

1. Use a reverse proxy (Caddy, Traefik, nginx) that terminates TLS
2. Ensure the proxy sets the `x-forwarded-proto: https` header — Curatr uses this to set the `Secure` cookie flag
3. Optionally configure HSTS at the proxy level

For **local network** deployments (e.g., accessing via `http://192.168.x.x:3000`), no HTTPS is needed — the `Secure` flag will not be set, and cookies will work over HTTP.

## Content Security Policy

The CSP restricts which resources the browser is allowed to load:

| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self'` | Only allow same-origin by default |
| `script-src` | `'self' 'unsafe-inline'` | App scripts + inline scripts (Next.js) |
| `style-src` | `'self' 'unsafe-inline'` | App styles + Tailwind inline styles |
| `img-src` | `'self' https://image.tmdb.org https://plex.tv https://*.plex.tv data: blob:` | TMDB posters, Plex avatars |
| `connect-src` | `'self' https://plex.tv https://app.plex.tv https://api.github.com` | Plex OAuth, GitHub version check |
| `frame-src` | `'none'` | No iframes allowed |
| `object-src` | `'none'` | No plugins (Flash, Java) |
| `base-uri` | `'self'` | Prevents `<base>` tag injection |
| `form-action` | `'self'` | Forms can only submit to same origin |
| `frame-ancestors` | `'none'` | Cannot be embedded (redundant with X-Frame-Options, but CSP takes precedence in modern browsers) |

In development mode, `'unsafe-eval'` is added to `script-src` (required by Next.js React Fast Refresh) and `ws://localhost:*` is added to `connect-src` (for hot module replacement).

## Dependency Security

Regularly audit dependencies for known vulnerabilities:

```bash
# Quick check (built-in)
npm audit --production

# Deeper scanning (free tier, better vulnerability database)
npx snyk test --production --severity-threshold=high
```

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it via [GitHub Issues](https://github.com/Lou-i3/curatr-app/issues) with the **security** label, or contact the maintainer directly. Please do not publicly disclose the vulnerability until a fix is available.
