#!/bin/bash

# Script to reset only the PostgreSQL database without affecting other services

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${BLUE}    RESETTING POSTGRESQL DATABASE ONLY    ${NC}"
echo -e "${YELLOW}========================================${NC}"

# Step 1: Confirm with the user
echo -e "${YELLOW}WARNING: This will delete all your database data.${NC}"
read -p "Are you sure you want to proceed? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Operation cancelled by user${NC}"
    exit 1
fi

# Step 2: Stop the PostgreSQL container
echo -e "${YELLOW}1. Stopping PostgreSQL container...${NC}"
POSTGRES_CONTAINER=$(docker ps -q --filter name=mezon-bot-template-postgres)
if [ -n "$POSTGRES_CONTAINER" ]; then
    docker stop $POSTGRES_CONTAINER
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   PostgreSQL container stopped successfully${NC}"
    else
        echo -e "${RED}   Error stopping PostgreSQL container${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}   PostgreSQL container is not running${NC}"
fi

# Step 3: Remove the PostgreSQL container
echo -e "${YELLOW}2. Removing PostgreSQL container...${NC}"
POSTGRES_CONTAINER=$(docker ps -a -q --filter name=mezon-bot-template-postgres)
if [ -n "$POSTGRES_CONTAINER" ]; then
    docker rm $POSTGRES_CONTAINER
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   PostgreSQL container removed successfully${NC}"
    else
        echo -e "${RED}   Error removing PostgreSQL container${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}   PostgreSQL container does not exist${NC}"
fi

# Step 4: Remove the PostgreSQL volume
echo -e "${YELLOW}3. Removing PostgreSQL volume...${NC}"
docker volume rm mezon-bot-template_postgres_data
if [ $? -eq 0 ]; then
    echo -e "${GREEN}   PostgreSQL volume removed successfully${NC}"
else
    echo -e "${RED}   Error removing PostgreSQL volume${NC}"
    # Continue anyway as the volume might not exist
fi

# Step 5: Recreate the PostgreSQL container
echo -e "${YELLOW}4. Recreating PostgreSQL container...${NC}"
docker compose up -d postgres
if [ $? -eq 0 ]; then
    echo -e "${GREEN}   PostgreSQL container recreated successfully${NC}"
else
    echo -e "${RED}   Error recreating PostgreSQL container${NC}"
    exit 1
fi

# Step 6: Wait for PostgreSQL to be ready
echo -e "${YELLOW}5. Waiting for PostgreSQL to be ready...${NC}"
RETRIES=10
until docker exec -i mezon-bot-template-postgres-1 psql -U postgres -c "select 1" > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    echo -e "${YELLOW}   Waiting for PostgreSQL to start... ($RETRIES retries left)${NC}"
    RETRIES=$((RETRIES-1))
    sleep 2
done

if [ $RETRIES -eq 0 ]; then
    echo -e "${RED}   Error: PostgreSQL did not start in time${NC}"
    exit 1
fi
echo -e "${GREEN}   PostgreSQL is ready${NC}"

# Step 7: Build the application
echo -e "${YELLOW}6. Building the application...${NC}"
yarn build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}   Application built successfully${NC}"
else
    echo -e "${RED}   Error building application${NC}"
    exit 1
fi

echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}    DATABASE RESET COMPLETE    ${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "${BLUE}Now you can start the application with:${NC}"
echo -e "${GREEN}yarn start:dev${NC}"
echo -e "${BLUE}The migrations will run automatically and create all needed tables.${NC}"
echo -e "${YELLOW}========================================${NC}"