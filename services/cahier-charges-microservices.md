# Cahier des Charges - Système Helpdesk Microservices
## Développement Progressif et Intégration Modulaire

---

## 📑 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Stratégie de Développement](#stratégie-de-développement)
3. [Phase 1 - Auth Service](#phase-1---auth-service)
4. [Phase 2 - User Service](#phase-2---user-service)
5. [Phase 3 - Ticket Service](#phase-3---ticket-service)
6. [Phase 4 - File Service](#phase-4---file-service)
7. [Phase 5 - Notification Service](#phase-5---notification-service)
8. [Phase 6 - Audit Service](#phase-6---audit-service)
9. [Intégration et Tests](#intégration-et-tests)
10. [Déploiement](#déploiement)

---

## 🎯 Vue d'Ensemble

### Objectif
Développer un système helpdesk modulaire en microservices, permettant un développement isolé de chaque composant avec intégration progressive.

### Architecture Globale

```mermaid
graph TB
    subgraph "Phase 1 - Core"
        AUTH[Auth Service<br/>3001]
    end
    
    subgraph "Phase 2 - Users"
        USER[User Service<br/>3002]
    end
    
    subgraph "Phase 3 - Business"
        TICKET[Ticket Service<br/>3003]
        FILE[File Service<br/>3004]
    end
    
    subgraph "Phase 4 - Support"
        NOTIF[Notification Service<br/>3005]
        AUDIT[Audit Service<br/>3006]
    end
    
    AUTH --> USER
    USER --> TICKET
    TICKET --> FILE
    TICKET --> NOTIF
    ALL[All Services] --> AUDIT
    
    style AUTH fill:#ff9999
    style USER fill:#99ccff
    style TICKET fill:#99ff99
    style FILE fill:#ffcc99
    style NOTIF fill:#ff99ff
    style AUDIT fill:#cccccc
```

### Principes de Développement
- **Isolation** : Chaque service développé indépendamment
- **Mocking** : Simulation des dépendances non disponibles
- **Testabilité** : Tests unitaires et d'intégration à chaque phase
- **Documentation** : API documentée via Postman Collections

---

## 📊 Stratégie de Développement

### Planning des Phases

| Phase | Services | Durée | Dépendances | Priorité |
|-------|----------|-------|-------------|----------|
| 1 | Auth Service | 2 semaines | Aucune | Critique |
| 2 | User Service | 2 semaines | Auth | Critique |
| 3 | Ticket Service | 3 semaines | Auth, User | Haute |
| 4 | File Service | 2 semaines | Auth, Ticket | Moyenne |
| 5 | Notification Service | 2 semaines | Tous | Moyenne |
| 6 | Audit Service | 1 semaine | Tous | Basse |

### Environnements

```yaml
# Configuration des environnements
environments:
  development:
    - Services isolés avec mocks
    - Base de données locale
    - Logs verbeux
    
  integration:
    - Services interconnectés
    - Kafka activé
    - Tests E2E
    
  staging:
    - Configuration production
    - Monitoring complet
    - Tests de charge
    
  production:
    - HA et scaling
    - Sécurité maximale
    - Monitoring 24/7
```

---

## 🔐 Phase 1 - Auth Service

### Vue d'Ensemble

```mermaid
graph LR
    subgraph "Auth Service Architecture"
        API[API REST<br/>:3001]
        
        subgraph "Core Components"
            AUTH_CTRL[Auth Controller]
            AUTH_SVC[Auth Service]
            JWT[JWT Manager]
            CRYPTO[Crypto Service]
        end
        
        subgraph "Storage"
            PG[(PostgreSQL<br/>Users)]
            REDIS[(Redis<br/>Sessions)]
        end
        
        subgraph "External"
            KAFKA[Kafka Producer<br/>Mock in Dev]
        end
        
        API --> AUTH_CTRL
        AUTH_CTRL --> AUTH_SVC
        AUTH_SVC --> JWT
        AUTH_SVC --> CRYPTO
        AUTH_SVC --> PG
        JWT --> REDIS
        AUTH_SVC --> KAFKA
    end
```

### Spécifications Techniques

#### Base de Données
```sql
-- users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP
);

-- refresh_tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

#### API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Inscription utilisateur | Non |
| POST | `/auth/login` | Connexion | Non |
| POST | `/auth/logout` | Déconnexion | Oui |
| POST | `/auth/refresh` | Renouvellement token | Refresh Token |
| GET | `/auth/verify` | Vérification token | Oui |
| POST | `/auth/forgot-password` | Mot de passe oublié | Non |
| POST | `/auth/reset-password` | Réinitialisation mdp | Reset Token |
| GET | `/auth/me` | Info utilisateur connecté | Oui |

#### Modèles de Données

```typescript
// Request/Response Models
interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}
```

### Configuration Développement

```yaml
# docker-compose.auth.yml
version: '3.8'

services:
  auth-service:
    build: ./auth-service
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@auth-db:5432/auth_db
      - REDIS_URL=redis://auth-redis:6379
      - JWT_SECRET=dev-secret-change-in-prod
      - JWT_EXPIRES_IN=24h
      - REFRESH_TOKEN_EXPIRES_IN=7d
      - ENABLE_KAFKA=false
      - MOCK_EVENTS=true
    volumes:
      - ./auth-service:/app
      - /app/node_modules
    depends_on:
      - auth-db
      - auth-redis

  auth-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=auth_db
    volumes:
      - auth-db-data:/var/lib/postgresql/data
    ports:
      - "5401:5432"

  auth-redis:
    image: redis:7-alpine
    ports:
      - "6301:6379"

volumes:
  auth-db-data:
```

### Tests et Documentation

#### Structure des Tests
```
auth-service/
├── tests/
│   ├── unit/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── auth.test.js
│   │   └── security.test.js
│   └── mocks/
│       ├── kafka.mock.js
│       └── email.mock.js
```

#### Collection Postman
```json
{
  "info": {
    "name": "Auth Service API",
    "description": "Phase 1 - Authentication Service"
  },
  "auth": {
    "type": "bearer",
    "bearer": [{
      "key": "token",
      "value": "{{accessToken}}",
      "type": "string"
    }]
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001",
      "type": "string"
    },
    {
      "key": "accessToken",
      "value": "",
      "type": "string"
    }
  ]
}
```

### Mocks pour Développement Isolé

```javascript
// mocks/eventPublisher.mock.js
export class MockEventPublisher {
  constructor() {
    this.events = [];
  }

  async publish(topic, event) {
    console.log(`[MOCK EVENT] Publishing to ${topic}:`, event);
    this.events.push({ topic, event, timestamp: new Date() });
    
    // Simuler la latence réseau
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return { success: true, mockMode: true };
  }

  getPublishedEvents() {
    return this.events;
  }
}

// mocks/userService.mock.js
export class MockUserServiceClient {
  async createUserProfile(userId, email) {
    console.log(`[MOCK] Creating user profile for ${email}`);
    return {
      id: `profile-${userId}`,
      userId,
      email,
      createdAt: new Date()
    };
  }
}
```

---

## 👤 Phase 2 - User Service

### Vue d'Ensemble

```mermaid
graph LR
    subgraph "User Service Architecture"
        API[API REST<br/>:3002]
        
        subgraph "Core Components"
            USER_CTRL[User Controller]
            PROFILE_SVC[Profile Service]
            ADMIN_SVC[Admin Service]
            FILE_CLIENT[File Service Client<br/>Mocked in Dev]
        end
        
        subgraph "Storage"
            PG[(PostgreSQL<br/>Profiles)]
            REDIS[(Redis<br/>Cache)]
        end
        
        subgraph "Dependencies"
            AUTH_CLIENT[Auth Service Client]
            KAFKA[Kafka Consumer/Producer]
        end
        
        API --> USER_CTRL
        USER_CTRL --> PROFILE_SVC
        USER_CTRL --> ADMIN_SVC
        PROFILE_SVC --> PG
        PROFILE_SVC --> REDIS
        PROFILE_SVC --> FILE_CLIENT
        USER_CTRL --> AUTH_CLIENT
        PROFILE_SVC --> KAFKA
    end
```

### Spécifications Techniques

#### Base de Données
```sql
-- user_profiles table
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
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- user_activities table
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type VARCHAR(50),
    activity_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_department ON user_profiles(department);
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
```

#### API Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/users/profile` | Mon profil | Oui | User |
| PUT | `/users/profile` | Modifier profil | Oui | User |
| POST | `/users/avatar` | Upload avatar | Oui | User |
| DELETE | `/users/avatar` | Supprimer avatar | Oui | User |
| GET | `/users` | Liste utilisateurs | Oui | Admin |
| GET | `/users/:id` | Détails utilisateur | Oui | Admin |
| PUT | `/users/:id` | Modifier utilisateur | Oui | Admin |
| DELETE | `/users/:id` | Supprimer utilisateur | Oui | Admin |
| PUT | `/users/:id/role` | Changer rôle | Oui | Admin |
| GET | `/users/stats` | Statistiques | Oui | Admin |

### Configuration Développement

```yaml
# docker-compose.user.yml
version: '3.8'

services:
  user-service:
    build: ./user-service
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@user-db:5432/user_db
      - REDIS_URL=redis://user-redis:6379
      - AUTH_SERVICE_URL=http://auth-service:3001
      - FILE_SERVICE_URL=http://localhost:3004
      - ENABLE_FILE_SERVICE=false
      - MOCK_FILE_SERVICE=true
    depends_on:
      - user-db
      - user-redis

  user-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=user_db
    volumes:
      - user-db-data:/var/lib/postgresql/data
    ports:
      - "5402:5432"

  user-redis:
    image: redis:7-alpine
    ports:
      - "6302:6379"

volumes:
  user-db-data:
```

### Intégration avec Auth Service

```javascript
// services/authServiceClient.js
export class AuthServiceClient {
  constructor(config) {
    this.baseUrl = config.authServiceUrl;
    this.timeout = config.timeout || 5000;
  }

  async verifyToken(token) {
    try {
      const response = await axios.get(`${this.baseUrl}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Auth Service unavailable');
      }
      throw error;
    }
  }
}

// middleware/auth.js
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const authData = await authServiceClient.verifyToken(token);
    req.user = authData;
    next();
  } catch (error) {
    console.error('Auth verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

## 🎫 Phase 3 - Ticket Service

### Vue d'Ensemble

```mermaid
graph LR
    subgraph "Ticket Service Architecture"
        API[API REST<br/>:3003]
        
        subgraph "Core Components"
            TICKET_CTRL[Ticket Controller]
            TICKET_SVC[Ticket Service]
            WORKFLOW[Workflow Engine]
            SLA[SLA Manager]
            COMMENT_SVC[Comment Service]
        end
        
        subgraph "Storage"
            PG[(PostgreSQL<br/>Tickets)]
            REDIS[(Redis<br/>Cache & Queue)]
        end
        
        subgraph "Dependencies"
            AUTH[Auth Client]
            USER[User Client]
            FILE[File Client<br/>Mock in Dev]
            NOTIF[Notification Client<br/>Mock in Dev]
        end
        
        API --> TICKET_CTRL
        TICKET_CTRL --> TICKET_SVC
        TICKET_SVC --> WORKFLOW
        TICKET_SVC --> SLA
        TICKET_SVC --> COMMENT_SVC
        TICKET_SVC --> PG
        TICKET_SVC --> REDIS
        TICKET_CTRL --> AUTH
        TICKET_SVC --> USER
        TICKET_SVC --> FILE
        TICKET_SVC --> NOTIF
    end
```

### Workflow des Tickets

```mermaid
stateDiagram-v2
    [*] --> OPEN: Création
    OPEN --> IN_PROGRESS: Prise en charge (Admin)
    IN_PROGRESS --> WAITING_USER: Info requise
    IN_PROGRESS --> RESOLVED: Résolution
    WAITING_USER --> IN_PROGRESS: Réponse user
    RESOLVED --> CLOSED: Auto 24h ou User
    CLOSED --> [*]
    CLOSED --> OPEN: Réouverture < 7j
```

### Spécifications Techniques

#### Base de Données
```sql
-- tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    category VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    assigned_to UUID,
    resolution TEXT,
    due_date TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ticket_comments table
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ticket_history table
CREATE TABLE ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ticket_attachments table
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    file_id UUID NOT NULL,
    uploaded_by UUID NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_history_ticket_id ON ticket_history(ticket_id);
```

#### API Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/tickets` | Mes tickets | Oui | User |
| POST | `/tickets` | Créer ticket | Oui | User |
| GET | `/tickets/:id` | Détails ticket | Oui | User/Admin |
| PUT | `/tickets/:id` | Modifier ticket | Oui | Owner/Admin |
| DELETE | `/tickets/:id` | Supprimer ticket | Oui | Owner (si OPEN) |
| POST | `/tickets/:id/comments` | Ajouter commentaire | Oui | User/Admin |
| GET | `/tickets/:id/comments` | Lister commentaires | Oui | User/Admin |
| GET | `/admin/tickets` | Tous les tickets | Oui | Admin |
| PUT | `/admin/tickets/:id/assign` | Attribuer ticket | Oui | Admin |
| PUT | `/admin/tickets/:id/status` | Changer statut | Oui | Admin |
| GET | `/admin/tickets/stats` | Statistiques | Oui | Admin |

### SLA Configuration

```javascript
// config/sla.js
export const SLA_CONFIG = {
  URGENT: {
    responseTime: 30 * 60 * 1000,      // 30 minutes
    resolutionTime: 2 * 60 * 60 * 1000 // 2 heures
  },
  HIGH: {
    responseTime: 2 * 60 * 60 * 1000,  // 2 heures
    resolutionTime: 4 * 60 * 60 * 1000 // 4 heures
  },
  MEDIUM: {
    responseTime: 4 * 60 * 60 * 1000,   // 4 heures
    resolutionTime: 24 * 60 * 60 * 1000 // 24 heures
  },
  LOW: {
    responseTime: 24 * 60 * 60 * 1000,   // 24 heures
    resolutionTime: 72 * 60 * 60 * 1000  // 72 heures
  }
};

// services/slaManager.js
export class SLAManager {
  calculateDueDate(priority, createdAt = new Date()) {
    const sla = SLA_CONFIG[priority];
    return new Date(createdAt.getTime() + sla.resolutionTime);
  }

  isOverdue(ticket) {
    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      return false;
    }
    return new Date() > new Date(ticket.due_date);
  }

  getTimeRemaining(ticket) {
    const now = new Date();
    const dueDate = new Date(ticket.due_date);
    return Math.max(0, dueDate - now);
  }
}
```

---

## 📁 Phase 4 - File Service

### Vue d'Ensemble

```mermaid
graph LR
    subgraph "File Service Architecture"
        API[API REST<br/>:3004]
        
        subgraph "Core Components"
            FILE_CTRL[File Controller]
            UPLOAD_SVC[Upload Service]
            STORAGE[Storage Manager]
            VALIDATOR[File Validator]
            SCANNER[Virus Scanner<br/>Optional]
        end
        
        subgraph "Storage"
            MINIO[(MinIO<br/>Object Storage)]
            PG[(PostgreSQL<br/>Metadata)]
        end
        
        subgraph "Dependencies"
            AUTH[Auth Client]
            TICKET[Ticket Client]
        end
        
        API --> FILE_CTRL
        FILE_CTRL --> UPLOAD_SVC
        UPLOAD_SVC --> VALIDATOR
        UPLOAD_SVC --> SCANNER
        UPLOAD_SVC --> STORAGE
        STORAGE --> MINIO
        UPLOAD_SVC --> PG
        FILE_CTRL --> AUTH
        UPLOAD_SVC --> TICKET
    end
```

### Spécifications Techniques

#### Configuration Stockage
```javascript
// config/storage.js
export const STORAGE_CONFIG = {
  maxFileSize: 10 * 1024 * 1024,    // 10 MB
  maxFilesPerTicket: 10,
  maxTotalSizePerTicket: 50 * 1024 * 1024, // 50 MB
  
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ],
  
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif',
    '.pdf', '.doc', '.docx',
    '.xls', '.xlsx', '.txt'
  ],
  
  buckets: {
    tickets: 'helpdesk-tickets',
    avatars: 'helpdesk-avatars',
    temp: 'helpdesk-temp'
  }
};
```

#### Base de Données
```sql
-- files table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    bucket_name VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    ticket_id UUID,
    uploaded_by UUID NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    virus_scanned BOOLEAN DEFAULT false,
    virus_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- file_access_logs table
CREATE TABLE file_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id),
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_files_ticket_id ON files(ticket_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_file_hash ON files(file_hash);
CREATE INDEX idx_file_access_logs_file_id ON file_access_logs(file_id);
```

### Configuration Développement

```yaml
# docker-compose.file.yml
version: '3.8'

services:
  file-service:
    build: ./file-service
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@file-db:5432/file_db
      - AUTH_SERVICE_URL=http://auth-service:3001
      - TICKET_SERVICE_URL=http://ticket-service:3003
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
      - MINIO_USE_SSL=false
      - ENABLE_VIRUS_SCAN=false
    depends_on:
      - file-db
      - minio

  file-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=file_db
    volumes:
      - file-db-data:/var/lib/postgresql/data
    ports:
      - "5404:5432"

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

volumes:
  file-db-data:
  minio-data:
```

---

## 🔔 Phase 5 - Notification Service

### Vue d'Ensemble

```mermaid
graph LR
    subgraph "Notification Service Architecture"
        API[API REST<br/>:3005]
        CONSUMER[Kafka Consumer]
        
        subgraph "Core Components"
            NOTIF_CTRL[Notification Controller]
            TEMPLATE[Template Engine]
            QUEUE[Queue Manager]
            SENDER[Multi-Channel Sender]
        end
        
        subgraph "Channels"
            EMAIL[Email Service]
            SMS[SMS Service<br/>Future]
            PUSH[Push Service<br/>Future]
        end
        
        subgraph "Storage"
            PG[(PostgreSQL<br/>History)]
            REDIS[(Redis<br/>Queue)]
        end
        
        API --> NOTIF_CTRL
        CONSUMER --> QUEUE
        QUEUE --> SENDER
        SENDER --> TEMPLATE
        SENDER --> EMAIL
        SENDER --> SMS
        SENDER --> PUSH
        NOTIF_CTRL --> PG
        QUEUE --> REDIS
    end
```

### Templates de Notifications

```yaml
# templates/notifications.yml
templates:
  ticket_created:
    subject: "Ticket #{ticketNumber} créé - {title}"
    channels: [email]
    template: |
      Bonjour {userName},
      
      Votre ticket a été créé avec succès.
      
      Détails:
      - Numéro: #{ticketNumber}
      - Titre: {title}
      - Priorité: {priority}
      - Catégorie: {category}
      
      Vous pouvez suivre son évolution dans votre espace.
      
      Cordialement,
      L'équipe Support

  ticket_assigned:
    subject: "Nouveau ticket assigné - #{ticketNumber}"
    channels: [email]
    template: |
      Bonjour {adminName},
      
      Un nouveau ticket vous a été assigné.
      
      Détails:
      - Numéro: #{ticketNumber}
      - Titre: {title}
      - Priorité: {priority}
      - SLA: {dueTime}
      - Créé par: {userName}
      
      Merci de le prendre en charge rapidement.

  ticket_updated:
    subject: "Mise à jour ticket #{ticketNumber}"
    channels: [email]
    template: |
      Bonjour {userName},
      
      Votre ticket #{ticketNumber} a été mis à jour.
      
      Changements:
      - Statut: {oldStatus} → {newStatus}
      {additionalChanges}
      
      Commentaire de l'agent:
      {comment}
```

### Configuration Queue

```javascript
// services/queueManager.js
export class QueueManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.queues = {
      high: 'notifications:high',
      normal: 'notifications:normal',
      low: 'notifications:low'
    };
  }

  async addToQueue(notification, priority = 'normal') {
    const queue = this.queues[priority];
    const job = {
      id: uuidv4(),
      notification,
      attempts: 0,
      createdAt: new Date(),
      priority
    };
    
    await this.redis.lpush(queue, JSON.stringify(job));
    return job.id;
  }

  async processQueues() {
    // Traiter les queues par priorité
    for (const [priority, queue] of Object.entries(this.queues)) {
      const job = await this.redis.rpop(queue);
      if (job) {
        return JSON.parse(job);
      }
    }
    return null;
  }
}
```

---

## 📊 Phase 6 - Audit Service

### Vue d'Ensemble

```mermaid
graph LR
    subgraph "Audit Service Architecture"
        API[API REST<br/>:3006]
        CONSUMER[Kafka Consumer<br/>All Topics]
        
        subgraph "Core Components"
            AUDIT_CTRL[Audit Controller]
            LOG_PROCESSOR[Log Processor]
            METRICS[Metrics Collector]
            ANALYZER[Event Analyzer]
            REPORT[Report Generator]
        end
        
        subgraph "Storage"
            PG[(PostgreSQL<br/>Audit Logs)]
            TS[(TimescaleDB<br/>Metrics)]
            ELASTIC[(Elasticsearch<br/>Search)]
        end
        
        API --> AUDIT_CTRL
        CONSUMER --> LOG_PROCESSOR
        LOG_PROCESSOR --> ANALYZER
        ANALYZER --> PG
        ANALYZER --> TS
        ANALYZER --> ELASTIC
        AUDIT_CTRL --> REPORT
        REPORT --> PG
        REPORT --> TS
    end
```

### Event Processing

```javascript
// services/eventProcessor.js
export class EventProcessor {
  constructor(storageServices) {
    this.storage = storageServices;
    this.eventHandlers = new Map();
    this.initializeHandlers();
  }

  initializeHandlers() {
    // Auth events
    this.registerHandler('user.registered', this.handleUserRegistered);
    this.registerHandler('user.login', this.handleUserLogin);
    
    // Ticket events
    this.registerHandler('ticket.created', this.handleTicketCreated);
    this.registerHandler('ticket.updated', this.handleTicketUpdated);
    this.registerHandler('ticket.assigned', this.handleTicketAssigned);
    
    // File events
    this.registerHandler('file.uploaded', this.handleFileUploaded);
    
    // Add more handlers...
  }

  async processEvent(event) {
    const handler = this.eventHandlers.get(event.eventType);
    if (!handler) {
      console.warn(`No handler for event type: ${event.eventType}`);
      return;
    }

    try {
      await handler.call(this, event);
      await this.storage.saveRawEvent(event);
    } catch (error) {
      console.error(`Error processing event ${event.eventId}:`, error);
      await this.storage.saveFailedEvent(event, error);
    }
  }

  async handleTicketCreated(event) {
    const auditLog = {
      userId: event.userId,
      action: 'TICKET_CREATED',
      resourceType: 'ticket',
      resourceId: event.data.ticketId,
      details: {
        title: event.data.title,
        priority: event.data.priority,
        category: event.data.category
      },
      timestamp: event.timestamp
    };
    
    await this.storage.saveAuditLog(auditLog);
    await this.storage.updateMetrics('tickets_created', 1);
  }
}
```

---

## 🧪 Intégration et Tests

### Stratégie de Tests

```mermaid
graph TD
    subgraph "Test Pyramid"
        UNIT[Unit Tests<br/>70%]
        INTEGRATION[Integration Tests<br/>20%]
        E2E[E2E Tests<br/>10%]
    end
    
    UNIT --> INTEGRATION
    INTEGRATION --> E2E
```

### Structure des Tests

```
project-root/
├── services/
│   ├── auth-service/
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   └── postman/
│   │       └── auth-service.postman_collection.json
│   └── [other services...]
├── tests/
│   ├── e2e/
│   │   ├── scenarios/
│   │   └── helpers/
│   └── integration/
│       ├── phase1/
│       ├── phase2/
│       └── phase3/
└── docker-compose.test.yml
```

### Tests d'Intégration Progressive

#### Phase 1: Auth Service Seul
```javascript
// tests/integration/phase1/auth.test.js
describe('Phase 1: Auth Service Integration', () => {
  let authService;
  
  beforeAll(async () => {
    authService = await startAuthService({
      mockExternalServices: true
    });
  });

  describe('User Registration', () => {
    it('should register new user', async () => {
      const response = await request(authService)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!'
        });
        
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
    });
  });
});
```

#### Phase 2: Auth + User Services
```javascript
// tests/integration/phase2/auth-user.test.js
describe('Phase 2: Auth + User Services Integration', () => {
  let services;
  
  beforeAll(async () => {
    services = await startServices(['auth', 'user'], {
      mockFileService: true,
      mockNotificationService: true
    });
  });

  it('should create user profile after registration', async () => {
    // 1. Register via Auth Service
    const authResponse = await request(services.auth)
      .post('/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'SecurePass123!'
      });
    
    const { accessToken, user } = authResponse.body;
    
    // 2. Verify profile created in User Service
    const profileResponse = await request(services.user)
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);
      
    expect(profileResponse.body.email).toBe('newuser@example.com');
    expect(profileResponse.body.userId).toBe(user.id);
  });
});
```

### Configuration CI/CD

```yaml
# .github/workflows/test.yml
name: Test Microservices

on: [push, pull_request]

jobs:
  test-phase-1:
    name: Test Phase 1 - Auth Service
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd services/auth-service
          npm ci
      - name: Run unit tests
        run: |
          cd services/auth-service
          npm run test:unit
      - name: Start Docker services
        run: |
          docker-compose -f docker-compose.auth.yml up -d
      - name: Run integration tests
        run: |
          cd services/auth-service
          npm run test:integration
      - name: Run Postman tests
        run: |
          newman run services/auth-service/postman/auth-service.postman_collection.json \
            --environment environments/dev.postman_environment.json

  test-phase-2:
    name: Test Phase 2 - User Service Integration
    needs: test-phase-1
    runs-on: ubuntu-latest
    # Similar steps for phase 2...
```

---

## 🚀 Déploiement

### Environnements

```mermaid
graph LR
    subgraph "Deployment Pipeline"
        DEV[Development<br/>Local]
        INT[Integration<br/>Docker Compose]
        STAGING[Staging<br/>Kubernetes]
        PROD[Production<br/>Kubernetes]
    end
    
    DEV -->|Unit Tests| INT
    INT -->|Integration Tests| STAGING
    STAGING -->|E2E Tests| PROD
```

### Configuration Production

```yaml
# kubernetes/auth-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: helpdesk
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: helpdesk/auth-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auth-db-secret
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Monitoring et Observabilité

```yaml
# monitoring/prometheus-config.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3001']
    metrics_path: '/metrics'
    
  - job_name: 'user-service'
    static_configs:
      - targets: ['user-service:3002']
    metrics_path: '/metrics'
    
  # Other services...

# monitoring/alerts.yml
groups:
  - name: helpdesk-alerts
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          
      - alert: HighResponseTime
        expr: http_request_duration_seconds{quantile="0.95"} > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time on {{ $labels.job }}"
```

---

## 📋 Checklist de Développement

### ✅ Par Service
- [ ] Structure du projet initialisée
- [ ] Base de données et migrations
- [ ] Models et schemas définis
- [ ] API endpoints implémentés
- [ ] Validation des données
- [ ] Gestion des erreurs
- [ ] Tests unitaires (>80% coverage)
- [ ] Tests d'intégration
- [ ] Documentation API (Postman)
- [ ] Dockerfile optimisé
- [ ] Health checks
- [ ] Métriques Prometheus
- [ ] Logs structurés
- [ ] Variables d'environnement documentées

### ✅ Par Phase d'Intégration
- [ ] Mocks des services dépendants
- [ ] Tests d'intégration inter-services
- [ ] Circuit breakers configurés
- [ ] Retry policies implémentées
- [ ] Timeouts appropriés
- [ ] Gestion des erreurs en cascade
- [ ] Tests de charge
- [ ] Documentation des flux
- [ ] Postman collection mise à jour
- [ ] Monitoring end-to-end

### ✅ Avant Production
- [ ] Security scan des images
- [ ] Secrets management (Vault/K8s secrets)
- [ ] Backup strategy
- [ ] Disaster recovery plan
- [ ] Performance benchmarks
- [ ] Load testing results
- [ ] Documentation complète
- [ ] Runbooks opérationnels
- [ ] Formation équipe support
- [ ] Plan de rollback

---

## 🔗 Ressources et Liens

### Documentation
- [Postman Collections](./postman/)
- [Architecture Diagrams](./diagrams/)
- [API Documentation](./docs/api/)
- [Deployment Guide](./docs/deployment/)

### Repositories
- [Auth Service](https://github.com/company/helpdesk-auth-service)
- [User Service](https://github.com/company/helpdesk-user-service)
- [Ticket Service](https://github.com/company/helpdesk-ticket-service)
- [File Service](https://github.com/company/helpdesk-file-service)
- [Notification Service](https://github.com/company/helpdesk-notification-service)
- [Audit Service](https://github.com/company/helpdesk-audit-service)

### Outils
- [Postman](https://www.postman.com/)
- [Docker](https://www.docker.com/)
- [Kubernetes](https://kubernetes.io/)
- [MinIO](https://min.io/)
- [Kafka](https://kafka.apache.org/)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)