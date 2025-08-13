# 📚 Documentation API - Helpdesk Microservices

Documentation complète des APIs REST pour tous les services du système helpdesk.

## 📋 Table des Matières

- [Vue d'ensemble](#-vue-densemble)
- [Authentification](#-authentification)
- [Auth Service API](#-auth-service-api)
- [User Service API](#-user-service-api)
- [Ticket Service API](#-ticket-service-api)
- [File Service API](#-file-service-api)
- [Notification Service API](#-notification-service-api)
- [Audit Service API](#-audit-service-api)
- [Codes d'Erreur](#-codes-derreur)
- [Exemples d'Utilisation](#-exemples-dutilisation)

## 🔍 Vue d'ensemble

Toutes les APIs suivent les conventions REST et retournent des réponses JSON standardisées.

### Format de Réponse Standard

```json
{
  "success": true,
  "message": "Opération réussie",
  "data": {
    // Données de la réponse
  },
  "pagination": {
    // Informations de pagination (si applicable)
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Format d'Erreur Standard

```json
{
  "success": false,
  "message": "Description de l'erreur",
  "error": "Code d'erreur spécifique",
  "details": {
    // Détails additionnels si disponibles
  }
}
```

## 🔐 Authentification

Le système utilise l'authentification JWT (JSON Web Tokens) avec refresh tokens.

### Headers Requis

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Gestion des Tokens

- **Access Token** : Durée de vie courte (1h par défaut)
- **Refresh Token** : Durée de vie longue (7j par défaut)
- **Rotation** : Les refresh tokens sont renouvelés à chaque utilisation

## 🔑 Auth Service API

**Base URL** : `http://localhost:3001/api/v1`

### POST /auth/register

Inscription d'un nouvel utilisateur.

**Body** :
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response 201** :
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "createdAt": "2025-08-13T10:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "dGVzdC1yZWZyZXNoLXRva2Vu...",
      "expiresIn": 3600
    }
  }
}
```

### POST /auth/login

Connexion utilisateur.

**Body** :
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response 200** :
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "lastLoginAt": "2025-08-13T10:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "dGVzdC1yZWZyZXNoLXRva2Vu...",
      "expiresIn": 3600
    }
  }
}
```

### POST /auth/refresh

Renouvellement du token d'accès.

**Body** :
```json
{
  "refreshToken": "dGVzdC1yZWZyZXNoLXRva2Vu..."
}
```

### POST /auth/verify

Vérification d'un token JWT.

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Response 200** :
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "iat": 1692787200,
    "exp": 1692790800
  }
}
```

### POST /auth/logout

Déconnexion (invalidation du refresh token).

**Headers** :
```http
Authorization: Bearer <access_token>
```

### POST /auth/forgot-password

Demande de réinitialisation de mot de passe.

**Body** :
```json
{
  "email": "john.doe@example.com"
}
```

### POST /auth/reset-password

Réinitialisation du mot de passe.

**Body** :
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

## 👤 User Service API

**Base URL** : `http://localhost:3002/api/v1`

### GET /users/profile

Récupération du profil utilisateur connecté.

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Response 200** :
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "avatar": "https://example.com/avatars/john.jpg",
    "department": "IT",
    "role": "user",
    "isActive": true,
    "createdAt": "2025-08-13T10:00:00Z",
    "updatedAt": "2025-08-13T10:00:00Z"
  }
}
```

### PUT /users/profile

Mise à jour du profil utilisateur.

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Body** :
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+0987654321",
  "department": "Marketing"
}
```

### GET /users/:id

Récupération d'un profil utilisateur par ID.

**Headers** :
```http
Authorization: Bearer <access_token>
```

### GET /users

Liste des utilisateurs (admin uniquement).

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Query Parameters** :
- `page` : Numéro de page (défaut: 1)
- `limit` : Éléments par page (défaut: 10)
- `search` : Recherche par nom/email
- `role` : Filtrer par rôle
- `department` : Filtrer par département

### POST /users

Création d'un utilisateur (admin uniquement).

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Body** :
```json
{
  "email": "new.user@example.com",
  "firstName": "New",
  "lastName": "User",
  "department": "Support",
  "role": "agent"
}
```

### PUT /users/:id

Mise à jour d'un utilisateur (admin uniquement).

### DELETE /users/:id

Suppression d'un utilisateur (admin uniquement).

### POST /users/avatar

Upload d'avatar utilisateur.

**Headers** :
```http
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Body** : Formulaire multipart avec le champ `avatar`

## 🎫 Ticket Service API

**Base URL** : `http://localhost:3003/api/v1`

### POST /tickets

Création d'un nouveau ticket.

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Body** :
```json
{
  "title": "Problème de connexion",
  "description": "Je ne peux pas me connecter à l'application depuis ce matin.",
  "priority": "medium",
  "category": "technical",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response 201** :
```json
{
  "success": true,
  "message": "Ticket created successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "Problème de connexion",
    "description": "Je ne peux pas me connecter à l'application depuis ce matin.",
    "status": "open",
    "priority": "medium",
    "category": "technical",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "assigneeId": null,
    "createdAt": "2025-08-13T10:00:00Z",
    "updatedAt": "2025-08-13T10:00:00Z"
  }
}
```

### GET /tickets

Récupération de tous les tickets avec pagination et filtres.

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Query Parameters** :
- `page` : Numéro de page (défaut: 1)
- `limit` : Éléments par page (défaut: 10)
- `status` : Filtrer par statut (`open`, `in_progress`, `resolved`, `closed`)
- `priority` : Filtrer par priorité (`low`, `medium`, `high`, `urgent`)
- `category` : Filtrer par catégorie
- `userId` : Filtrer par utilisateur
- `assigneeId` : Filtrer par assigné
- `search` : Recherche dans titre/description

**Response 200** :
```json
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "data": {
    "tickets": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "title": "Problème de connexion",
        "description": "Je ne peux pas me connecter...",
        "status": "open",
        "priority": "medium",
        "category": "technical",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "assigneeId": null,
        "createdAt": "2025-08-13T10:00:00Z",
        "updatedAt": "2025-08-13T10:00:00Z"
      }
    ],
    "totalCount": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### GET /tickets/:id

Récupération d'un ticket par ID.

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Response 200** :
```json
{
  "success": true,
  "message": "Ticket retrieved successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "Problème de connexion",
    "description": "Je ne peux pas me connecter à l'application depuis ce matin.",
    "status": "open",
    "priority": "medium",
    "category": "technical",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "assigneeId": null,
    "createdAt": "2025-08-13T10:00:00Z",
    "updatedAt": "2025-08-13T10:00:00Z",
    "comments": [
      {
        "id": "comment-id",
        "content": "Nous enquêtons sur ce problème",
        "authorId": "agent-id",
        "createdAt": "2025-08-13T11:00:00Z"
      }
    ]
  }
}
```

### PUT /tickets/:id

Mise à jour d'un ticket.

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Body** :
```json
{
  "title": "Problème de connexion - Résolu",
  "description": "Problème résolu après redémarrage du serveur",
  "status": "resolved",
  "priority": "low",
  "assigneeId": "agent-id"
}
```

### DELETE /tickets/:id

Suppression d'un ticket (admin uniquement).

### GET /tickets/stats

Statistiques des tickets.

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Response 200** :
```json
{
  "success": true,
  "message": "Ticket statistics retrieved successfully",
  "data": [
    {
      "status": "open",
      "priority": "medium",
      "count": "5"
    },
    {
      "status": "in_progress",
      "priority": "high",
      "count": "3"
    }
  ]
}
```

### GET /tickets/user/:userId

Tickets d'un utilisateur spécifique.

### POST /tickets/:id/comments

Ajouter un commentaire à un ticket.

**Body** :
```json
{
  "content": "Problème identifié, nous travaillons dessus"
}
```

### POST /tickets/:id/assign

Assigner un ticket à un agent.

**Body** :
```json
{
  "assigneeId": "agent-uuid"
}
```

## 📁 File Service API

**Base URL** : `http://localhost:3004/api/v1`

### POST /files/upload

Upload d'un fichier.

**Headers** :
```http
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Body** : Formulaire multipart avec le champ `file`

**Response 201** :
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "file-uuid",
    "filename": "document.pdf",
    "originalName": "mon-document.pdf",
    "mimeType": "application/pdf",
    "size": 1048576,
    "url": "/api/v1/files/file-uuid",
    "uploadedBy": "user-uuid",
    "createdAt": "2025-08-13T10:00:00Z"
  }
}
```

### GET /files/:id

Téléchargement d'un fichier.

**Headers** :
```http
Authorization: Bearer <access_token>
```

### DELETE /files/:id

Suppression d'un fichier.

### GET /files

Liste des fichiers utilisateur.

**Query Parameters** :
- `page` : Numéro de page
- `limit` : Éléments par page
- `type` : Filtrer par type MIME

## 🔔 Notification Service API

**Base URL** : `http://localhost:3005/api/v1`

### POST /notifications/send

Envoi d'une notification.

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Body** :
```json
{
  "recipient": "user-uuid",
  "type": "email",
  "subject": "Nouveau ticket créé",
  "content": "Un nouveau ticket a été créé...",
  "data": {
    "ticketId": "ticket-uuid"
  }
}
```

### GET /notifications

Notifications de l'utilisateur connecté.

### PUT /notifications/:id/read

Marquer une notification comme lue.

### DELETE /notifications/:id

Supprimer une notification.

## 📋 Audit Service API

**Base URL** : `http://localhost:3006/api/v1`

### GET /audit/logs

Récupération des logs d'audit.

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Query Parameters** :
- `startDate` : Date de début
- `endDate` : Date de fin
- `userId` : Filtrer par utilisateur
- `action` : Filtrer par action
- `resource` : Filtrer par ressource

### POST /audit/log

Créer un log d'audit (interne).

## ❌ Codes d'Erreur

### Codes HTTP Standard

| Code | Signification | Description |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée |
| 400 | Bad Request | Requête malformée |
| 401 | Unauthorized | Authentification requise |
| 403 | Forbidden | Accès interdit |
| 404 | Not Found | Ressource non trouvée |
| 409 | Conflict | Conflit (ex: email déjà utilisé) |
| 422 | Unprocessable Entity | Erreur de validation |
| 500 | Internal Server Error | Erreur serveur |

### Codes d'Erreur Personnalisés

| Code | Description |
|------|-------------|
| `AUTH_INVALID_CREDENTIALS` | Identifiants invalides |
| `AUTH_TOKEN_EXPIRED` | Token expiré |
| `AUTH_TOKEN_INVALID` | Token invalide |
| `USER_NOT_FOUND` | Utilisateur non trouvé |
| `USER_ALREADY_EXISTS` | Utilisateur déjà existant |
| `TICKET_NOT_FOUND` | Ticket non trouvé |
| `TICKET_ACCESS_DENIED` | Accès au ticket refusé |
| `FILE_TOO_LARGE` | Fichier trop volumineux |
| `FILE_TYPE_NOT_ALLOWED` | Type de fichier non autorisé |
| `VALIDATION_ERROR` | Erreur de validation |

## 💡 Exemples d'Utilisation

### Scénario Complet : Création et Gestion d'un Ticket

```bash
# 1. Inscription
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# 2. Récupération du token (depuis la réponse d'inscription)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Création d'un ticket
curl -X POST http://localhost:3003/api/v1/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Problème de connexion",
    "description": "Je ne peux pas me connecter",
    "priority": "medium",
    "category": "technical"
  }'

# 4. Liste des tickets
curl -X GET "http://localhost:3003/api/v1/tickets?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 5. Mise à jour du ticket
TICKET_ID="660e8400-e29b-41d4-a716-446655440001"
curl -X PUT http://localhost:3003/api/v1/tickets/$TICKET_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }'
```

### Collection Postman

Une collection Postman complète est disponible dans le repository :
- `postman-collection.json` : Collection principale
- `postman-environment.json` : Variables d'environnement

### SDK JavaScript (Exemple)

```javascript
class HelpdeskAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }
  
  async createTicket(ticketData) {
    const response = await fetch(`${this.baseURL}/api/v1/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ticketData)
    });
    return response.json();
  }
  
  async getTickets(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseURL}/api/v1/tickets?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }
}

// Utilisation
const api = new HelpdeskAPI('http://localhost:3003', 'your-token');
const ticket = await api.createTicket({
  title: 'Problème urgent',
  description: 'Description détaillée',
  priority: 'high'
});
```

---

Cette documentation API complète vous permet d'intégrer facilement tous les services du système helpdesk microservices dans vos applications.
