#!/bin/bash
# Script to generate a summary report about the database

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

echo "=============================================="
echo "      DATABASE COMPREHENSIVE REPORT"
echo "=============================================="

# Check if docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: docker command not found. Please install Docker."
  echo "You can install it from https://docs.docker.com/get-docker/"
  exit 1
fi

echo "Running comprehensive database analysis using Docker..."

# Create a temporary SQL file with analysis queries
cat > /tmp/db-report.sql << EOL
-- Basic Stats
SELECT 'Database Size' as metric, pg_size_pretty(pg_database_size('$POSTGRES_DB')) as value;

-- Table Counts
SELECT 'Total Tables' as metric, COUNT(*) as value FROM information_schema.tables WHERE table_schema='public';

-- Record Counts for Main Tables
WITH counts AS (
  SELECT 'confession' as table_name, COUNT(*) as record_count FROM confession
  UNION ALL
  SELECT 'reaction_log' as table_name, COUNT(*) as record_count FROM reaction_log
  UNION ALL
  SELECT 'weekly_stats' as table_name, COUNT(*) as record_count FROM weekly_stats
)
SELECT table_name as metric, record_count::text as value FROM counts;

-- Confession Status Distribution
SELECT 'Confession Status: ' || status as metric, COUNT(*)::text as value
FROM confession
GROUP BY status
ORDER BY COUNT(*) DESC;

-- Reactions Statistics
SELECT 'Average Reactions Per Confession' as metric, 
       COALESCE(ROUND(AVG(reaction_count), 2)::text, '0') as value
FROM confession;

SELECT 'Total Reactions' as metric, 
       COALESCE(SUM(reaction_count)::text, '0') as value
FROM confession;

-- Top Reactions
SELECT 'Most Popular Reaction Types' as metric, 
       coalesce(string_agg(key || ' (' || value || ')', ', '), 'No reactions found') as value
FROM (
  SELECT key, sum(value::int) as value
  FROM (
    SELECT key, value 
    FROM reaction_log, jsonb_each_text(to_jsonb(reactions)) as t(key, value)
  ) sub
  GROUP BY key
  ORDER BY sum(value::int) DESC
  LIMIT 5
) result;

-- Health Checks
SELECT 'Orphaned Reaction Logs' as metric, 
       COUNT(*)::text || ' records' as value
FROM reaction_log rl
LEFT JOIN confession c ON rl.message_id = c."messageId"
WHERE c.id IS NULL;

SELECT 'Reactions Without Confession ID' as metric,
       COUNT(*)::text || ' records' as value
FROM reaction_log
WHERE confession_id IS NULL;

-- Most Recent Activity
SELECT 'Last Confession Time' as metric, 
       to_char(max(created_at), 'YYYY-MM-DD HH24:MI:SS') as value
FROM confession;

SELECT 'Last Reaction Time' as metric, 
       to_char(max(created_at), 'YYYY-MM-DD HH24:MI:SS') as value
FROM reaction_log;

-- Database Indexes
SELECT 'Total Indexes' as metric, COUNT(*)::text as value
FROM pg_indexes
WHERE schemaname = 'public';
EOL

# Run the query in a docker container
docker run --rm -i \
  --network=host \
  -v /tmp/db-report.sql:/db-report.sql \
  postgres:14-alpine \
  psql "postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DB}" \
  -f /db-report.sql

# Check result
if [ $? -eq 0 ]; then
  echo "✅ Database analysis completed successfully!"
else
  echo "❌ Error analyzing database."
  echo "If you're using Docker for your database, make sure the host is correctly set."
  echo "You might need to use 'host.docker.internal' instead of 'localhost' as your POSTGRES_HOST."
  exit 1
fi

# Clean up temporary file
rm /tmp/db-report.sql