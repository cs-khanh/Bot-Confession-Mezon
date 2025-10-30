docker compose -f docker-compose.db.yml up -d

docker exec -it mezon-bot-template-postgres-1 psql -U postgres -c "DROP DATABASE confession_bot;"
docker exec -it mezon-bot-template-postgres-1 psql -U postgres -c "CREATE DATABASE confession_bot;"