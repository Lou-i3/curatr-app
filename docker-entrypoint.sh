#!/bin/sh
set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

echo "╔════════════════════════════════════════════╗"
echo "║     Curatr App v${VERSION}          ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Setup user with PUID/PGID
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Running with PUID=$PUID PGID=$PGID"

# Find or create group with the specified GID
EXISTING_GROUP=$(getent group "$PGID" | cut -d: -f1 || true)
if [ -n "$EXISTING_GROUP" ]; then
  # GID already exists, use that group
  APP_GROUP="$EXISTING_GROUP"
  echo "Using existing group '$APP_GROUP' (GID $PGID)"
else
  # Create new group with specified GID
  addgroup -g "$PGID" appgroup
  APP_GROUP="appgroup"
  echo "Created group 'appgroup' (GID $PGID)"
fi

# Find or create user with the specified UID
EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1 || true)
if [ -n "$EXISTING_USER" ]; then
  # UID already exists, use that user
  APP_USER="$EXISTING_USER"
  echo "Using existing user '$APP_USER' (UID $PUID)"
  # Ensure user is in the correct group
  addgroup "$APP_USER" "$APP_GROUP" 2>/dev/null || true
else
  # Create new user with specified UID
  adduser -D -u "$PUID" -G "$APP_GROUP" -h /app appuser
  APP_USER="appuser"
  echo "Created user 'appuser' (UID $PUID)"
fi

# Ensure data directory exists and has correct permissions
mkdir -p /app/data /app/logs

# Fix ownership of data directory and all contents (including existing db files)
echo "Setting ownership of /app/data to $PUID:$PGID..."
chown -R "$PUID:$PGID" /app/data /app/logs
chmod 755 /app/data /app/logs

# Debug: show what's in the data directory
ls -la /app/data/ 2>/dev/null || true

# Verify write access
if ! su-exec "$APP_USER" touch /app/data/.write-test 2>/dev/null; then
  echo "ERROR: Cannot write to /app/data directory"
  echo "Please ensure the mounted volume has correct permissions for UID=$PUID GID=$PGID"
  echo "Try: chown -R $PUID:$PGID /path/to/your/data/folder on the host"
  exit 1
fi
rm -f /app/data/.write-test
echo "Data directory is writable"

# Run migrations as the app user
echo "Running database migrations..."
su-exec "$APP_USER" node node_modules/prisma/build/index.js migrate deploy

# Start the application as the app user (standalone mode)
echo ""
echo "Starting Next.js server on port ${PORT:-3000}..."
exec su-exec "$APP_USER" node server.js
