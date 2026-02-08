/**
 * Shared Plex API HTTP client
 * Provides low-level helpers for making authenticated Plex API requests.
 * Reusable by auth, future DB sync, and API enrichment features.
 */

const PLEX_TV_BASE = 'https://plex.tv';

// Identifies this app to Plex (required for PIN-based auth)
const PLEX_APP_NAME = 'Curatr App';
const PLEX_CLIENT_IDENTIFIER = 'curatr-app';

/**
 * Common headers required by Plex API
 */
export function getPlexHeaders(authToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Plex-Product': PLEX_APP_NAME,
    'X-Plex-Client-Identifier': PLEX_CLIENT_IDENTIFIER,
    'X-Plex-Version': '1.0.0',
    'X-Plex-Platform': 'Web',
  };

  if (authToken) {
    headers['X-Plex-Token'] = authToken;
  }

  return headers;
}

/**
 * Make a request to plex.tv API
 */
export async function plexTvRequest<T>(
  path: string,
  options: {
    method?: string;
    authToken?: string;
    body?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = 'GET', authToken, body } = options;

  const headers = getPlexHeaders(authToken);

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    fetchOptions.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(`${PLEX_TV_BASE}${path}`, fetchOptions);

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Plex API error (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Make a request to a Plex Media Server
 */
export async function plexServerRequest<T>(
  serverUrl: string,
  path: string,
  authToken: string
): Promise<T> {
  const headers = getPlexHeaders(authToken);

  const response = await fetch(`${serverUrl}${path}`, { headers });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Plex server error (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Get the Plex auth URL for PIN-based login
 */
export function getPlexAuthUrl(pinCode: string): string {
  const params = new URLSearchParams({
    clientID: PLEX_CLIENT_IDENTIFIER,
    code: pinCode,
    'context[device][product]': PLEX_APP_NAME,
  });

  return `https://app.plex.tv/auth#?${params.toString()}`;
}
