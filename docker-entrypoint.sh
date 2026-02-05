#!/bin/sh
set -e

echo "Starting Media Quality Tracker..."

# Setup user with PUID/PGID
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Running with PUID=$PUID PGID=$PGID"

# Create group if it doesn't exist
if ! getent group appgroup >/dev/null 2>&1; then
  addgroup -g "$PGID" appgroup
fi

# Create user if it doesn't exist
if ! getent passwd appuser >/dev/null 2>&1; then
  adduser -D -u "$PUID" -G appgroup -h /app appuser
else
  # Update existing user's UID/GID if needed
  usermod -u "$PUID" appuser 2>/dev/null || true
  groupmod -g "$PGID" appgroup 2>/dev/null || true
fi

# Ensure data directory exists and has correct permissions
mkdir -p /app/data /app/logs
chown -R "$PUID:$PGID" /app/data /app/logs

# Run migrations as appuser
echo "Running database migrations..."
su-exec appuser npx prisma migrate deploy

# Start the application as appuser
echo "Starting Next.js server..."
exec su-exec appuser npm start
