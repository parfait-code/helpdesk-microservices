# Ticket Service

Service de gestion des tickets pour l'architecture microservices Helpdesk.

## 🚀 Démarrage rapide

### Prérequis

-   Node.js 18+
-   PostgreSQL (pour production)
-   Redis (pour cache)

### Installation locale

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Éditer le fichier .env avec vos paramètres

# 3. Démarrer le service
npm start

# Ou en développement avec rechargement automatique
npm run dev
```

### Avec Docker (recommandé)

```bash
# Service seul
docker-compose -f docker-compose.ticket.yml up --build -d

# Ou dans l'environnement global
cd ../../
docker-compose -f docker-compose.services.yml up --build -d ticket-service
```

## 🔧 Configuration

### Variables d'environnement

| Variable           | Description         | Défaut                                                    |
| ------------------ | ------------------- | --------------------------------------------------------- |
| `PORT`             | Port du service     | `3003`                                                    |
| `NODE_ENV`         | Environnement       | `development`                                             |
| `DATABASE_URL`     | URL PostgreSQL      | `postgresql://ticket:ticketpass@localhost:5403/ticket_db` |
| `REDIS_URL`        | URL Redis           | `redis://localhost:6303`                                  |
| `AUTH_SERVICE_URL` | URL du service auth | `http://localhost:3001`                                   |
| `USER_SERVICE_URL` | URL du service user | `http://localhost:3002`                                   |

### Base de données

Le service utilise PostgreSQL avec les tables suivantes :

-   `tickets` : Table principale des tickets

Les migrations sont appliquées automatiquement au démarrage.

## 📡 API Endpoints

### Health Check

```
GET /api/v1/health
```

Retourne l'état du service et de ses dépendances.

### Service Info

```
GET /
```

Informations générales sur le service.

### Intégration Files (préparé)

```
GET /api/v1/tickets/files/:ticketId
```

Endpoint prêt pour l'intégration avec le file-service.

## 🔍 Vérification

```bash
# Vérifier le service
node scripts/verify-ticket-service.js

# Health check rapide
npm run health
```

## 🐳 Docker

### Images

-   **Base** : `node:18-alpine`
-   **Port** : `3003`
-   **Health check** : Intégré

### Services liés

-   `ticket-db` : PostgreSQL 15
-   `ticket-redis` : Redis 7
-   `ticket-adminer` : Interface admin DB (port 8083)

### Commandes utiles

```bash
# Voir les logs
docker-compose -f docker-compose.ticket.yml logs -f

# Accéder au conteneur
docker exec -it ticket-service /bin/sh

# Rebuild complet
docker-compose -f docker-compose.ticket.yml down --volumes
docker-compose -f docker-compose.ticket.yml up --build
```

## 🔗 Intégration avec autres services

### Dépendances

-   **Auth Service** (port 3001) : Authentification
-   **User Service** (port 3002) : Gestion des utilisateurs
-   **File Service** (port 3004) : Gestion des fichiers (optionnel)
-   **Notification Service** (port 3005) : Notifications (optionnel)

### Communication

-   HTTP REST API pour communication inter-services
-   Redis pour le cache partagé
-   Kafka pour les événements (désactivé par défaut)

## 📝 Logs

Les logs sont disponibles dans :

-   Console (développement)
-   `logs/error.log` (erreurs)
-   `logs/combined.log` (tous les logs)

## 🧪 Tests

```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Test de disponibilité
npm run test:ready

# Tous les tests
npm test
```

## 🚨 Dépannage

### Service ne démarre pas

1. Vérifier que PostgreSQL est accessible
2. Vérifier les variables d'environnement
3. Consulter les logs : `docker logs ticket-service`

### Problèmes de connexion DB

1. Vérifier l'URL de la base : `DATABASE_URL`
2. Tester la connexion : `npm run db:test`
3. Redémarrer PostgreSQL

### Performance

1. Vérifier Redis : `redis-cli ping`
2. Monitorer les logs de performance
3. Ajuster les pools de connexion DB

## 📊 Monitoring

### Health Endpoints

-   `/api/v1/health` : État général
-   `/` : Informations service

### Métriques disponibles

-   Statut base de données
-   Statut cache Redis
-   Connectivité services externes

### Alertes recommandées

-   Service indisponible
-   Base de données inaccessible
-   Cache Redis en échec
-   Temps de réponse élevé (>5s)

---

## 🏗️ Architecture

```
ticket-service/
├── src/
│   ├── app.js              # Application principale
│   ├── config/             # Configuration
│   ├── controllers/        # Contrôleurs API
│   ├── middleware/         # Middlewares
│   ├── models/             # Modèles de données
│   ├── routes/             # Définition des routes
│   ├── utils/              # Utilitaires
│   ├── database.js         # Gestion DB
│   └── migrations/         # Scripts SQL
├── tests/                  # Tests
├── scripts/                # Scripts utilitaires
├── logs/                   # Fichiers de logs
├── docker-compose.ticket.yml
├── Dockerfile
└── README.md
```
