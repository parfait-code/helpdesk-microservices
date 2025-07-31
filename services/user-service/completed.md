# User Service Documentation

## 📋 Vue d'ensemble

Le **User Service** est responsable de la gestion des profils utilisateurs dans l'architecture microservices du système helpdesk. Il fournit des fonctionnalités complètes pour la gestion des profils, avatars, préférences utilisateur et administration.

### 🎯 Fonctionnalités principales

-   **Gestion des profils** : Création, mise à jour, consultation des profils utilisateurs
-   **Upload d'avatars** : Gestion des photos de profil avec redimensionnement automatique
-   **Préférences utilisateur** : Stockage et gestion des préférences (langue, thème, notifications)
-   **Administration** : Interface admin pour gérer tous les utilisateurs
-   **Historique d'activité** : Tracking des actions utilisateurs pour audit
-   **Cache Redis** : Performance optimisée avec mise en cache
-   **Événements Kafka** : Publication d'événements pour synchronisation

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "User Service (Port 3002)"
        API[API REST]

        subgraph "Controllers"
            PROFILE_CTRL[Profile Controller]
            ADMIN_CTRL[Admin Controller]
        end

        subgraph "Services"
            PROFILE_SVC[Profile Service]
            ADMIN_SVC[Admin Service]
        end

        subgraph "Models"
            PROFILE_MODEL[UserProfile]
            ACTIVITY_MODEL[UserActivity]
        end

        subgraph "External Clients"
            AUTH_CLIENT[Auth Service Client]
            FILE_CLIENT[File Service Client]
        end
    end

    subgraph "Storage"
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis Cache)]
    end

    subgraph "External Services"
        AUTH_SVC[Auth Service]
        FILE_SVC[File Service]
        KAFKA[Kafka]
    end

    API --> PROFILE_CTRL
    API --> ADMIN_CTRL
    PROFILE_CTRL --> PROFILE_SVC
    ADMIN_CTRL --> ADMIN_SVC
    PROFILE_SVC --> PROFILE_MODEL
    PROFILE_SVC --> ACTIVITY_MODEL
    ADMIN_SVC --> PROFILE_MODEL
    PROFILE_SVC --> POSTGRES
    PROFILE_SVC --> REDIS
    AUTH_CLIENT --> AUTH_SVC
    FILE_CLIENT --> FILE_SVC
    PROFILE_SVC --> KAFKA
```

---

## 🗄️ Base de données

### Tables principales

#### user_profiles

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100),
    job_title VARCHAR(100),
    avatar_url VARCHAR(500),
    avatar_file_id VARCHAR(100),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### user_activities

```sql
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Structure des préférences (JSONB)

```json
{
    "language": "fr",
    "theme": "light",
    "notifications": {
        "email": true,
        "browser": true,
        "sms": false
    },
    "timezone": "Europe/Paris"
}
```

---

## 🔌 API Endpoints

### 👤 Endpoints Utilisateur

| Method | Endpoint            | Description              | Auth | Body         |
| ------ | ------------------- | ------------------------ | ---- | ------------ |
| GET    | `/users/profile`    | Obtenir son profil       | ✅   | -            |
| PUT    | `/users/profile`    | Mettre à jour son profil | ✅   | ProfileData  |
| POST   | `/users/avatar`     | Upload avatar            | ✅   | FormData     |
| DELETE | `/users/avatar`     | Supprimer avatar         | ✅   | -            |
| GET    | `/users/activities` | Historique activités     | ✅   | Query params |

### 👨‍💼 Endpoints Admin

| Method | Endpoint          | Description           | Auth | Role  |
| ------ | ----------------- | --------------------- | ---- | ----- |
| GET    | `/users`          | Liste utilisateurs    | ✅   | Admin |
| GET    | `/users/:id`      | Détails utilisateur   | ✅   | Admin |
| PUT    | `/users/:id`      | Modifier utilisateur  | ✅   | Admin |
| DELETE | `/users/:id`      | Supprimer utilisateur | ✅   | Admin |
| PUT    | `/users/:id/role` | Changer rôle          | ✅   | Admin |
| GET    | `/users/stats`    | Statistiques          | ✅   | Admin |

### 🔧 Endpoints Système

| Method | Endpoint  | Description       | Auth |
| ------ | --------- | ----------------- | ---- |
| GET    | `/health` | Status du service | ❌   |
| GET    | `/`       | Info API          | ❌   |

---

## 📝 Modèles de données

### ProfileUpdateRequest

```json
{
    "firstName": "string (2-100 chars)",
    "lastName": "string (2-100 chars)",
    "phone": "string (format E.164)",
    "department": "string (max 100 chars)",
    "jobTitle": "string (max 100 chars)",
    "preferences": {
        "language": "fr|en|es",
        "theme": "light|dark|auto",
        "notifications": {
            "email": "boolean",
            "browser": "boolean",
            "sms": "boolean"
        },
        "timezone": "string (IANA timezone)"
    }
}
```

### ProfileResponse

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "userId": "uuid",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "phone": "string",
        "department": "string",
        "jobTitle": "string",
        "avatarUrl": "string",
        "preferences": {},
        "createdAt": "datetime",
        "updatedAt": "datetime"
    }
}
```

### ActivityResponse

```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "userId": "uuid",
            "activityType": "string",
            "activityData": {},
            "ipAddress": "string",
            "userAgent": "string",
            "createdAt": "datetime"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 100,
        "pages": 5
    }
}
```

---

## ⚙️ Configuration

### Variables d'environnement

```bash
# Service
NODE_ENV=development
PORT=3002

# Base de données
DATABASE_URL=postgresql://user:pass@localhost:5402/user_db
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6302
REDIS_PROFILE_TTL=3600
REDIS_USER_LIST_TTL=300

# Services externes
AUTH_SERVICE_URL=http://localhost:3001
FILE_SERVICE_URL=http://localhost:3004
ENABLE_FILE_SERVICE=false
MOCK_FILE_SERVICE=true

# Kafka
ENABLE_KAFKA=false
KAFKA_BROKERS=localhost:9092

# Upload
UPLOAD_MAX_SIZE=5242880
ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/webp

# Sécurité
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX=100
JWT_SECRET=your-secret-key

# Logs
LOG_LEVEL=info
LOG_FORMAT=combined
```

---

## 🚀 Installation et Démarrage

### Prérequis

-   Node.js 18+
-   PostgreSQL 15+
-   Redis 7+
-   Docker (optionnel)

### Installation locale

```bash
# Clone et installation
git clone <repository>
cd user-service
npm install

# Configuration
cp .env.example .env
# Éditer .env avec vos paramètres

# Base de données
npm run db:migrate up
npm run db:seed run

# Démarrage
npm run dev
```

### Installation Docker

```bash
# Construire et démarrer
make build
make up

# Ou directement
docker-compose -f docker-compose.user.yml up -d

# Migrations et seed
make migrate
make seed

# Voir les logs
make logs
```

---

## 🧪 Tests

### Exécution des tests

```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tous les tests avec coverage
npm test

# Tests en mode watch
npm run test:watch
```

### Structure des tests

```
tests/
├── unit/
│   ├── models/
│   ├── services/
│   └── controllers/
├── integration/
│   ├── routes/
│   └── database/
├── mocks/
└── setup.js
```

---

## 📊 Monitoring et Métriques

### Health Check

```bash
curl http://localhost:3002/api/v1/health
```

### Métriques disponibles

-   Nombre d'utilisateurs total
-   Nouveaux utilisateurs (7j/30j)
-   Répartition par département
-   Types d'activités
-   Performance cache Redis

### Logs structurés

```json
{
    "timestamp": "2024-01-01T12:00:00Z",
    "level": "info",
    "service": "user-service",
    "message": "Profile updated",
    "userId": "123",
    "changes": ["firstName", "lastName"]
}
```

---

## 🔄 Intégration avec autres services

### Auth Service

-   Vérification des tokens JWT
-   Récupération des informations utilisateur
-   Changement de rôles

### File Service

-   Upload des avatars
-   Suppression des fichiers
-   Redimensionnement automatique

### Kafka Events

```json
// Événements publiés
{
  "profile.created": { "userId", "email", "createdAt" },
  "profile.updated": { "userId", "oldData", "newData" },
  "avatar.updated": { "userId", "avatarUrl", "fileId" },
  "user.deleted": { "userId", "deletedBy", "userData" }
}

// Événements consommés
{
  "auth.user.registered": { "userId", "email", "firstName" }
}
```

---

## 🔒 Sécurité

### Authentification

-   JWT Bearer tokens via Auth Service
-   Validation automatique des permissions
-   Rate limiting par endpoint

### Autorisation

-   Rôles : `user`, `admin`, `manager`
-   Middleware de contrôle d'accès
-   Vérification de propriété des données

### Protection des données

-   Sanitisation des logs
-   Chiffrement des données sensibles
-   Headers de sécurité (Helmet.js)

### Upload sécurisé

-   Validation des types MIME
-   Limitation de taille (5MB)
-   Redimensionnement automatique
-   Scan antivirus (à implémenter)

---

## 🐛 Débogage

### Logs courants

```bash
# Logs en temps réel
docker-compose -f docker-compose.user.yml logs -f user-service

# Logs avec niveau spécifique
LOG_LEVEL=debug npm run dev
```

### Problèmes fréquents

1. **Erreur de connexion Auth Service**

    ```
    Solution: Vérifier AUTH_SERVICE_URL et que l'auth-service est démarré
    ```

2. **Erreur Redis**

    ```
    Solution: Vérifier REDIS_URL et que Redis est accessible
    ```

3. **Erreur PostgreSQL**

    ```
    Solution: Vérifier DATABASE_URL et exécuter les migrations
    ```

4. **Upload échoue**
    ```
    Solution: Vérifier UPLOAD_MAX_SIZE et les permissions de fichier
    ```

---

## 📈 Performance

### Optimisations implémentées

-   **Cache Redis** : Profils mis en cache pendant 1h
-   **Pagination** : Limitation des résultats par page
-   **Index database** : Index sur user_id, email, department
-   **Connection pooling** : Pool de connexions PostgreSQL
-   **Compression** : Compression gzip des réponses

### Recommandations production

-   Utiliser un CDN pour les avatars
-   Implémenter un cache distribué
-   Monitoring avec Prometheus/Grafana
-   Load balancing horizontal

---

## 🔄 CI/CD

### Pipeline GitHub Actions

```yaml
name: User Service CI/CD
on: [push, pull_request]
jobs:
    test:
        runs-on: ubuntu-latest
        services:
            postgres:
                image: postgres:15
            redis:
                image: redis:7
        steps:
            - uses: actions/checkout@v3
            - name: Setup Node.js
              uses: actions/setup-node@v3
            - name: Install dependencies
              run: npm ci
            - name: Run migrations
              run: npm run db:migrate up
            - name: Run tests
              run: npm test
            - name: Build Docker image
              run: docker build -t user-service .
```

---

## 📞 Support

### Équipe responsable

-   **Product Owner** : [Nom]
-   **Tech Lead** : [Nom]
-   **Développeurs** : [Noms]

### Canaux de communication

-   **Slack** : #user-service-support
-   **Email** : user-service@company.com
-   **Issues** : [GitHub Issues URL]

### Documentation supplémentaire

-   [Architecture Decisions Records](./docs/adr/)
-   [Runbooks](./docs/runbooks/)
-   [API Specification](./docs/api-spec.yml)

---

_Dernière mise à jour : $(date)_
