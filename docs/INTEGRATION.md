# Guide d'Intégration des Microservices

## Vue d'ensemble

Cette documentation décrit l'intégration entre les microservices `auth-service` et `user-service` dans l'architecture Helpdesk.

## Architecture

```
┌─────────────────┐    HTTP/API    ┌─────────────────┐
│   Auth Service  │◄──────────────►│  User Service   │
│    Port: 3001   │                │   Port: 3002    │
└─────────────────┘                └─────────────────┘
         │                                   │
         │                                   │
    ┌─────────┐                         ┌─────────┐
    │ Auth DB │                         │ User DB │
    │  :5401  │                         │  :5402  │
    └─────────┘                         └─────────┘
         │                                   │
    ┌─────────┐                         ┌─────────┐
    │Auth Redis│                        │User Redis│
    │  :6301  │                         │  :6302  │
    └─────────┘                         └─────────┘
```

## Flux d'Authentification

### 1. Inscription/Connexion

```mermaid
sequenceDiagram
    participant Client
    participant AuthService
    participant UserService

    Client->>AuthService: POST /api/auth/register
    AuthService-->>Client: {accessToken, user}

    Client->>UserService: GET /api/profile/me (Bearer token)
    UserService->>AuthService: GET /api/auth/verify (Bearer token)
    AuthService-->>UserService: {valid: true, user}
    UserService-->>Client: Profile data or create profile
```

### 2. Vérification de Token

```mermaid
sequenceDiagram
    participant UserService
    participant AuthService

    UserService->>AuthService: GET /api/auth/verify
    Note over UserService,AuthService: Authorization: Bearer {token}

    alt Token valide
        AuthService-->>UserService: 200 {success: true, user}
    else Token invalide
        AuthService-->>UserService: 401 {success: false, error}
    end
```

## Endpoints d'Intégration

### Auth Service (Port 3001)

#### Authentication Publique

-   `POST /api/auth/register` - Inscription
-   `POST /api/auth/login` - Connexion
-   `POST /api/auth/refresh` - Renouvellement token

#### Vérification (utilisé par les microservices)

-   `GET /api/auth/verify` - Vérification de token
-   `GET /api/auth/users/:userId` - Informations utilisateur par ID
-   `GET /api/auth/users/email/:email` - Informations utilisateur par email

#### Protégé

-   `GET /api/auth/me` - Profil utilisateur connecté
-   `POST /api/auth/logout` - Déconnexion
-   `GET /api/auth/stats` - Statistiques (admin)

### User Service (Port 3002)

#### Profil Utilisateur

-   `GET /api/profile/me` - Profil utilisateur
-   `PUT /api/profile/me` - Mise à jour profil
-   `POST /api/profile/avatar` - Upload avatar

#### Administration

-   `GET /api/admin/users` - Liste des utilisateurs (admin)
-   `GET /api/admin/stats` - Statistiques (admin)

## Configuration Requise

### Variables d'Environnement

#### Auth Service (.env)

```properties
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5401/auth_db
REDIS_URL=redis://localhost:6301
JWT_SECRET=your-very-long-secret-key
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000,http://localhost:3002
```

#### User Service (.env)

```properties
NODE_ENV=development
PORT=3002
DATABASE_URL=postgresql://user:userpass@localhost:5402/user_db
REDIS_URL=redis://localhost:6302
AUTH_SERVICE_URL=http://localhost:3001
AUTH_SERVICE_TIMEOUT=5000
```

## Déploiement

### Avec Docker Compose

```bash
# Démarrer tous les services
docker-compose -f docker-compose.services.yml up -d

# Vérifier l'état
docker-compose -f docker-compose.services.yml ps
```

### Avec Makefile

```bash
# Installation
make install

# Démarrage
make start

# Tests d'intégration
make test-integration

# Monitoring
make logs
```

## Sécurité

### Headers de Sécurité

-   Helmet.js activé sur les deux services
-   CORS configuré pour les domaines autorisés
-   Rate limiting sur les endpoints sensibles

### Gestion des Tokens

-   JWT avec expiration (24h par défaut)
-   Refresh tokens pour renouvellement
-   Blacklist des tokens révoqués dans Redis

### Validation

-   Validation des données avec express-validator
-   Sanitisation des entrées utilisateur
-   Protection contre les injections SQL

## Monitoring et Santé

### Health Checks

-   `GET /health` sur chaque service
-   Vérification automatique des dépendances
-   Métriques de performance

### Logs

-   Logs structurés avec Winston
-   Rotation automatique des logs
-   Niveaux de log configurables

## Tests d'Intégration

Le script `scripts/test-integration.js` vérifie :

-   Santé des services
-   Inscription/connexion utilisateur
-   Vérification des tokens
-   Communication inter-services
-   Middleware d'authentification

```bash
node scripts/test-integration.js
```

## Dépannage

### Problèmes Courants

1. **Erreur "Auth Service unavailable"**

    - Vérifier que auth-service est démarré
    - Contrôler la configuration `AUTH_SERVICE_URL`

2. **Token invalide/expiré**

    - Vérifier la synchronisation des horloges
    - Contrôler la configuration `JWT_SECRET`

3. **Erreur de connexion base de données**
    - Vérifier les URLs de connexion
    - S'assurer que les bases sont initialisées

### Logs Utiles

```bash
# Logs auth-service
docker logs helpdesk-auth-service -f

# Logs user-service
docker logs helpdesk-user-service -f

# Logs bases de données
docker logs helpdesk-auth-db -f
```

## Performance

### Optimisations

-   Mise en cache Redis des tokens et sessions
-   Pool de connexions PostgreSQL optimisé
-   Compression gzip activée
-   Timeouts configurables

### Métriques

-   Temps de réponse API
-   Utilisation mémoire/CPU
-   Nombre de connexions actives
-   Taux d'erreur par endpoint

## Évolution

### Ajout d'un Nouveau Service

1. Implémenter `AuthServiceClient` similaire
2. Configurer les variables d'environnement
3. Ajouter les health checks
4. Mettre à jour les tests d'intégration

### Migration Base de Données

-   Scripts de migration dans `/scripts/`
-   Sauvegarde automatique avant migration
-   Tests de régression post-migration

## Support

Pour toute question ou problème d'intégration :

1. Vérifier cette documentation
2. Exécuter les tests d'intégration
3. Consulter les logs des services
4. Vérifier la configuration réseau/DNS
