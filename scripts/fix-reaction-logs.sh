#!/bin/bash
# Script to fix missing confession_id in reaction_logs

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
echo "     FIXING REACTION LOGS REFERENCES"
echo "========================================"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: docker command not found. Please install Docker."
  echo "You can install it from https://docs.docker.com/get-docker/"
  exit 1
fi

echo "Running database fix using Docker..."

# Create a temporary SQL file with the fix query
cat > /tmp/fix-reaction-logs.sql << EOL
-- Update reaction_logs to set confession_id based on message_id
UPDATE reaction_log rl
SET confession_id = c.id
FROM confession c
WHERE rl.message_id = c."messageId"
  AND rl.confession_id IS NULL
  AND c."messageId" IS NOT NULL;

-- Count how many were updated
SELECT COUNT(*) as updated_records
FROM reaction_log
WHERE confession_id IS NOT NULL;

-- Show updated records
SELECT id, message_id, confession_id, total_count
FROM reaction_log
WHERE confession_id IS NOT NULL
ORDER BY id
LIMIT 5;
EOL

# Run the query in a docker container
docker run --rm -i \
  --network=host \
  -v /tmp/fix-reaction-logs.sql:/fix-script.sql \
  postgres:14-alpine \
  psql "postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DB}" \
  -f /fix-script.sql

# Check result
if [ $? -eq 0 ]; then
  echo "✅ Reaction logs have been updated!"
else
  echo "❌ Error updating reaction logs."
  echo "If you're using Docker for your database, make sure the host is correctly set."
  echo "You might need to use 'host.docker.internal' instead of 'localhost' as your POSTGRES_HOST."
  exit 1
fi

# Clean up temporary file
rm /tmp/fix-reaction-logs.sql