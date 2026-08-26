#!/bin/bash
set -e
echo "Gás Pago — Deploy"
git pull origin master
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
docker exec gaspago-api npx prisma migrate deploy
docker system prune -f
echo "Deploy concluido!"
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
