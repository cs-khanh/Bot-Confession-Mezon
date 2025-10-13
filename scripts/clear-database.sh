#!/bin/bash
# Script to clear all data from the database

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

# Ask for confirmation
echo "WARNING: This will delete ALL data from the database. This action cannot be undone."
read -p "Are you sure you want to continue? [y/N]: " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Operation cancelled."
  exit 0
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
  echo "Error: psql command not found. Please install PostgreSQL client."
  echo "You can install it using: sudo apt-get install postgresql-client"
  exit 1
fi

# Run the SQL script
echo "Clearing database..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f scripts/clear-database.sql

# Check result
if [ $? -eq 0 ]; then
  echo "✅ Database cleared successfully!"
else
  echo "❌ Error clearing database."
  exit 1
fi