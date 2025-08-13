# 🔧 Guide de Déploiement - Helpdesk Microservices

Ce guide détaille les étapes de déploiement du système helpdesk microservices dans différents environnements.

## 📋 Table des Matières

- [Prérequis](#-prérequis)
- [Déploiement Local](#-déploiement-local)
- [Déploiement de Développement](#-déploiement-de-développement)
- [Déploiement de Production](#-déploiement-de-production)
- [Configuration des Variables](#-configuration-des-variables)
- [Monitoring et Logs](#-monitoring-et-logs)
- [Sauvegarde et Restauration](#-sauvegarde-et-restauration)
- [Dépannage](#-dépannage)

## 📦 Prérequis

### Environnement de Base
- **Docker** : Version 20.10+
- **Docker Compose** : Version 2.0+
- **Git** : Pour cloner le repository
- **PowerShell** ou **Bash** : Pour les scripts de déploiement

### Ressources Système Recommandées

#### Développement
- **CPU** : 4 cores minimum
- **RAM** : 8GB minimum
- **Disque** : 20GB d'espace libre
- **Réseau** : Connexion internet stable

#### Production
- **CPU** : 8 cores minimum
- **RAM** : 16GB minimum
- **Disque** : 100GB+ d'espace libre
- **Réseau** : Bande passante élevée

## 🏠 Déploiement Local

### Installation Rapide

```bash
# 1. Cloner le repository
git clone https://github.com/parfait-code/helpdesk-microservices.git
cd helpdesk-microservices

# 2. Lancer tous les services
docker-compose -f docker-compose.services.yml up -d

# 3. Vérifier le déploiement
./test-services.ps1
```

### Vérification du Déploiement

```bash
# Vérifier l'état des conteneurs
docker-compose -f docker-compose.services.yml ps

# Vérifier les logs
docker-compose -f docker-compose.services.yml logs

# Tester les endpoints
curl http://localhost:3001/api/v1/health  # Auth Service
curl http://localhost:3002/api/v1/health  # User Service  
curl http://localhost:3003/api/v1/health  # Ticket Service
```

## 🔧 Déploiement de Développement

### Configuration de l'Environnement de Dev

```bash
# 1. Créer les fichiers .env pour chaque service
cp services/auth-service/.env.example services/auth-service/.env
cp services/user-service/.env.example services/user-service/.env
cp services/ticket-service/.env.example services/ticket-service/.env

# 2. Personnaliser les configurations
# Éditer chaque fichier .env selon vos besoins

# 3. Démarrer en mode développement
docker-compose -f docker-compose.dev.yml up -d
```

### Mode Développement avec Hot Reload

```bash
# Installer les dépendances localement
cd services/auth-service && npm install && cd ../..
cd services/user-service && npm install && cd ../..
cd services/ticket-service && npm install && cd ../..

# Démarrer les bases de données uniquement
docker-compose -f docker-compose.services.yml up -d auth-db user-db ticket-db auth-redis user-redis ticket-redis

# Démarrer les services en mode développement
cd services/auth-service && npm run dev &
cd services/user-service && npm run dev &
cd services/ticket-service && npm run dev &
```

## 🚀 Déploiement de Production

### 1. Préparation de l'Environnement

```bash
# Créer les fichiers de configuration de production
cp docker-compose.services.yml docker-compose.prod.yml

# Créer les fichiers .env.prod
touch .env.prod
```

### 2. Configuration des Variables de Production

#### .env.prod
```env
# Environnement
NODE_ENV=production

# Sécurité JWT
JWT_SECRET=your-super-secure-jwt-secret-key-here-256-bits
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Bases de données (remplacer par vos URLs sécurisées)
AUTH_DATABASE_URL=postgresql://auth_user:secure_password@db-host:5432/auth_prod_db
USER_DATABASE_URL=postgresql://user_user:secure_password@db-host:5432/user_prod_db
TICKET_DATABASE_URL=postgresql://ticket_user:secure_password@db-host:5432/ticket_prod_db

# Redis (remplacer par vos URLs sécurisées)
AUTH_REDIS_URL=redis://:secure_redis_password@redis-host:6379/0
USER_REDIS_URL=redis://:secure_redis_password@redis-host:6379/1
TICKET_REDIS_URL=redis://:secure_redis_password@redis-host:6379/2

# CORS et sécurité
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logs
LOG_LEVEL=warn
LOG_FORMAT=json

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 3. Build et Déploiement

```bash
# Build des images de production
docker-compose -f docker-compose.prod.yml build --no-cache

# Test en mode staging
docker-compose -f docker-compose.prod.yml up -d

# Vérifier la santé des services
./test-services.sh

# Si tout fonctionne, déployer en production
docker-compose -f docker-compose.prod.yml up -d --scale auth-service=2 --scale user-service=2 --scale ticket-service=2
```

### 4. Configuration du Load Balancer (Nginx)

#### nginx.conf
```nginx
upstream auth_backend {
    server localhost:3001;
    server localhost:3011;  # Instance 2
}

upstream user_backend {
    server localhost:3002;
    server localhost:3012;  # Instance 2
}

upstream ticket_backend {
    server localhost:3003;
    server localhost:3013;  # Instance 2
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Auth Service
    location /api/v1/auth {
        proxy_pass http://auth_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # User Service
    location /api/v1/users {
        proxy_pass http://user_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Ticket Service
    location /api/v1/tickets {
        proxy_pass http://ticket_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔐 Configuration des Variables

### Variables par Service

#### Auth Service
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://auth:password@auth-db:5432/auth_db
REDIS_URL=redis://:password@auth-redis:6379
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://yourdomain.com
```

#### User Service
```env
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://user:password@user-db:5432/user_db
REDIS_URL=redis://:password@user-redis:6379
AUTH_SERVICE_URL=http://auth-service:3001
FILE_SERVICE_URL=http://file-service:3004
UPLOAD_MAX_SIZE=5242880
CORS_ORIGIN=https://yourdomain.com
```

#### Ticket Service
```env
NODE_ENV=production
PORT=3003
DATABASE_URL=postgresql://ticket:password@ticket-db:5432/ticket_db
REDIS_URL=redis://:password@ticket-redis:6379
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
FILE_SERVICE_URL=http://file-service:3004
NOTIFICATION_SERVICE_URL=http://notification-service:3005
```

### Sécurité des Secrets

#### Utilisation de Docker Secrets

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  auth-service:
    image: helpdesk/auth-service:latest
    secrets:
      - jwt_secret
      - db_password
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      DATABASE_PASSWORD_FILE: /run/secrets/db_password

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt
```

## 📊 Monitoring et Logs

### Configuration des Logs

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  auth-service:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    labels:
      - "com.datadoghq.ad.logs=[{\"source\":\"nodejs\",\"service\":\"auth-service\"}]"
```

### Prometheus et Grafana

```yaml
# monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

### Health Checks Avancés

```yaml
services:
  auth-service:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 💾 Sauvegarde et Restauration

### Sauvegarde des Bases de Données

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Créer le répertoire de sauvegarde
mkdir -p $BACKUP_DIR

# Sauvegarde Auth DB
docker exec helpdesk-auth-db pg_dump -U user auth_db > $BACKUP_DIR/auth_db_$DATE.sql

# Sauvegarde User DB
docker exec helpdesk-user-db pg_dump -U user user_db > $BACKUP_DIR/user_db_$DATE.sql

# Sauvegarde Ticket DB
docker exec helpdesk-ticket-db pg_dump -U ticket ticket_db > $BACKUP_DIR/ticket_db_$DATE.sql

# Compression des sauvegardes
tar -czf $BACKUP_DIR/helpdesk_backup_$DATE.tar.gz $BACKUP_DIR/*_$DATE.sql

# Nettoyage des fichiers temporaires
rm $BACKUP_DIR/*_$DATE.sql

echo "Sauvegarde terminée: helpdesk_backup_$DATE.tar.gz"
```

### Restauration

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
BACKUP_DIR="/tmp/restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

# Extraction de la sauvegarde
mkdir -p $BACKUP_DIR
tar -xzf $BACKUP_FILE -C $BACKUP_DIR

# Restauration Auth DB
docker exec -i helpdesk-auth-db psql -U user auth_db < $BACKUP_DIR/auth_db.sql

# Restauration User DB
docker exec -i helpdesk-user-db psql -U user user_db < $BACKUP_DIR/user_db.sql

# Restauration Ticket DB
docker exec -i helpdesk-ticket-db psql -U ticket ticket_db < $BACKUP_DIR/ticket_db.sql

# Nettoyage
rm -rf $BACKUP_DIR

echo "Restauration terminée"
```

### Automatisation des Sauvegardes

```bash
# Ajouter au crontab
crontab -e

# Sauvegarde quotidienne à 2h du matin
0 2 * * * /path/to/backup.sh

# Sauvegarde hebdomadaire avec rotation
0 3 * * 0 /path/to/weekly-backup.sh
```

## 🔍 Dépannage

### Commandes de Diagnostic

```bash
# État des services
docker-compose -f docker-compose.services.yml ps

# Logs en temps réel
docker-compose -f docker-compose.services.yml logs -f service-name

# Utilisation des ressources
docker stats

# Inspection d'un conteneur
docker inspect helpdesk-auth-service

# Entrer dans un conteneur
docker exec -it helpdesk-auth-service /bin/sh
```

### Problèmes Fréquents

#### 1. Services qui ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs auth-service

# Vérifier la configuration
docker-compose config

# Redémarrer les services
docker-compose restart
```

#### 2. Problèmes de connectivité

```bash
# Vérifier les réseaux Docker
docker network ls
docker network inspect helpdesk-network

# Test de connectivité
docker exec helpdesk-auth-service ping helpdesk-auth-db
```

#### 3. Problèmes de performance

```bash
# Monitoring des ressources
docker stats --no-stream

# Vérifier les logs d'erreur
docker-compose logs | grep ERROR

# Analyser les métriques
curl http://localhost:9090/metrics
```

## 📈 Optimisations de Production

### Configuration Nginx Optimisée

```nginx
worker_processes auto;
worker_cpu_affinity auto;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### Configuration Docker Optimisée

```yaml
services:
  auth-service:
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

---

Ce guide de déploiement complet vous permet de déployer le système helpdesk microservices dans tous les environnements, du développement local à la production haute disponibilité.
