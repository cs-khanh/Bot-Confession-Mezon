#!/bin/bash
# Script to check database status using Docker
# This script is useful if you don't have psql installed locally

# Load environment variables from .env files
if [ -f .env.local ]; then
  # Safely source the file using a clean way to avoid syntax errors
  set -a
  . ./.env.local
  set +a
elif [ -f .env ]; then
  set -a
  . ./.env
  set +a
else
  echo "Error: Neither .env nor .env.local file found. Please create an .env file with database credentials."
  exit 1
fi

# Check if required environment variables are set
if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_HOST" ]; then
  echo "Error: Database environment variables are not set. Please check your .env file."
  exit 1
fi

echo "========================================"
echo "      DATABASE STATUS REPORT"
echo "========================================"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: docker command not found. Please install Docker."
  echo "You can install it from https://docs.docker.com/get-docker/"
  exit 1
fi

echo "Running database check using Docker..."

# Create a temporary SQL file with simpler queries that will work better with Docker exec
cat > /tmp/check-db-simple.sql << EOL
-- Count records in each table
SELECT 'confession' as table_name, COUNT(*) as record_count FROM confession;
SELECT 'reaction_log' as table_name, COUNT(*) as record_count FROM reaction_log;
SELECT 'weekly_stats' as table_name, COUNT(*) as record_count FROM weekly_stats;

-- Show some sample data if available
SELECT 'Showing up to 3 recent confessions:' as info;
SELECT id, LEFT(content, 50) as content_preview, status, reaction_count 
FROM confession 
ORDER BY created_at DESC 
LIMIT 3;

SELECT 'Showing up to 3 recent reaction logs:' as info;
SELECT id, message_id, confession_id, total_count
FROM reaction_log
ORDER BY created_at DESC
LIMIT 3;

SELECT 'Showing up to 3 recent weekly stats:' as info;
SELECT id, week, year, "startDate" as start_date, "endDate" as end_date, "totalConfessions" as total_confessions
FROM weekly_stats
ORDER BY "createdAt" DESC
LIMIT 3;
EOL

# Run the query in a docker container
docker run --rm -i \
  --network=host \
  -v /tmp/check-db-simple.sql:/check-db.sql \
  postgres:14-alpine \
  psql "postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DB}" \
  -f /check-db.sql

# Check result
if [ $? -eq 0 ]; then
  echo "✅ Database check completed successfully!"
else
  echo "❌ Error checking database."
  echo "If you're using Docker for your database, make sure the host is correctly set."
  echo "You might need to use 'host.docker.internal' instead of 'localhost' as your POSTGRES_HOST."
  exit 1
fi

# Clean up temporary file
rm /tmp/check-db-simple.sql