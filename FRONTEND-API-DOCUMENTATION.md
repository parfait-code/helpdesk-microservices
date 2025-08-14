# 📖 Documentation Frontend - API Gateway Helpdesk

## 🌟 Vue d'ensemble

Cette documentation vous guide pour intégrer l'API Gateway Helpdesk dans votre application frontend. Tous vos appels API passent maintenant par **une seule URL** : `http://localhost:8080`

## 🚀 Configuration initiale

### Variables d'environnement (.env)

```env
# Point d'entrée unique
REACT_APP_API_URL=http://localhost:8080

# Configuration optionnelle
REACT_APP_API_TIMEOUT=30000
REACT_APP_ENV=development
```

### Configuration de base

```javascript
// config/api.js
export const API_CONFIG = {
    BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:8080",
    TIMEOUT: 30000,
    HEADERS: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
};

// Endpoints
export const ENDPOINTS = {
    AUTH: "/api/auth",
    USERS: "/api/users",
    TICKETS: "/api/tickets",
    FILES: "/api/files",
};
```

---

## 🔐 SERVICE D'AUTHENTIFICATION

Base URL: `http://localhost:8080/api/auth/`

### 📝 Inscription d'un utilisateur

```javascript
// POST /api/auth/register
const registerUser = async (userData) => {
  const response = await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "username": "johndoe",
      "email": "john@example.com",
      "password": "SecurePass123!",
      "confirmPassword": "SecurePass123!",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    })
  });

  const data = await response.json();
  return data;
};

// Réponse attendue:
{
  "success": true,
  "message": "Utilisateur créé avec succès",
  "user": {
    "id": "uuid-here",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "createdAt": "2025-08-14T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 🔑 Connexion

```javascript
// POST /api/auth/login
const loginUser = async (credentials) => {
  const response = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "email": "john@example.com",
      "password": "SecurePass123!"
    })
  });

  const data = await response.json();

  // Sauvegarder le token
  if (data.success) {
    localStorage.setItem('authToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  return data;
};

// Réponse attendue:
{
  "success": true,
  "message": "Connexion réussie",
  "user": {
    "id": "uuid-here",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

### 👤 Profil utilisateur connecté

```javascript
// GET /api/auth/me
const getCurrentUser = async () => {
  const token = localStorage.getItem('authToken');

  const response = await fetch('http://localhost:8080/api/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return await response.json();
};

// Réponse attendue:
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "lastLogin": "2025-08-14T10:30:00.000Z",
    "createdAt": "2025-08-14T09:00:00.000Z"
  }
}
```

### 🔄 Renouvellement de token

```javascript
// POST /api/auth/refresh
const refreshToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    const response = await fetch("http://localhost:8080/api/auth/refresh", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            refreshToken: refreshToken,
        }),
    });

    const data = await response.json();

    if (data.success) {
        localStorage.setItem("authToken", data.accessToken);
    }

    return data;
};
```

### 🚪 Déconnexion

```javascript
// POST /api/auth/logout
const logoutUser = async () => {
    const token = localStorage.getItem("authToken");

    const response = await fetch("http://localhost:8080/api/auth/logout", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    // Nettoyer le localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");

    return await response.json();
};
```

---

## 👥 SERVICE UTILISATEUR

Base URL: `http://localhost:8080/api/users/`

### 📋 Liste des utilisateurs (Admin)

```javascript
// GET /api/users/
const getUsers = async (page = 1, limit = 10) => {
  const token = localStorage.getItem('authToken');

  const response = await fetch(`http://localhost:8080/api/users/?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return await response.json();
};

// Réponse attendue:
{
  "success": true,
  "users": [
    {
      "id": "uuid-1",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true,
      "createdAt": "2025-08-14T09:00:00.000Z"
    },
    // ... autres utilisateurs
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalUsers": 47,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 👤 Détails d'un utilisateur

```javascript
// GET /api/users/{id}
const getUserById = async (userId) => {
    const token = localStorage.getItem("authToken");

    const response = await fetch(`http://localhost:8080/api/users/${userId}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    return await response.json();
};
```

### ✏️ Mise à jour du profil

```javascript
// PUT /api/users/{id}
const updateUserProfile = async (userId, updates) => {
    const token = localStorage.getItem("authToken");

    const response = await fetch(`http://localhost:8080/api/users/${userId}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            firstName: "John Updated",
            lastName: "Doe Updated",
            phone: "+1234567890",
            bio: "Développeur passionné",
        }),
    });

    return await response.json();
};
```

---

## 🎫 SERVICE DE TICKETS

Base URL: `http://localhost:8080/api/tickets/`

### 📋 Liste des tickets

```javascript
// GET /api/tickets/
const getTickets = async (filters = {}) => {
  const token = localStorage.getItem('authToken');
  const queryParams = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 10,
    status: filters.status || '',
    priority: filters.priority || '',
    assignedTo: filters.assignedTo || ''
  });

  const response = await fetch(`http://localhost:8080/api/tickets/?${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return await response.json();
};

// Réponse attendue:
{
  "success": true,
  "tickets": [
    {
      "id": "ticket-uuid-1",
      "title": "Problème de connexion",
      "description": "Impossible de se connecter à l'application",
      "status": "open",
      "priority": "high",
      "category": "technical",
      "createdBy": "user-uuid",
      "assignedTo": "agent-uuid",
      "createdAt": "2025-08-14T09:30:00.000Z",
      "updatedAt": "2025-08-14T10:15:00.000Z",
      "tags": ["connexion", "urgent"],
      "attachments": []
    }
    // ... autres tickets
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalTickets": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### ➕ Créer un ticket

```javascript
// POST /api/tickets/
const createTicket = async (ticketData) => {
  const token = localStorage.getItem('authToken');

  const response = await fetch('http://localhost:8080/api/tickets/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "title": "Nouveau problème technique",
      "description": "Description détaillée du problème rencontré par l'utilisateur...",
      "category": "technical",
      "priority": "medium",
      "tags": ["bug", "interface"],
      "metadata": {
        "browser": "Chrome 91.0",
        "os": "Windows 10",
        "url": "/dashboard"
      }
    })
  });

  return await response.json();
};

// Réponse attendue:
{
  "success": true,
  "message": "Ticket créé avec succès",
  "ticket": {
    "id": "ticket-uuid-new",
    "title": "Nouveau problème technique",
    "description": "Description détaillée...",
    "status": "open",
    "priority": "medium",
    "category": "technical",
    "ticketNumber": "#HD-2025-001",
    "createdBy": "user-uuid",
    "createdAt": "2025-08-14T11:00:00.000Z",
    "tags": ["bug", "interface"]
  }
}
```

### 📝 Détails d'un ticket

```javascript
// GET /api/tickets/{id}
const getTicketById = async (ticketId) => {
    const token = localStorage.getItem("authToken");

    const response = await fetch(
        `http://localhost:8080/api/tickets/${ticketId}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );

    return await response.json();
};
```

### ✏️ Mettre à jour un ticket

```javascript
// PUT /api/tickets/{id}
const updateTicket = async (ticketId, updates) => {
    const token = localStorage.getItem("authToken");

    const response = await fetch(
        `http://localhost:8080/api/tickets/${ticketId}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                status: "in_progress",
                priority: "high",
                assignedTo: "agent-uuid",
                resolution: "En cours d'investigation...",
                tags: ["bug", "interface", "prioritaire"],
            }),
        }
    );

    return await response.json();
};
```

### 💬 Ajouter un commentaire

```javascript
// POST /api/tickets/{id}/comments
const addTicketComment = async (ticketId, comment) => {
    const token = localStorage.getItem("authToken");

    const response = await fetch(
        `http://localhost:8080/api/tickets/${ticketId}/comments`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                content: "Voici une mise à jour sur le ticket...",
                isInternal: false,
                type: "update",
            }),
        }
    );

    return await response.json();
};
```

---

## 📁 SERVICE DE FICHIERS

Base URL: `http://localhost:8080/api/files/`

### 📤 Upload de fichier

```javascript
// POST /api/files/upload
const uploadFile = async (file, ticketId, options = {}) => {
  const token = localStorage.getItem('authToken');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('ticketId', ticketId);
  formData.append('description', options.description || '');
  formData.append('isPublic', options.isPublic || 'false');

  const response = await fetch('http://localhost:8080/api/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Ne pas définir Content-Type, le navigateur le fera automatiquement
    },
    body: formData
  });

  return await response.json();
};

// Utilisation:
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  const ticketId = 'ticket-uuid';

  try {
    const result = await uploadFile(file, ticketId, {
      description: 'Capture d\'écran du problème',
      isPublic: false
    });
    console.log('Upload réussi:', result);
  } catch (error) {
    console.error('Erreur upload:', error);
  }
};

// Réponse attendue:
{
  "success": true,
  "message": "Fichier uploadé avec succès",
  "file": {
    "id": "file-uuid",
    "filename": "screenshot.png",
    "originalName": "mon-screenshot.png",
    "size": 245760,
    "mimeType": "image/png",
    "ticketId": "ticket-uuid",
    "uploadedBy": "user-uuid",
    "uploadedAt": "2025-08-14T11:30:00.000Z",
    "url": "http://localhost:8080/api/files/file-uuid/download",
    "thumbnailUrl": "http://localhost:8080/api/files/file-uuid/thumbnail"
  }
}
```

### 📁 Fichiers d'un ticket

```javascript
// GET /api/files/ticket/{ticketId}
const getTicketFiles = async (ticketId) => {
  const token = localStorage.getItem('authToken');

  const response = await fetch(`http://localhost:8080/api/files/ticket/${ticketId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return await response.json();
};

// Réponse attendue:
{
  "success": true,
  "files": [
    {
      "id": "file-uuid-1",
      "filename": "screenshot.png",
      "originalName": "mon-screenshot.png",
      "size": 245760,
      "mimeType": "image/png",
      "description": "Capture d'écran du problème",
      "isPublic": false,
      "uploadedBy": "user-uuid",
      "uploadedAt": "2025-08-14T11:30:00.000Z",
      "downloadUrl": "http://localhost:8080/api/files/file-uuid-1/download"
    }
    // ... autres fichiers
  ],
  "totalFiles": 3,
  "totalSize": 1048576
}
```

### 📥 Télécharger un fichier

```javascript
// GET /api/files/{id}/download
const downloadFile = async (fileId) => {
    const token = localStorage.getItem("authToken");

    const response = await fetch(
        `http://localhost:8080/api/files/${fileId}/download`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
            response.headers
                .get("Content-Disposition")
                ?.split("filename=")[1] || "download";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};
```

### 🗑️ Supprimer un fichier

```javascript
// DELETE /api/files/{id}
const deleteFile = async (fileId) => {
    const token = localStorage.getItem("authToken");

    const response = await fetch(`http://localhost:8080/api/files/${fileId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    return await response.json();
};
```

---

## 🛠️ UTILITAIRES ET HELPERS

### Client API complet

```javascript
// utils/apiClient.js
class ApiClient {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_URL || "http://localhost:8080";
        this.timeout = 30000;
    }

    // Méthode générique pour les requêtes
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = localStorage.getItem("authToken");

        const config = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);

            // Gestion des erreurs HTTP
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expiré, essayer de le renouveler
                    await this.refreshToken();
                    // Retry la requête
                    return this.request(endpoint, options);
                }
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return await response.json();
            }

            return await response.text();
        } catch (error) {
            console.error("API Request Error:", error);
            throw error;
        }
    }

    // Renouvellement automatique du token
    async refreshToken() {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
            throw new Error("No refresh token available");
        }

        const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("authToken", data.accessToken);
            return data.accessToken;
        } else {
            // Refresh token invalide, rediriger vers login
            localStorage.removeItem("authToken");
            localStorage.removeItem("refreshToken");
            window.location.href = "/login";
        }
    }
}

// Instance singleton
export const apiClient = new ApiClient();
```

### Hook React personnalisé

```javascript
// hooks/useApi.js
import { useState, useEffect } from "react";
import { apiClient } from "../utils/apiClient";

export const useApi = (endpoint, options = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { autoFetch = false, dependencies = [] } = options;

    const fetchData = async (customOptions = {}) => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.request(endpoint, customOptions);
            setData(response);
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (autoFetch) {
            fetchData();
        }
    }, [autoFetch, ...dependencies]);

    return { data, loading, error, refetch: fetchData };
};

// Utilisation dans un composant:
function TicketList() {
    const {
        data: tickets,
        loading,
        error,
        refetch,
    } = useApi("/api/tickets/", {
        autoFetch: true,
    });

    if (loading) return <div>Chargement...</div>;
    if (error) return <div>Erreur: {error}</div>;

    return (
        <div>
            {tickets?.tickets?.map((ticket) => (
                <div key={ticket.id}>{ticket.title}</div>
            ))}
            <button onClick={refetch}>Actualiser</button>
        </div>
    );
}
```

### Gestion d'erreurs globale

```javascript
// utils/errorHandler.js
export const handleApiError = (error, showNotification = true) => {
    let message = "Une erreur est survenue";
    let type = "error";

    if (error.message.includes("401")) {
        message = "Session expirée, veuillez vous reconnecter";
        type = "warning";
    } else if (error.message.includes("403")) {
        message = "Accès non autorisé";
    } else if (error.message.includes("404")) {
        message = "Ressource non trouvée";
    } else if (error.message.includes("500")) {
        message = "Erreur serveur, veuillez réessayer";
    }

    if (showNotification) {
        // Intégrer avec votre système de notifications
        showToast(message, type);
    }

    return { message, type };
};
```

---

## 🎨 EXEMPLES D'UTILISATION AVANCÉE

### Upload avec progression

```javascript
const uploadFileWithProgress = async (file, ticketId, onProgress) => {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("ticketId", ticketId);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                onProgress(Math.round(percentComplete));
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
        };

        xhr.onerror = () => reject(new Error("Upload failed"));

        const token = localStorage.getItem("authToken");
        xhr.open("POST", "http://localhost:8080/api/files/upload");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
    });
};

// Utilisation:
const [uploadProgress, setUploadProgress] = useState(0);

const handleUpload = async (file, ticketId) => {
    try {
        const result = await uploadFileWithProgress(
            file,
            ticketId,
            setUploadProgress
        );
        console.log("Upload terminé:", result);
    } catch (error) {
        console.error("Erreur:", error);
    }
};
```

### Recherche avec debounce

```javascript
const useSearchTickets = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (debouncedQuery) {
            searchTickets(debouncedQuery);
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    const searchTickets = async (searchQuery) => {
        setLoading(true);
        try {
            const response = await apiClient.request(
                `/api/tickets/search?q=${encodeURIComponent(searchQuery)}`
            );
            setResults(response.tickets || []);
        } catch (error) {
            console.error("Erreur de recherche:", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return { query, setQuery, results, loading };
};
```

### Cache intelligent

```javascript
const useApiWithCache = (endpoint, cacheTime = 5 * 60 * 1000) => {
    const cacheKey = `api_cache_${endpoint}`;

    const getCachedData = () => {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < cacheTime) {
                    return data;
                }
            }
        } catch (error) {
            console.warn("Erreur lecture cache:", error);
        }
        return null;
    };

    const setCachedData = (data) => {
        try {
            localStorage.setItem(
                cacheKey,
                JSON.stringify({
                    data,
                    timestamp: Date.now(),
                })
            );
        } catch (error) {
            console.warn("Erreur sauvegarde cache:", error);
        }
    };

    const { data, loading, error, refetch } = useApi(endpoint, {
        autoFetch: true,
    });

    // Retourner données en cache pendant le chargement
    const cachedData = getCachedData();
    const effectiveData = data || cachedData;

    useEffect(() => {
        if (data) {
            setCachedData(data);
        }
    }, [data]);

    return { data: effectiveData, loading, error, refetch };
};
```

---

## 🚨 GESTION D'ERREURS COMMUNES

### Codes d'erreur HTTP

```javascript
const HTTP_STATUS = {
    400: "Requête invalide - Vérifiez les données envoyées",
    401: "Non authentifié - Token manquant ou expiré",
    403: "Accès refusé - Permissions insuffisantes",
    404: "Ressource non trouvée",
    409: "Conflit - La ressource existe déjà",
    422: "Données invalides - Erreurs de validation",
    429: "Trop de requêtes - Limite dépassée",
    500: "Erreur serveur interne",
    502: "Service temporairement indisponible",
    503: "Service en maintenance",
};
```

### Types d'erreurs métier

```javascript
// Erreurs d'authentification
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Email ou mot de passe incorrect",
  "code": "AUTH_001"
}

// Erreurs de validation
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Données invalides",
  "details": {
    "email": ["Format d'email invalide"],
    "password": ["Le mot de passe doit contenir au moins 8 caractères"]
  },
  "code": "VAL_001"
}

// Erreurs de permissions
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSIONS",
  "message": "Vous n'avez pas les permissions pour effectuer cette action",
  "requiredRole": "admin",
  "userRole": "user",
  "code": "PERM_001"
}
```

---

## 📊 MONITORING ET DEBUG

### Logs de debug

```javascript
// utils/logger.js
const logger = {
    debug: (message, data) => {
        if (process.env.NODE_ENV === "development") {
            console.log(`[DEBUG] ${message}`, data);
        }
    },
    error: (message, error) => {
        console.error(`[ERROR] ${message}`, error);
        // En production, envoyer à un service de logging
        if (process.env.NODE_ENV === "production") {
            // sendToLoggingService({ message, error, timestamp: new Date() });
        }
    },
};

// Utilisation dans apiClient:
try {
    logger.debug("API Request", { url, method: config.method });
    const response = await fetch(url, config);
    logger.debug("API Response", { status: response.status, url });
    return response;
} catch (error) {
    logger.error("API Request Failed", { url, error: error.message });
    throw error;
}
```

### Health checks frontend

```javascript
const checkApiHealth = async () => {
    const healthChecks = [
        { name: "Gateway", url: "/health" },
        { name: "Auth", url: "/api/auth/health" },
        { name: "Users", url: "/api/users/health" },
        { name: "Tickets", url: "/api/tickets/health" },
        { name: "Files", url: "/api/files/health" },
    ];

    const results = await Promise.allSettled(
        healthChecks.map(async ({ name, url }) => {
            try {
                const response = await apiClient.request(url);
                return { name, status: "healthy", response };
            } catch (error) {
                return { name, status: "unhealthy", error: error.message };
            }
        })
    );

    return results.map((result) => result.value);
};
```

---

## 🔧 CONFIGURATION AVANCÉE

### Intercepteurs de requêtes

```javascript
class ApiClient {
    constructor() {
        this.requestInterceptors = [];
        this.responseInterceptors = [];
    }

    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    async request(endpoint, options = {}) {
        // Appliquer les intercepteurs de requête
        let config = { ...options };
        for (const interceptor of this.requestInterceptors) {
            config = await interceptor(config);
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, config);

        // Appliquer les intercepteurs de réponse
        let result = response;
        for (const interceptor of this.responseInterceptors) {
            result = await interceptor(result);
        }

        return result;
    }
}

// Usage:
const apiClient = new ApiClient();

// Ajouter timestamp à toutes les requêtes
apiClient.addRequestInterceptor(async (config) => {
    config.headers = {
        ...config.headers,
        "X-Request-Time": new Date().toISOString(),
    };
    return config;
});

// Logger toutes les réponses
apiClient.addResponseInterceptor(async (response) => {
    console.log(`Response ${response.status} from ${response.url}`);
    return response;
});
```

---

## 🎯 BONNES PRATIQUES

### ✅ À faire

1. **Toujours gérer les erreurs**
2. **Utiliser des loading states**
3. **Implémenter le retry automatique**
4. **Valider les données côté frontend**
5. **Utiliser des timeouts appropriés**
6. **Mettre en cache les données fréquemment utilisées**
7. **Implémenter la pagination**
8. **Utiliser des types TypeScript**

### ❌ À éviter

1. **Ne pas stocker de données sensibles en localStorage**
2. **Ne pas faire de requêtes sans authentification**
3. **Ne pas ignorer les codes d'erreur HTTP**
4. **Ne pas faire de requêtes en boucle sans debounce**
5. **Ne pas oublier de nettoyer les ressources**

---

## 📞 SUPPORT

### URLs importantes

-   **API Gateway** : http://localhost:8080
-   **Health Check** : http://localhost:8080/health
-   **Test Interface** : `test-api-gateway.html`

### Commandes de debug

```bash
# Vérifier les services
docker-compose -f docker-compose.services.yml ps

# Logs nginx
docker logs helpdesk-nginx-gateway

# Redémarrer l'API Gateway
docker restart helpdesk-nginx-gateway
```

---

Cette documentation couvre tous les aspects de l'utilisation de votre API Gateway côté frontend. N'hésitez pas à l'adapter selon vos besoins spécifiques ! 🚀
