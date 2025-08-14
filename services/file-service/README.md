# File Service - Service de Gestion de Fichiers

Le File Service est un microservice dédié à la gestion des fichiers dans l'architecture Helpdesk. Il gère l'upload, le stockage, la récupération et la gestion des fichiers associés aux tickets.

## 🚀 Fonctionnalités

-   **Upload de fichiers** : Single et multiple file upload avec validation
-   **Stockage sécurisé** : Utilisation de MinIO S3-compatible pour le stockage
-   **Optimisation d'images** : Redimensionnement et compression automatique
-   **Prévisualisation** : Génération de previews pour les images
-   **Contrôle d'accès** : Gestion des permissions par utilisateur et rôle
-   **Intégration tickets** : Association automatique avec les tickets
-   **API REST** : Interface complète pour toutes les opérations

## 🛠 Technologies

-   **Runtime** : Node.js 18+
-   **Framework** : Express.js
-   **Base de données** : PostgreSQL
-   **Stockage** : MinIO (S3-compatible)
-   **Cache** : Redis
-   **Traitement d'images** : Sharp
-   **Authentication** : JWT
-   **Containerisation** : Docker

## 📋 Prérequis

-   Node.js 18+
-   PostgreSQL 15+
-   Redis 7+
-   MinIO ou S3-compatible storage

## 🔧 Installation

### 1. Cloner et installer les dépendances

```bash
cd services/file-service
npm install
```

### 2. Configuration

Copier le fichier d'exemple de configuration :

```bash
cp .env.example .env
```

Modifier les variables d'environnement dans `.env` :

```env
# Configuration du serveur
NODE_ENV=development
PORT=3004

# Base de données
DATABASE_URL=postgresql://file:filepass@localhost:5404/file_db

# Redis
REDIS_URL=redis://:redispass@localhost:6304

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_BUCKET_NAME=helpdesk-files

# Limites d'upload
MAX_FILE_SIZE=10485760
MAX_FILES_PER_TICKET=10
```

### 3. Base de données

La base de données est automatiquement créée au démarrage du service.

## 🐳 Docker

### Démarrage avec Docker Compose (standalone)

```bash
# Démarrer tous les services (PostgreSQL, Redis, MinIO, File Service)
docker-compose up -d

# Vérifier le statut
docker-compose ps

# Voir les logs
docker-compose logs -f file-service

# Arrêter
docker-compose down
```

### Intégration dans le système global

Le service est automatiquement inclus dans le `docker-compose.services.yml` principal.

## 🌐 API Endpoints

### Health & Info

-   `GET /api/v1/health` - Status du service
-   `GET /api/v1/info` - Informations du service
-   `GET /api/v1/ready` - Readiness probe
-   `GET /api/v1/live` - Liveness probe

### Upload de fichiers

-   `POST /api/v1/files/upload` - Upload d'un fichier
-   `POST /api/v1/files/upload/multiple` - Upload de plusieurs fichiers

### Gestion des fichiers

-   `GET /api/v1/files/:id` - Informations d'un fichier
-   `GET /api/v1/files/:id/download` - Télécharger un fichier
-   `GET /api/v1/files/:id/preview` - Prévisualisation (images)
-   `PUT /api/v1/files/:id` - Mettre à jour un fichier
-   `DELETE /api/v1/files/:id` - Supprimer un fichier

### Recherche et statistiques

-   `GET /api/v1/files/search` - Rechercher des fichiers
-   `GET /api/v1/files/stats` - Statistiques
-   `GET /api/v1/files/ticket/:ticketId` - Fichiers d'un ticket

## 📝 Utilisation

### Upload d'un fichier

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("ticket_id", "uuid-ticket");
formData.append("description", "Description du fichier");
formData.append("is_public", "false");

fetch("/api/v1/files/upload", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
    },
    body: formData,
});
```

### Téléchargement

```javascript
fetch(`/api/v1/files/${fileId}/download`, {
    headers: {
        Authorization: `Bearer ${token}`,
    },
})
    .then((response) => response.blob())
    .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
    });
```

## 🔐 Sécurité

### Authentification

Toutes les routes nécessitent une authentification JWT sauf :

-   Health checks
-   Téléchargement de fichiers publics
-   Preview de fichiers publics

### Permissions

-   **admin/super_admin** : Accès total
-   **support** : Lecture, upload, modification
-   **user** : Lecture et upload de ses propres fichiers

### Validation des fichiers

-   Types MIME autorisés configurables
-   Taille maximum configurable
-   Nombres de fichiers par ticket limité
-   Validation des noms de fichiers
-   Scan antimalware (à implémenter)

## 📊 Monitoring

### Health Checks

Le service expose plusieurs endpoints de monitoring :

-   `/api/v1/health` - Status complet avec vérifications
-   `/api/v1/ready` - Prêt à recevoir du trafic
-   `/api/v1/live` - Service vivant

### Logs

Les logs sont structurés en JSON et incluent :

-   Requêtes HTTP
-   Opérations sur les fichiers
-   Erreurs et warnings
-   Métriques de performance

### Métriques

-   Nombre d'uploads par période
-   Taille totale des fichiers
-   Temps de réponse
-   Erreurs par type

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration

# Coverage
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

## 🔧 Développement

### Démarrage en mode développement

```bash
npm run dev
```

### Structure du projet

```
src/
├── app.js              # Application Express
├── database.js         # Configuration base de données
├── config/
│   └── index.js        # Configuration centralisée
├── controllers/
│   └── fileController.js # Logique métier
├── middleware/
│   ├── auth.js         # Authentification
│   └── upload.js       # Gestion des uploads
├── models/
│   └── File.js         # Modèle de données
├── routes/
│   ├── index.js        # Routes principales
│   ├── files.js        # Routes des fichiers
│   └── health.js       # Routes de santé
├── services/
│   └── minioService.js # Service MinIO
└── utils/
    ├── logger.js       # Système de logs
    └── validator.js    # Validation
```

## 🚀 Déploiement

### Variables d'environnement de production

```env
NODE_ENV=production
PORT=3004
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
MINIO_ENDPOINT=...
JWT_SECRET=...
LOG_LEVEL=warn
```

### Commandes Docker

```bash
# Build
docker build -t file-service .

# Run
docker run -d --name file-service -p 3004:3004 file-service
```

## 🔗 Intégrations

### Avec Ticket Service

-   Notification d'upload de fichiers
-   Vérification d'existence des tickets
-   Association automatique

### Avec Auth Service

-   Validation des tokens JWT
-   Vérification des permissions
-   Informations utilisateur

## 📚 Configuration avancée

### Limites et quotas

```env
MAX_FILE_SIZE=10485760        # 10MB
MAX_FILES_PER_TICKET=10       # 10 fichiers max
ALLOWED_MIME_TYPES=image/jpeg,image/png,application/pdf
```

### Performance

```env
RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100   # 100 requêtes max
```

### Storage

```env
MINIO_BUCKET_NAME=helpdesk-files
MINIO_USE_SSL=false
```

## ❗ Dépannage

### Problèmes courants

1. **MinIO non accessible**

    - Vérifier la configuration MINIO_ENDPOINT
    - S'assurer que MinIO est démarré

2. **Base de données inaccessible**

    - Vérifier DATABASE_URL
    - S'assurer que PostgreSQL est démarré

3. **Erreurs d'upload**
    - Vérifier les limites de taille
    - Contrôler les types MIME autorisés

### Debug

```bash
# Activer les logs debug
LOG_LEVEL=debug npm run dev

# Vérifier la santé du service
curl http://localhost:3004/api/v1/health
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajouter nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence ISC.

## 📞 Support

Pour toute question ou problème :

-   Créer une issue sur GitHub
-   Consulter les logs du service
-   Vérifier la documentation des APIs

---

**Version** : 1.0.0  
**Dernière mise à jour** : Août 2025
