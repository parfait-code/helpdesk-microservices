# Copier le fix

docker cp server-fix.js auth-service:/app/server.js

# Redémarrer le conteneur pour appliquer les changements

docker-compose -f docker-compose.auth.yml restart auth-service

# Demarrer le conteneur

docker-compose -f docker-compose.auth.yml up -d

# Suivre les logs

docker logs -f auth-service

# Arreter le serveur

docker-compose -f docker-compose.auth.yml down -v
