import type { NextConfig } from "next";

/**
 * Content Security Policy
 * Controls which resources the browser is allowed to load.
 *
 * - 'self': same origin only
 * - image.tmdb.org: TMDB posters and backdrops
 * - plex.tv / app.plex.tv: Plex OAuth popup
 * - api.github.com: version check (latest release)
 * - 'unsafe-inline' for styles: required by Tailwind CSS
 * - 'unsafe-eval' in dev only: required by Next.js React Fast Refresh
 */
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''} 'unsafe-inline'`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://image.tmdb.org https://plex.tv https://*.plex.tv data: blob:",
  "font-src 'self'",
  `connect-src 'self' https://plex.tv https://app.plex.tv https://api.github.com ${process.env.NODE_ENV === 'development' ? 'ws://localhost:* http://localhost:*' : ''}`,
  "media-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

const ContentSecurityPolicy = cspDirectives.join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',

  // Remove X-Powered-By header to avoid leaking framework info
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevents the page from being embedded in iframes (clickjacking protection)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevents browsers from MIME-sniffing a response away from the declared content-type
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Controls how much referrer information is sent with requests
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disables browser features not used by the app
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // Restricts which resources the browser can load
          { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
