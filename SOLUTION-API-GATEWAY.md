# 🎯 Solution API Gateway - Point d'entrée unique pour vos microservices

## ✅ Problème résolu

Vous souhaitiez accéder à tous vos microservices depuis le frontend avec **un seul baseURL**. C'est maintenant fait !

## 🌟 Solution implémentée

### Avant (Multiple URLs)

```javascript
// ❌ Problématique : Multiple points d'accès
const AUTH_URL = "http://localhost:3001";
const USER_URL = "http://localhost:3002";
const TICKET_URL = "http://localhost:3003";
const FILE_URL = "http://localhost:3004";
```

### Après (URL unique)

```javascript
// ✅ Solution : Point d'entrée unique
const BASE_URL = "http://localhost:8080";
```

## 🏗️ Architecture déployée

```
Frontend (React/Vue/Angular)
    ↓ Une seule URL
http://localhost:8080
    ↓ Nginx Reverse Proxy
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Auth Service   │  User Service   │ Ticket Service  │  File Service   │
│  (port 3001)    │  (port 3002)    │  (port 3003)    │  (port 3004)    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## 🚀 Services en cours d'exécution

| Service            | URL Frontend                         | Service Interne       | Status |
| ------------------ | ------------------------------------ | --------------------- | ------ |
| **API Gateway**    | `http://localhost:8080`              | `nginx:80`            | ✅     |
| **Auth Service**   | `http://localhost:8080/api/auth/`    | `auth-service:3001`   | ✅     |
| **User Service**   | `http://localhost:8080/api/users/`   | `user-service:3002`   | ✅     |
| **Ticket Service** | `http://localhost:8080/api/tickets/` | `ticket-service:3003` | ✅     |
| **File Service**   | `http://localhost:8080/api/files/`   | `file-service:3004`   | ✅     |

## 📁 Fichiers créés/modifiés

### 🆕 Nouveaux fichiers

-   `nginx/nginx.conf` - Configuration du reverse proxy
-   `nginx/README.md` - Documentation complète
-   `frontend-example/api-client.js` - Client API pour le frontend
-   `frontend-example/useApi.js` - Hooks React personnalisés
-   `frontend-example/.env` - Variables d'environnement
-   `manage-services.ps1` - Script de gestion des services
-   `test-api-gateway.html` - Interface de test

### ✏️ Fichiers modifiés

-   `docker-compose.services.yml` - Ajout du service nginx-gateway

## 🎮 Commandes utiles

### Démarrer tous les services

```bash
docker-compose -f docker-compose.services.yml up -d
```

### Vérifier l'état

```bash
docker-compose -f docker-compose.services.yml ps
```

### Tester l'API Gateway

```bash
# Test dans le navigateur
start http://localhost:8080

# Test avec PowerShell
Invoke-RestMethod -Uri "http://localhost:8080/health"
```

### Gérer les services

```powershell
.\manage-services.ps1 start    # Démarrer
.\manage-services.ps1 stop     # Arrêter
.\manage-services.ps1 status   # État
.\manage-services.ps1 health   # Test complet
```

## 💻 Configuration Frontend

### Variables d'environnement (.env)

```env
REACT_APP_API_URL=http://localhost:8080
```

### Exemple d'utilisation

```javascript
import apiClient from "./api-client.js";

// Toutes les requêtes passent par la même URL
const login = await apiClient.login({ email, password });
const users = await apiClient.getUsers();
const tickets = await apiClient.getTickets();
const fileUpload = await apiClient.uploadFile(ticketId, file);
```

### Hooks React

```javascript
import { useAuth, useTickets, useFileUpload } from "./useApi.js";

function MyComponent() {
    const { login, user, isAuthenticated } = useAuth();
    const { tickets, loading, createTicket } = useTickets();
    const { uploadFile, uploading, progress } = useFileUpload();

    // Votre logique frontend...
}
```

## 🔍 Endpoints disponibles

| Endpoint                     | Description              | Service cible  |
| ---------------------------- | ------------------------ | -------------- |
| `GET /`                      | Informations API Gateway | nginx          |
| `GET /health`                | Santé du Gateway         | nginx          |
| `POST /api/auth/login`       | Connexion                | auth-service   |
| `GET /api/auth/me`           | Profil utilisateur       | auth-service   |
| `GET /api/users/`            | Liste utilisateurs       | user-service   |
| `POST /api/users/`           | Créer utilisateur        | user-service   |
| `GET /api/tickets/`          | Liste tickets            | ticket-service |
| `POST /api/tickets/`         | Créer ticket             | ticket-service |
| `POST /api/files/upload`     | Upload fichier           | file-service   |
| `GET /api/files/ticket/{id}` | Fichiers d'un ticket     | file-service   |

## 🛡️ Avantages obtenus

### 🔒 Sécurité

-   ✅ Point d'entrée unique plus facile à sécuriser
-   ✅ Configuration CORS centralisée
-   ✅ Rate limiting global
-   ✅ Logs centralisés

### 🌐 Résolution CORS

-   ✅ Fini les problèmes de cross-origin
-   ✅ Configuration centralisée dans Nginx
-   ✅ Headers CORS automatiques

### 📈 Scalabilité

-   ✅ Load balancing possible pour chaque service
-   ✅ Cache centralisé (configurable)
-   ✅ Monitoring centralisé

### 🔧 Maintenance

-   ✅ Configuration centralisée
-   ✅ Déploiement simplifié
-   ✅ Une seule URL à gérer

### 💻 Développement

-   ✅ Configuration frontend simplifiée
-   ✅ Pas de gestion de multiples ports
-   ✅ Environment variables unifiées

## 🧪 Tester la solution

### Interface de test

Ouvrez le fichier `test-api-gateway.html` dans votre navigateur pour tester tous les services.

### Tests manuels

```bash
# Gateway info
curl http://localhost:8080/

# Health check
curl http://localhost:8080/health

# Test des services
curl http://localhost:8080/api/auth/health
curl http://localhost:8080/api/users/health
curl http://localhost:8080/api/tickets/health
curl http://localhost:8080/api/files/health
```

## 🚀 Prochaines étapes

1. **Intégrer dans votre frontend** : Utilisez les fichiers d'exemple fournis
2. **Tester complètement** : Vérifiez tous vos endpoints existants
3. **Configuration production** : Ajoutez HTTPS et nom de domaine
4. **Monitoring** : Ajoutez des outils de surveillance si nécessaire

## 🆘 Support

-   **Logs Nginx** : `docker logs helpdesk-nginx-gateway`
-   **Interface de test** : `test-api-gateway.html`
-   **Documentation** : `nginx/README.md`
-   **Script de gestion** : `.\manage-services.ps1 health`

---

## ✨ Résultat final

Votre frontend peut maintenant utiliser **une seule URL** (`http://localhost:8080`) pour accéder à tous vos microservices ! 🎉

La solution est **opérationnelle** et **testée** ✅
