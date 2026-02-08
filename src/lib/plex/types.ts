/**
 * Plex API type definitions
 * Shared across auth and future Plex integrations (DB sync, API enrichment)
 */

/** Plex user info returned from plex.tv API */
export interface PlexUser {
  id: number;
  uuid: string;
  username: string;
  email: string;
  thumb: string;        // Avatar URL
  authToken: string;
  title: string;
}

/** Plex PIN response from /api/v2/pins */
export interface PlexPin {
  id: number;
  code: string;
  authToken: string | null;
  expiresAt: string;
}

/** Plex server resource from /api/v2/resources */
export interface PlexResource {
  name: string;
  clientIdentifier: string;
  owned: boolean;
  accessToken: string;
  connections: PlexConnection[];
}

/** Plex server connection details */
export interface PlexConnection {
  uri: string;
  local: boolean;
}

/** Plex shared server user from server API */
export interface PlexSharedUser {
  id: number;
  username: string;
  email: string;
  thumb: string;
}
