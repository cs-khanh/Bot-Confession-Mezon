#!/bin/bash
# Script to check news database status

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
  echo "❌ Error: Neither .env nor .env.local file found. Please create an .env file with database credentials."
  exit 1
fi

# Check if required environment variables are set
if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_HOST" ]; then
  echo "❌ Error: Database environment variables are not set. Please check your .env file."
  exit 1
fi

# Try Docker first
if command -v docker &> /dev/null; then
    CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -n 1)
    if [ ! -z "$CONTAINER" ]; then
        echo "🐳 Using Docker container: $CONTAINER"
        echo ""
        
        # Copy SQL file to container and execute
        docker cp scripts/check-news-database.sql $CONTAINER:/tmp/check-news-database.sql
        docker exec -i $CONTAINER psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f /tmp/check-news-database.sql
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Database check completed successfully!"
            exit 0
        else
            echo "❌ Error checking database via Docker."
            exit 1
        fi
    fi
fi

# Fallback to direct psql connection
if ! command -v psql &> /dev/null; then
  echo "❌ Error: psql command not found. Please install PostgreSQL client."
  echo "You can install it using: sudo apt-get install postgresql-client"
  exit 1
fi

echo "🔌 Connecting directly to PostgreSQL..."
echo ""

# Run the SQL script
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f scripts/check-news-database.sql

# Check result
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Database check completed successfully!"
else
  echo ""
  echo "❌ Error checking database."
  exit 1
fi

