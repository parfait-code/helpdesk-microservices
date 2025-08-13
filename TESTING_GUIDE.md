# Guide de Test - Helpdesk Microservices

## Configuration des Services

**Ports des services :**

-   Auth Service: `http://localhost:3001`
-   User Service: `http://localhost:3002`
-   Ticket Service: `http://localhost:3003`

## 🚀 Démarrage des Services

```bash
cd c:\Users\kouam\Desktop\Helpdesk\helpdesk-microservices
docker-compose -f docker-compose.services.yml up --build
```

---

## 1. 🔍 HEALTH CHECKS

### Auth Service Health

```http
GET http://localhost:3001/health
```

### User Service Health

```http
GET http://localhost:3002/api/v1/health
```

### Ticket Service Health

```http
GET http://localhost:3003/api/v1/health
```

---

## 2. 🔐 AUTHENTICATION

### Inscription d'un utilisateur

```http
POST http://localhost:3001/api/v1/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "SecurePass123!",
  "firstName": "Test",
  "lastName": "User",
  "role": "user"
}
```

### Connexion

```http
POST http://localhost:3001/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

**Réponse attendue :**

```json
{
    "success": true,
    "data": {
        "user": {
            "id": "uuid-here",
            "email": "test@example.com",
            "role": "user"
        },
        "accessToken": "eyJ...",
        "refreshToken": "eyJ..."
    }
}
```

### Vérification du token

```http
POST http://localhost:3001/api/v1/auth/verify
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Rafraîchissement du token

```http
POST http://localhost:3001/api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

---

## 3. 👤 GESTION UTILISATEUR

### Obtenir son profil

```http
GET http://localhost:3002/api/v1/users/profile
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Mettre à jour son profil

```http
PUT http://localhost:3002/api/v1/users/profile
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "firstName": "UpdatedName",
  "lastName": "UpdatedLastName",
  "phone": "+1234567890",
  "bio": "Ma nouvelle bio"
}
```

### Obtenir ses activités

```http
GET http://localhost:3002/api/v1/users/activities
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 4. 🎫 GESTION DES TICKETS

### Créer un ticket

```http
POST http://localhost:3003/api/v1/tickets
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Bug dans l'application mobile",
  "description": "L'application mobile crash lors de l'ouverture de la page profil. Steps to reproduce: 1. Ouvrir l'app 2. Aller sur profil 3. App crash",
  "priority": "high",
  "category": "bug",
  "userId": "USER_UUID_FROM_LOGIN"
}
```

**Valeurs autorisées :**

-   `priority`: `"low"`, `"medium"`, `"high"`, `"urgent"`
-   `category`: Texte libre (ex: `"bug"`, `"support"`, `"feature-request"`, `"technical"`)
-   `status`: `"open"` (défaut), `"in_progress"`, `"pending"`, `"resolved"`, `"closed"`

### Obtenir tous les tickets (avec pagination)

```http
GET http://localhost:3003/api/v1/tickets?page=1&limit=10
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Obtenir un ticket par ID

```http
GET http://localhost:3003/api/v1/tickets/TICKET_UUID
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Mettre à jour un ticket

```http
PUT http://localhost:3003/api/v1/tickets/TICKET_UUID
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "status": "in_progress",
  "priority": "urgent",
  "description": "Description mise à jour avec plus de détails",
  "assigneeId": "ASSIGNEE_UUID_OPTIONAL"
}
```

### Obtenir les tickets d'un utilisateur

```http
GET http://localhost:3003/api/v1/tickets/user/USER_UUID
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Obtenir les tickets assignés

```http
GET http://localhost:3003/api/v1/tickets/assigned/ASSIGNEE_UUID
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Obtenir les statistiques des tickets

```http
GET http://localhost:3003/api/v1/tickets/stats
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Obtenir les fichiers d'un ticket (intégration future)

```http
GET http://localhost:3003/api/v1/tickets/TICKET_UUID/files
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Supprimer un ticket

```http
DELETE http://localhost:3003/api/v1/tickets/TICKET_UUID
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 5. 📊 SCÉNARIOS DE TEST COMPLETS

### Scénario 1: Création d'une demande de support

```http
POST http://localhost:3003/api/v1/tickets
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Demande de support - Problème de connexion",
  "description": "Je n'arrive plus à me connecter à mon compte depuis hier. J'ai essayé de réinitialiser mon mot de passe mais je ne reçois pas l'email.",
  "priority": "medium",
  "category": "support",
  "userId": "USER_UUID"
}
```

### Scénario 2: Demande de fonctionnalité

```http
POST http://localhost:3003/api/v1/tickets
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Demande de fonctionnalité - Export PDF des rapports",
  "description": "Il serait très utile d'avoir une fonctionnalité d'export PDF pour les rapports générés. Cela faciliterait le partage avec les clients.",
  "priority": "low",
  "category": "feature-request",
  "userId": "USER_UUID"
}
```

### Scénario 3: Bug critique

```http
POST http://localhost:3003/api/v1/tickets
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "CRITIQUE - Perte de données lors de la sauvegarde",
  "description": "URGENT : Les données des utilisateurs sont perdues lors de la sauvegarde automatique. Reproduit sur l'environnement de production. Impact : Tous les utilisateurs. Version affectée : v2.1.3",
  "priority": "urgent",
  "category": "bug",
  "userId": "USER_UUID"
}
```

---

## 6. ⚠️ TESTS DE GESTION D'ERREUR

### Test avec token invalide

```http
GET http://localhost:3003/api/v1/tickets
Authorization: Bearer invalid_token_here
```

### Test avec champs manquants

```http
POST http://localhost:3003/api/v1/tickets
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Ti"  // Trop court, doit faire entre 3 et 200 caractères
}
```

### Test avec UUID invalide

```http
GET http://localhost:3003/api/v1/tickets/invalid-uuid
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 7. 🔧 WORKFLOW COMPLET

### Étapes pour tester l'intégration complète :

1. **Démarrer les services** avec Docker Compose
2. **S'inscrire** via le Auth Service
3. **Se connecter** pour obtenir les tokens
4. **Créer un ticket** via le Ticket Service
5. **Consulter son profil** via le User Service
6. **Modifier le ticket** (statut, priorité)
7. **Consulter les statistiques** des tickets
8. **Tester les erreurs** avec des données invalides

---

## 8. 📱 VARIABLES D'ENVIRONNEMENT

Pour les tests avec Postman/Insomnia, configurez ces variables :

```
auth_url = http://localhost:3001
user_url = http://localhost:3002
ticket_url = http://localhost:3003
access_token = (sera rempli automatiquement après login)
refresh_token = (sera rempli automatiquement après login)
user_id = (sera rempli automatiquement après login)
ticket_id = (sera rempli automatiquement après création ticket)
```

---

## 9. 🚨 RÉPONSES D'ERREUR ATTENDUES

### 401 - Non autorisé

```json
{
    "success": false,
    "message": "Access denied. No token provided."
}
```

### 400 - Données invalides

```json
{
    "success": false,
    "message": "Validation error",
    "errors": [
        {
            "field": "title",
            "message": "Title must be between 3 and 200 characters"
        }
    ]
}
```

### 404 - Ressource non trouvée

```json
{
    "success": false,
    "message": "Ticket not found"
}
```

---

## 10. 🔍 VÉRIFICATIONS À EFFECTUER

✅ **Health checks** de tous les services  
✅ **Registration/Login** fonctionnel  
✅ **Token validation** opérationnel  
✅ **CRUD tickets** complet  
✅ **Intégration Auth <-> User** service  
✅ **Intégration Auth <-> Ticket** service  
✅ **Gestion des erreurs** appropriée  
✅ **Validation des données** stricte  
✅ **Pagination** des résultats  
✅ **Statistiques** des tickets
