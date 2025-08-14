# API Gateway - Point d'entrée unique pour les microservices

## Vue d'ensemble

Cette configuration utilise **Nginx** comme reverse proxy pour fournir un point d'entrée unique à tous vos microservices. Au lieu d'avoir à gérer plusieurs URLs et ports pour chaque service, votre frontend peut maintenant utiliser une seule base URL.

## Architecture

```
Frontend (localhost:3000)
    ↓
Nginx Gateway (localhost:8080)
    ↓
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Auth Service   │  User Service   │ Ticket Service  │  File Service   │
│  (port 3001)    │  (port 3002)    │  (port 3003)    │  (port 3004)    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## Configuration des Routes

| Service | Route Frontend   | Service Interne       |
| ------- | ---------------- | --------------------- |
| Auth    | `/api/auth/*`    | `auth-service:3001`   |
| Users   | `/api/users/*`   | `user-service:3002`   |
| Tickets | `/api/tickets/*` | `ticket-service:3003` |
| Files   | `/api/files/*`   | `file-service:3004`   |

## Démarrage

### 1. Démarrer tous les services avec Nginx

```bash
# Démarrer tous les services incluant le reverse proxy
docker-compose -f docker-compose.services.yml up -d

# Vérifier que tous les services sont en cours d'exécution
docker-compose -f docker-compose.services.yml ps
```

### 2. Vérifier le fonctionnement

```bash
# Health check du reverse proxy
curl http://localhost:8080/health

# Informations sur l'API Gateway
curl http://localhost:8080/

# Test d'un service (exemple: auth service)
curl http://localhost:8080/api/auth/health
```

## Configuration Frontend

### Base URL unique

Au lieu d'utiliser plusieurs URLs :

-   ~~`http://localhost:3001`~~ (auth-service)
-   ~~`http://localhost:3002`~~ (user-service)
-   ~~`http://localhost:3003`~~ (ticket-service)
-   ~~`http://localhost:3004`~~ (file-service)

Utilisez maintenant une seule URL : **`http://localhost:8080`**

### Variables d'environnement

Créez un fichier `.env` dans votre application frontend :

```env
# Point d'entrée unique via Nginx
REACT_APP_API_URL=http://localhost:8080

# Ou pour la production
# REACT_APP_API_URL=https://api.votre-domaine.com
```

### Exemple d'utilisation

```javascript
import apiClient from "./api-client.js";

// Toutes les requêtes passent maintenant par le même domaine
const users = await apiClient.getUsers();
const tickets = await apiClient.getTickets();
const loginResult = await apiClient.login({ email, password });
```

## Avantages de cette approche

### 🔒 **Sécurité**

-   Point d'entrée unique plus facile à sécuriser
-   Configuration CORS centralisée
-   Rate limiting global

### 🌐 **Résolution des problèmes CORS**

-   Fini les problèmes de cross-origin entre services
-   Configuration centralisée dans Nginx

### 📈 **Scalabilité**

-   Load balancing possible pour chaque service
-   Cache centralisé (possible d'ajouter)
-   Monitoring centralisé

### 🔧 **Maintenance**

-   Configuration centralisée
-   Logs centralisés
-   Déploiement simplifié

### 💻 **Développement**

-   Une seule URL à configurer dans le frontend
-   Pas besoin de gérer différents ports
-   Environment variables simplifiées

## Monitoring et Logs

### Logs Nginx

Les logs sont disponibles dans le dossier `nginx/logs/` :

```bash
# Voir les logs d'accès
tail -f nginx/logs/access.log

# Voir les logs d'erreur
tail -f nginx/logs/error.log
```

### Health Checks

```bash
# Health check du gateway
curl http://localhost:8080/health

# Health check de chaque service via le gateway
curl http://localhost:8080/api/auth/health
curl http://localhost:8080/api/users/health
curl http://localhost:8080/api/tickets/health
curl http://localhost:8080/api/files/health
```

## Personnalisation

### Modifier les routes

Éditez le fichier `nginx/nginx.conf` pour :

-   Ajouter de nouveaux services
-   Modifier les préfixes de route
-   Configurer le cache
-   Ajouter de l'authentification au niveau du proxy

### Exemple de nouvelle route

```nginx
# Nouveau service de notifications
location /api/notifications/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://notification-service:3005/;
    proxy_redirect off;
}
```

## Production

Pour la production, il est recommandé de :

1. **Utiliser HTTPS**
2. **Configurer un nom de domaine**
3. **Ajouter des certificats SSL**
4. **Configurer le cache**
5. **Ajouter de la surveillance**

Exemple de configuration production dans `nginx.conf` :

```nginx
server {
    listen 443 ssl http2;
    server_name api.votre-domaine.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Reste de la configuration...
}
```

## Dépannage

### Service non accessible

1. Vérifiez que tous les conteneurs sont en cours d'exécution :

    ```bash
    docker-compose -f docker-compose.services.yml ps
    ```

2. Vérifiez les logs Nginx :

    ```bash
    docker logs helpdesk-nginx-gateway
    ```

3. Testez directement un service :
    ```bash
    docker exec -it helpdesk-nginx-gateway wget -qO- http://auth-service:3001/health
    ```

### Problèmes CORS

Si vous rencontrez encore des problèmes CORS, vérifiez :

1. Que l'origine du frontend est bien configurée dans `nginx.conf`
2. Que vos services acceptent les requêtes depuis Nginx
3. Les en-têtes dans la réponse du navigateur

### Performance

Pour améliorer les performances :

1. Activez le cache Nginx
2. Configurez la compression gzip
3. Utilisez HTTP/2
4. Implémentez le load balancing si nécessaire

## Support

Pour toute question ou problème, consultez :

1. Les logs Nginx dans `nginx/logs/`
2. Les logs des services individuels
3. La documentation de chaque microservice
