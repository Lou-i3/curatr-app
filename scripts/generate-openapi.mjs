/**
 * Generate OpenAPI spec from @swagger JSDoc annotations in API route files.
 *
 * This script is executed at build time via `npm run build:openapi`.
 * It scans all API route files for @swagger JSDoc blocks, merges them
 * with the base definition below, and writes the result to public/openapi.json.
 *
 * The generated spec is served as a static asset and rendered by Swagger UI
 * on the /api-docs page.
 *
 * Uses .mjs extension because swagger-jsdoc is an ESM-only package.
 *
 * Output: public/openapi.json (gitignored — regenerated on every build)
 */
import swaggerJsdoc from 'swagger-jsdoc';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve project root (this script lives in /scripts)
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const options = {
  // Base OpenAPI definition — merged with annotations found in route files
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Curatr API',
      // Version is pulled from package.json when run via npm scripts
      version: process.env.npm_package_version || '0.8.3',
      description:
        'REST API for Curatr — track media file quality, playback compatibility, and maintenance status across a Plex media library.',
    },
    // Relative URL so the spec works on any host/port
    servers: [
      {
        url: '/',
        description: 'Current instance',
      },
    ],
    // Tag definitions control grouping and ordering in Swagger UI
    tags: [
      { name: 'Auth', description: 'Authentication & sessions' },
      { name: 'TV Shows', description: 'TV show management' },
      { name: 'Seasons', description: 'Season management' },
      { name: 'Episodes', description: 'Episode management' },
      { name: 'Files', description: 'Episode file management & analysis' },
      { name: 'Playback Tests', description: 'Playback test results per file/platform' },
      { name: 'Platforms', description: 'Playback test platform management' },
      { name: 'Scanner', description: 'Library file scanner' },
      { name: 'Tasks', description: 'Background task management' },
      { name: 'TMDB', description: 'The Movie Database integration' },
      { name: 'Issues', description: 'User-reported issue tracking' },
      { name: 'Users', description: 'User management' },
      { name: 'Settings', description: 'Application settings' },
      { name: 'FFprobe', description: 'FFprobe media analysis integration' },
    ],
    components: {
      // Shared schemas referenced by route annotations via $ref.
      // These mirror Prisma enums so the spec stays in sync with the DB schema.
      schemas: {
        // Common response shapes
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
          },
          required: ['error'],
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
          },
        },

        // Prisma enums — keep in sync with prisma/schema.prisma
        MonitorStatus: {
          type: 'string',
          enum: ['WANTED', 'UNWANTED'],
        },
        FileQuality: {
          type: 'string',
          enum: ['UNVERIFIED', 'VERIFIED', 'OK', 'BROKEN'],
        },
        Action: {
          type: 'string',
          enum: ['NOTHING', 'REDOWNLOAD', 'CONVERT', 'ORGANIZE', 'REPAIR'],
        },
        PlaybackStatus: {
          type: 'string',
          enum: ['PASS', 'PARTIAL', 'FAIL'],
        },
        ScanStatus: {
          type: 'string',
          enum: ['RUNNING', 'COMPLETED', 'FAILED'],
        },
        TrackType: {
          type: 'string',
          enum: ['VIDEO', 'AUDIO', 'SUBTITLE'],
        },
        UserRole: {
          type: 'string',
          enum: ['ADMIN', 'USER'],
        },
        IssueType: {
          type: 'string',
          enum: ['PLAYBACK', 'QUALITY', 'AUDIO', 'SUBTITLE', 'CONTENT', 'OTHER'],
        },
        IssueStatus: {
          type: 'string',
          enum: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        },
        TaskStatus: {
          type: 'string',
          enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
        },
      },
      securitySchemes: {
        // Cookie-based auth — session token set after Plex OAuth login
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session_token',
          description:
            'Session cookie set after Plex OAuth login. When AUTH_MODE=none, authentication is not required.',
        },
      },
    },
  },
  // Glob pattern telling swagger-jsdoc where to find @swagger annotations
  apis: [resolve(root, 'src/app/api/**/route.ts')],
};

// Parse all @swagger blocks and merge with the base definition
const spec = swaggerJsdoc(options);

// Write the spec to the public directory so Next.js serves it as a static asset
writeFileSync(
  resolve(root, 'public/openapi.json'),
  JSON.stringify(spec, null, 2)
);

const pathCount = Object.keys(spec.paths || {}).length;
console.log(`OpenAPI spec generated: ${pathCount} paths → public/openapi.json`);
