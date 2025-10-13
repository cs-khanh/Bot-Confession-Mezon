#!/bin/bash

# Script to recreate database schema from scratch

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Source .env file to get database connection
if [ -f .env.local ]; then
    source .env.local
else
    echo -e "${RED}Error: .env.local file not found${NC}"
    exit 1
fi

# Check if PostgreSQL variables are set
if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
    echo -e "${RED}Error: PostgreSQL connection variables not set in .env.local file${NC}"
    exit 1
fi

# Use the database name from env vars
DB_NAME=$POSTGRES_DB
DB_USER=$POSTGRES_USER
DB_PASSWORD=$POSTGRES_PASSWORD
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}

# Build connection string
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

echo -e "${YELLOW}Recreating database schema for ${BLUE}$DB_NAME${NC}"
echo -e "${YELLOW}Using connection: ${GREEN}$DATABASE_URL${NC}"

# Drop and recreate database
echo -e "${YELLOW}Dropping database (if exists)...${NC}"
docker exec -i mezon-bot-template-postgres-1 psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database dropped successfully${NC}"
else
    echo -e "${RED}Failed to drop database${NC}"
    exit 1
fi

echo -e "${YELLOW}Creating new database...${NC}"
docker exec -i mezon-bot-template-postgres-1 psql -U $DB_USER -c "CREATE DATABASE $DB_NAME"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database created successfully${NC}"
else
    echo -e "${RED}Failed to create database${NC}"
    exit 1
fi

echo -e "${YELLOW}Creating tables...${NC}"

# Connect to the database and create schema
docker exec -i mezon-bot-template-postgres-1 psql -U $DB_USER -d $DB_NAME << EOF
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create migrations table
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    name VARCHAR NOT NULL
);

-- Create confession table with confession_number
CREATE TABLE IF NOT EXISTS confession (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    confession_number SERIAL UNIQUE NOT NULL,
    content TEXT NOT NULL,
    author_hash VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pending',
    posted_at TIMESTAMP,
    reaction_count INTEGER DEFAULT 0,
    "messageId" VARCHAR,
    "moderationMessageId" VARCHAR,
    channel_id VARCHAR,
    tags TEXT[] DEFAULT '{}',
    moderation_comment TEXT,
    attachments JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create reaction_log table
CREATE TABLE IF NOT EXISTS reaction_log (
    id VARCHAR PRIMARY KEY,
    message_id VARCHAR NOT NULL,
    channel_id VARCHAR NOT NULL,
    confession_id UUID REFERENCES confession(id),
    reactions JSONB,
    total_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create weekly_stats table
CREATE TABLE IF NOT EXISTS weekly_stats (
    id SERIAL PRIMARY KEY,
    week INTEGER NOT NULL,
    year INTEGER NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    total_confessions INTEGER DEFAULT 0,
    approved_confessions INTEGER DEFAULT 0,
    rejected_confessions INTEGER DEFAULT 0,
    avg_reactions FLOAT DEFAULT 0.0,
    popular_tags JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(week, year)
);

-- Insert initial migration record
INSERT INTO migrations (timestamp, name) 
VALUES (1697184000000, 'InitialMigration1697184000000');

EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database schema created successfully${NC}"
else
    echo -e "${RED}Failed to create database schema${NC}"
    exit 1
fi

echo -e "${GREEN}Database has been completely recreated from scratch${NC}"
echo -e "${BLUE}Database ready to use!${NC}"