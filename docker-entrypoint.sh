#!/bin/sh
set -e

echo "Starting Media Quality Tracker..."

# Ensure data directory exists
mkdir -p /app/data

# Run pending migrations (Prisma client is already generated during build)
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting Next.js server..."
exec npm start
