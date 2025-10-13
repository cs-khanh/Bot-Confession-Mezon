#!/bin/bash

# Script to create news table in the database

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
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

echo -e "${YELLOW}Creating news table in database ${DB_NAME}...${NC}"

# Create news table
docker exec -i mezon-bot-template-postgres-1 psql -U $DB_USER -d $DB_NAME << EOF
-- Create news table
CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link VARCHAR(1000) UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    title VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    source VARCHAR(200) NOT NULL,
    "imageUrl" VARCHAR,
    posted BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_news_link ON news(link);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_posted ON news(posted);
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}News table created or already exists${NC}"
else
    echo -e "${RED}Failed to create news table${NC}"
    exit 1
fi

echo -e "${GREEN}Database schema updated successfully${NC}"