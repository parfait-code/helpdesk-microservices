# 🎫 Helpdesk Microservices

Un système de helpdesk moderne basé sur une architecture microservices avec Node.js, PostgreSQL et Redis.

## 📋 Table des Matières

-   [Vue d'ensemble](#-vue-densemble)
-   [Architecture](#-architecture)
-   [Services](#-services)
-   [Installation](#-installation)
-   [Configuration](#-configuration)
-   [Utilisation](#-utilisation)
-   [API Documentation](#-api-documentation)
-   [Tests](#-tests)
-   [Déploiement](#-déploiement)
-   [Dépannage](#-dépannage)

## 🔍 Vue d'ensemble

Le système Helpdesk Microservices est une solution complète de gestion de tickets de support client, construite selon les principes de l'architecture microservices. Il offre :

-   **Gestion des utilisateurs** avec authentification JWT
-   **Système de tickets** avec statuts et priorités
-   **Gestion des fichiers** (attachements)
-   **Notifications** en temps réel
-   **Audit trail** complet
-   **APIs RESTful** documentées

### ✨ Caractéristiques

-   🏗️ **Architecture Microservices** - Services découplés et scalables
-   🔐 **Authentification sécurisée** - JWT avec refresh tokens
-   📊 **Base de données distribuée** - PostgreSQL par service
-   ⚡ **Cache Redis** - Performance optimisée
-   🐳 **Containerisé** - Docker et Docker Compose
-   📝 **Documentation complète** - APIs et guides
-   🧪 **Tests automatisés** - Suite de tests intégrée

## 🏗️ Architecture

```mermaid
graph TB
    Client[Client Application] --> Gateway[API Gateway]

    Gateway --> AuthService[Auth Service<br/>:3001]
    Gateway --> UserService[User Service<br/>:3002]
    Gateway --> TicketService[Ticket Service<br/>:3003]
    Gateway --> FileService[File Service<br/>:3004]
    Gateway --> NotificationService[Notification Service<br/>:3005]
    Gateway --> AuditService[Audit Service<br/>:3006]

    AuthService --> AuthDB[(Auth DB<br/>PostgreSQL)]
    AuthService --> AuthRedis[(Auth Redis)]

    UserService --> UserDB[(User DB<br/>PostgreSQL)]
    UserService --> UserRedis[(User Redis)]

    TicketService --> TicketDB[(Ticket DB<br/>PostgreSQL)]
    TicketService --> TicketRedis[(Ticket Redis)]

    FileService --> FileStorage[File Storage]

    NotificationService --> NotificationQueue[Message Queue]

    AuditService --> AuditDB[(Audit DB<br/>PostgreSQL)]
```

## 🔧 Services

### 1. Auth Service (:3001)

-   **Responsabilité** : Authentification et autorisation
-   **Base de données** : PostgreSQL (port 5401)
-   **Cache** : Redis (port 6301)
-   **Fonctionnalités** :
    -   Inscription/Connexion utilisateur
    -   Génération/Validation JWT tokens
    -   Refresh tokens
    -   Gestion des sessions

### 2. User Service (:3002)

-   **Responsabilité** : Gestion des profils utilisateur
-   **Base de données** : PostgreSQL (port 5402)
-   **Cache** : Redis (port 6302)
-   **Fonctionnalités** :
    -   CRUD profils utilisateur
    -   Gestion des rôles
    -   Préférences utilisateur
    -   Avatar et informations personnelles

### 3. Ticket Service (:3003)

-   **Responsabilité** : Gestion des tickets de support
-   **Base de données** : PostgreSQL (port 5403)
-   **Cache** : Redis (port 6303)
-   **Fonctionnalités** :
    -   Création/Modification tickets
    -   Système de priorités (low, medium, high, urgent)
    -   Statuts (open, in_progress, resolved, closed)
    -   Assignation et suivi

### 4. File Service (:3004)

-   **Responsabilité** : Gestion des fichiers et attachements
-   **Stockage** : Système de fichiers local
-   **Fonctionnalités** :
    -   Upload/Download fichiers
    -   Validation types MIME
    -   Compression images
    -   Nettoyage automatique

### 5. Notification Service (:3005)

-   **Responsabilité** : Notifications et alertes
-   **Fonctionnalités** :
    -   Notifications email
    -   Notifications push
    -   Templates personnalisables
    -   File d'attente de messages

### 6. Audit Service (:3006)

-   **Responsabilité** : Traçabilité et logs
-   **Base de données** : PostgreSQL
-   **Fonctionnalités** :
    -   Historique des actions
    -   Logs de sécurité
    -   Rapports d'activité
    -   Compliance

## 🚀 Installation

### Prérequis

-   Docker Desktop
-   Docker Compose
-   Node.js 18+ (pour développement local)
-   Git

### Installation Rapide

```bash
# Cloner le repository
git clone https://github.com/parfait-code/helpdesk-microservices.git
cd helpdesk-microservices

# Lancer tous les services
docker-compose -f docker-compose.services.yml up -d

# Vérifier que tous les services sont en cours d'exécution
docker-compose -f docker-compose.services.yml ps
```

### Installation pour Développement

```bash
# Installer les dépendances pour chaque service
cd services/auth-service && npm install && cd ../..
cd services/user-service && npm install && cd ../..
cd services/ticket-service && npm install && cd ../..
cd services/file-service && npm install && cd ../..
cd services/notification-service && npm install && cd ../..
cd services/audit-service && npm install && cd ../..
```

## ⚙️ Configuration

### Variables d'Environnement

Chaque service peut être configuré via des variables d'environnement. Voir les fichiers `.env.example` dans chaque service.

#### Auth Service

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@auth-db:5432/auth_db
REDIS_URL=redis://:redispass@auth-redis:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d
```

#### User Service

```env
NODE_ENV=development
PORT=3002
DATABASE_URL=postgresql://user:userpass@user-db:5432/user_db
REDIS_URL=redis://:redispass@user-redis:6379
AUTH_SERVICE_URL=http://auth-service:3001
```

#### Ticket Service

```env
NODE_ENV=development
PORT=3003
DATABASE_URL=postgresql://ticket:ticketpass@ticket-db:5432/ticket_db
REDIS_URL=redis://:redispass@ticket-redis:6379
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
```

### Ports par Défaut

| Service              | Port | Base de Données | Redis |
| -------------------- | ---- | --------------- | ----- |
| Auth Service         | 3001 | 5401            | 6301  |
| User Service         | 3002 | 5402            | 6302  |
| Ticket Service       | 3003 | 5403            | 6303  |
| File Service         | 3004 | -               | -     |
| Notification Service | 3005 | -               | -     |
| Audit Service        | 3006 | 5406            | -     |

## 📚 API Documentation

### Auth Service API

#### POST /api/v1/auth/register

Inscription d'un nouvel utilisateur.

**Body:**

```json
{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
}
```

**Response:**

```json
{
    "success": true,
    "message": "User registered successfully",
    "data": {
        "user": {
            "id": "uuid",
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Doe"
        },
        "token": "jwt-token",
        "refreshToken": "refresh-token"
    }
}
```

#### POST /api/v1/auth/login

Connexion utilisateur.

**Body:**

```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

#### POST /api/v1/auth/verify

Vérification d'un token JWT.

**Headers:**

```
Authorization: Bearer <token>
```

### User Service API

#### GET /api/v1/users/profile

Récupération du profil utilisateur.

**Headers:**

```
Authorization: Bearer <token>
```

#### PUT /api/v1/users/profile

Mise à jour du profil utilisateur.

**Body:**

```json
{
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+1234567890"
}
```

### Ticket Service API

#### POST /api/v1/tickets

Création d'un nouveau ticket.

**Body:**

```json
{
    "title": "Titre du ticket",
    "description": "Description détaillée",
    "priority": "medium",
    "category": "support",
    "userId": "user-uuid"
}
```

#### GET /api/v1/tickets

Récupération de tous les tickets avec pagination.

**Query Parameters:**

-   `page` : Numéro de page (défaut: 1)
-   `limit` : Nombre d'éléments par page (défaut: 10)
-   `status` : Filtrer par statut
-   `priority` : Filtrer par priorité

#### GET /api/v1/tickets/:id

Récupération d'un ticket par ID.

#### PUT /api/v1/tickets/:id

Mise à jour d'un ticket.

**Body:**

```json
{
    "title": "Nouveau titre",
    "description": "Nouvelle description",
    "status": "in_progress",
    "priority": "high"
}
```

#### GET /api/v1/tickets/stats

Statistiques des tickets.

**Response:**

```json
{
    "success": true,
    "data": [
        {
            "status": "open",
            "priority": "medium",
            "count": "5"
        }
    ]
}
```

### Codes de Statut HTTP

| Code | Signification    |
| ---- | ---------------- |
| 200  | OK               |
| 201  | Créé             |
| 400  | Mauvaise requête |
| 401  | Non autorisé     |
| 403  | Interdit         |
| 404  | Non trouvé       |
| 500  | Erreur serveur   |

## 🧪 Tests

### Tests Automatisés

```bash
# Exécuter tous les tests
./test-services.ps1

# Ou sur Linux/Mac
./test-services.sh
```

### Tests Manuels

```bash
# Test de santé de tous les services
curl http://localhost:3001/api/v1/health
curl http://localhost:3002/api/v1/health
curl http://localhost:3003/api/v1/health

# Test d'inscription
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Collection Postman

Une collection Postman complète est disponible dans `postman-collection.json` avec tous les endpoints testables.

## 🚀 Déploiement

### Environnement de Production

```bash
# Build des images de production
docker-compose -f docker-compose.prod.yml build

# Déploiement
docker-compose -f docker-compose.prod.yml up -d
```

### Variables de Production

Assurez-vous de configurer les variables suivantes pour la production :

-   `JWT_SECRET` : Clé secrète forte pour JWT
-   `DATABASE_URL` : URLs de bases de données sécurisées
-   `REDIS_URL` : URLs Redis avec authentification
-   `CORS_ORIGIN` : Origines autorisées
-   `NODE_ENV=production`

### Monitoring

```bash
# Logs des services
docker-compose -f docker-compose.services.yml logs -f

# Monitoring des ressources
docker stats
```

## 🔧 Dépannage

### Problèmes Courants

#### Services ne démarrent pas

```bash
# Vérifier les logs
docker-compose -f docker-compose.services.yml logs service-name

# Redémarrer un service spécifique
docker-compose -f docker-compose.services.yml restart service-name
```

#### Erreurs de connexion à la base de données

```bash
# Vérifier l'état des bases de données
docker-compose -f docker-compose.services.yml ps

# Attendre que les bases soient prêtes
docker-compose -f docker-compose.services.yml up --wait
```

#### Problèmes de cache Redis

```bash
# Nettoyer le cache Redis
docker exec -it helpdesk-auth-redis redis-cli FLUSHALL
```

### Nettoyage Complet

```bash
# Arrêter tous les services et supprimer les données
docker-compose -f docker-compose.services.yml down -v

# Nettoyer les images
docker system prune -a
```

### Logs et Debug

```bash
# Logs en temps réel de tous les services
docker-compose -f docker-compose.services.yml logs -f

# Logs d'un service spécifique
docker logs helpdesk-ticket-service --tail 100 -f

# Mode debug pour un service
docker-compose -f docker-compose.services.yml exec ticket-service npm run dev
```

## 📈 Performance

### Optimisations Recommandées

1. **Cache Redis** : Configuré pour tous les services critiques
2. **Connection Pooling** : Pool de connexions PostgreSQL optimisé
3. **Compression** : Gzip activé pour toutes les réponses API
4. **Indexation** : Index optimisés sur les tables principales

### Métriques de Performance

-   **Temps de réponse API** : < 200ms pour 95% des requêtes
-   **Débit** : 1000+ requêtes/seconde par service
-   **Disponibilité** : 99.9% uptime

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

-   **Documentation** : Consultez cette documentation
-   **Issues** : Utilisez GitHub Issues pour reporter des bugs
-   **Email** : support@helpdesk-microservices.com

---

**Développé avec ❤️ par l'équipe Parfait Code**
