# 🔧 Guide de Dépannage - Helpdesk Microservices

Guide complet de dépannage pour résoudre les problèmes courants du système helpdesk microservices.

## 📋 Table des Matières

-   [Diagnostic Rapide](#-diagnostic-rapide)
-   [Problèmes de Démarrage](#-problèmes-de-démarrage)
-   [Problèmes de Base de Données](#-problèmes-de-base-de-données)
-   [Problèmes de Connexion Redis](#-problèmes-de-connexion-redis)
-   [Erreurs d'Authentification](#-erreurs-dauthentification)
-   [Problèmes de Performance](#-problèmes-de-performance)
-   [Erreurs de Réseau](#-erreurs-de-réseau)
-   [Logs et Monitoring](#-logs-et-monitoring)
-   [Récupération de Données](#-récupération-de-données)
-   [FAQ](#-faq)

## 🔍 Diagnostic Rapide

### Commandes de Diagnostic de Base

```bash
# Vérifier l'état de tous les services
docker-compose -f docker-compose.services.yml ps

# Vérifier la santé des services
curl http://localhost:3001/api/v1/health  # Auth
curl http://localhost:3002/api/v1/health  # User
curl http://localhost:3003/api/v1/health  # Ticket

# Vérifier les logs
docker-compose -f docker-compose.services.yml logs --tail=50

# Vérifier l'utilisation des ressources
docker stats --no-stream
```

### Script de Diagnostic Automatisé

```powershell
# diagnose.ps1
Write-Host "🔍 Diagnostic System Helpdesk Microservices" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Vérification Docker
Write-Host "`n📦 Checking Docker..." -ForegroundColor Yellow
$dockerVersion = docker --version
if ($dockerVersion) {
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Docker not found or not running" -ForegroundColor Red
    exit 1
}

# Vérification des conteneurs
Write-Host "`n🐳 Checking containers..." -ForegroundColor Yellow
$containers = docker-compose -f docker-compose.services.yml ps --format "table {{.Name}}\t{{.Status}}"
Write-Host $containers

# Vérification des ports
Write-Host "`n🔌 Checking ports..." -ForegroundColor Yellow
$ports = @(3001, 3002, 3003, 5401, 5402, 5403, 6301, 6302, 6303)
foreach ($port in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "✅ Port $port is open" -ForegroundColor Green
        } else {
            Write-Host "❌ Port $port is closed" -ForegroundColor Red
        }
    } catch {
        Write-Host "⚠️ Cannot test port $port" -ForegroundColor Yellow
    }
}

# Vérification de l'espace disque
Write-Host "`n💾 Checking disk space..." -ForegroundColor Yellow
$diskSpace = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3" |
             Select-Object DeviceID, @{Name="FreeSpace(GB)";Expression={[math]::Round($_.FreeSpace/1GB,2)}}
$diskSpace | ForEach-Object {
    if ($_."{FreeSpace(GB)}" -lt 5) {
        Write-Host "⚠️ Low disk space on $($_.DeviceID): $($_."{FreeSpace(GB)}")GB" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Disk space OK on $($_.DeviceID): $($_."{FreeSpace(GB)}")GB" -ForegroundColor Green
    }
}

# Test de connectivité des services
Write-Host "`n🌐 Testing service connectivity..." -ForegroundColor Yellow
$services = @(
    @{Name="Auth"; URL="http://localhost:3001/api/v1/health"},
    @{Name="User"; URL="http://localhost:3002/api/v1/health"},
    @{Name="Ticket"; URL="http://localhost:3003/api/v1/health"}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.URL -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $($service.Name) service is healthy" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $($service.Name) service returned status $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ $($service.Name) service is not responding" -ForegroundColor Red
    }
}
```

## 🚀 Problèmes de Démarrage

### Les services ne démarrent pas

**Symptôme :** Les conteneurs s'arrêtent immédiatement après le démarrage.

**Solutions :**

```bash
# 1. Vérifier les logs détaillés
docker-compose -f docker-compose.services.yml logs service-name

# 2. Vérifier la configuration
docker-compose -f docker-compose.services.yml config

# 3. Nettoyer les volumes corrompus
docker-compose -f docker-compose.services.yml down -v
docker system prune -f
docker volume prune -f

# 4. Redémarrer avec reconstruction
docker-compose -f docker-compose.services.yml up -d --build --force-recreate
```

### Erreur "Port already in use"

**Symptôme :** `Error: listen EADDRINUSE :::3001`

**Solutions :**

```bash
# Trouver le processus utilisant le port
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Linux/Mac

# Tuer le processus
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                # Linux/Mac

# Ou changer le port dans docker-compose.yml
ports:
  - "3011:3001"  # Utiliser un port différent
```

### Services en boucle de redémarrage

**Symptôme :** Les services redémarrent continuellement.

**Diagnostic :**

```bash
# Vérifier l'état des services
docker-compose -f docker-compose.services.yml ps

# Vérifier les health checks
docker inspect helpdesk-auth-service | grep -A 5 '"Health"'

# Désactiver temporairement le health check
# Dans docker-compose.yml:
healthcheck:
  disable: true
```

## 🗄️ Problèmes de Base de Données

### Connexion à la base de données échoue

**Symptôme :** `Error: connect ECONNREFUSED` ou `FATAL: password authentication failed`

**Solutions :**

```bash
# 1. Vérifier que les bases de données sont démarrées
docker-compose -f docker-compose.services.yml logs auth-db
docker-compose -f docker-compose.services.yml logs user-db
docker-compose -f docker-compose.services.yml logs ticket-db

# 2. Tester la connexion directement
docker exec -it helpdesk-auth-db psql -U user -d auth_db -c "SELECT 1;"

# 3. Vérifier les variables d'environnement
docker exec helpdesk-auth-service env | grep DATABASE

# 4. Recréer les volumes de base de données
docker-compose -f docker-compose.services.yml down -v
docker-compose -f docker-compose.services.yml up -d auth-db user-db ticket-db
# Attendre que les bases soient prêtes avant de démarrer les services
```

### Migration de base de données échoue

**Symptôme :** Tables manquantes ou structure incorrecte.

**Solutions :**

```bash
# 1. Vérifier les migrations
docker exec -it helpdesk-auth-db psql -U user -d auth_db -c "\dt"

# 2. Exécuter manuellement les migrations
docker exec -it helpdesk-auth-db psql -U user -d auth_db -f /docker-entrypoint-initdb.d/init.sql

# 3. Réinitialiser complètement la base
docker-compose -f docker-compose.services.yml stop auth-service
docker volume rm helpdesk-microservices_auth-db-data
docker-compose -f docker-compose.services.yml up -d auth-db
# Attendre l'initialisation, puis démarrer le service
docker-compose -f docker-compose.services.yml up -d auth-service
```

### Performance lente de la base de données

**Diagnostic :**

```sql
-- Se connecter à la base
docker exec -it helpdesk-ticket-db psql -U ticket -d ticket_db

-- Vérifier les requêtes lentes
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Vérifier les index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tickets';

-- Vérifier les statistiques des tables
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables;
```

## 🔴 Problèmes de Connexion Redis

### Redis non accessible

**Symptôme :** `Error: connect ECONNREFUSED` sur les ports Redis.

**Solutions :**

```bash
# 1. Vérifier l'état de Redis
docker-compose -f docker-compose.services.yml logs auth-redis

# 2. Tester la connexion
docker exec -it helpdesk-auth-redis redis-cli ping

# 3. Vérifier l'authentification
docker exec -it helpdesk-auth-redis redis-cli -a redispass ping

# 4. Nettoyer le cache Redis
docker exec -it helpdesk-auth-redis redis-cli -a redispass FLUSHALL
```

### Cache Redis corrompu

**Symptômes :** Données incohérentes, erreurs de désérialisation.

**Solutions :**

```bash
# Nettoyer sélectivement les clés
docker exec -it helpdesk-auth-redis redis-cli -a redispass KEYS "auth-service:*"
docker exec -it helpdesk-auth-redis redis-cli -a redispass DEL "auth-service:corrupted-key"

# Ou nettoyer complètement
docker exec -it helpdesk-auth-redis redis-cli -a redispass FLUSHDB
```

## 🔐 Erreurs d'Authentification

### Token JWT invalide

**Symptôme :** `401 Unauthorized` ou `Token verification failed`

**Solutions :**

```bash
# 1. Vérifier la configuration JWT
docker exec helpdesk-auth-service env | grep JWT

# 2. Vérifier les logs du service auth
docker-compose -f docker-compose.services.yml logs auth-service | grep -i jwt

# 3. Tester l'endpoint de vérification
curl -X POST http://localhost:3001/api/v1/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# 4. Nettoyer les tokens en cache
docker exec -it helpdesk-auth-redis redis-cli -a redispass DEL "auth-service:tokens:*"
```

### Refresh Token expiré

**Solutions :**

```bash
# Vérifier la configuration des refresh tokens
docker exec helpdesk-auth-service node -e "
console.log('Refresh token expiry:', process.env.REFRESH_TOKEN_EXPIRES_IN);
"

# Nettoyer les refresh tokens expirés
docker exec -it helpdesk-auth-db psql -U user -d auth_db -c "
DELETE FROM refresh_tokens WHERE expires_at < NOW();
"
```

## ⚡ Problèmes de Performance

### Réponses lentes

**Diagnostic :**

```bash
# 1. Vérifier l'utilisation des ressources
docker stats --no-stream

# 2. Analyser les logs de performance
docker-compose -f docker-compose.services.yml logs | grep -E "(slow|timeout|performance)"

# 3. Tester les endpoints avec temps de réponse
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3001/api/v1/health"

# Contenu de curl-format.txt:
#     time_namelookup:  %{time_namelookup}s\n
#        time_connect:  %{time_connect}s\n
#     time_appconnect:  %{time_appconnect}s\n
#    time_pretransfer:  %{time_pretransfer}s\n
#       time_redirect:  %{time_redirect}s\n
#  time_starttransfer:  %{time_starttransfer}s\n
#                     ----------\n
#          time_total:  %{time_total}s\n
```

**Solutions :**

```bash
# Augmenter les ressources allouées
# Dans docker-compose.yml:
services:
  auth-service:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

# Optimiser les connexions à la base
# Dans le code, ajuster les pools de connexions:
pool: {
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000
}
```

### Fuite mémoire

**Diagnostic :**

```bash
# Surveiller l'utilisation mémoire
watch docker stats --no-stream

# Analyser les heap dumps (Node.js)
docker exec helpdesk-auth-service node --max-old-space-size=512 --inspect=0.0.0.0:9229 src/app.js
```

## 🌐 Erreurs de Réseau

### Services ne peuvent pas se communiquer

**Symptôme :** `ENOTFOUND` ou timeout entre services.

**Solutions :**

```bash
# 1. Vérifier les réseaux Docker
docker network ls
docker network inspect helpdesk-network

# 2. Tester la connectivité entre conteneurs
docker exec helpdesk-auth-service ping helpdesk-user-service
docker exec helpdesk-auth-service nslookup helpdesk-auth-db

# 3. Vérifier la configuration des URLs de service
docker exec helpdesk-user-service env | grep AUTH_SERVICE_URL

# 4. Recréer le réseau
docker-compose -f docker-compose.services.yml down
docker network prune
docker-compose -f docker-compose.services.yml up -d
```

### CORS Errors

**Solutions :**

```bash
# Vérifier la configuration CORS
docker exec helpdesk-auth-service env | grep CORS

# Mettre à jour la configuration
# Dans docker-compose.yml:
environment:
  - CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

## 📊 Logs et Monitoring

### Augmenter le niveau de logs

```bash
# Temporairement
docker exec helpdesk-auth-service npm run dev -- --log-level debug

# Permanent dans docker-compose.yml
environment:
  - LOG_LEVEL=debug
```

### Centraliser les logs

```yaml
# docker-compose.yml
version: "3.8"
services:
    auth-service:
        logging:
            driver: "json-file"
            options:
                max-size: "10m"
                max-file: "3"
                labels: "service=auth"
# Ou utiliser un driver externe comme ELK
```

### Surveiller en temps réel

```bash
# Logs en temps réel de tous les services
docker-compose -f docker-compose.services.yml logs -f

# Logs filtrés
docker-compose -f docker-compose.services.yml logs -f | grep -i error

# Utiliser stern pour Kubernetes
stern helpdesk --tail 100
```

## 💾 Récupération de Données

### Sauvegarder avant dépannage

```bash
#!/bin/bash
# emergency-backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p emergency-backup-$DATE

# Sauvegarder les bases de données
docker exec helpdesk-auth-db pg_dump -U user auth_db > emergency-backup-$DATE/auth_db.sql
docker exec helpdesk-user-db pg_dump -U user user_db > emergency-backup-$DATE/user_db.sql
docker exec helpdesk-ticket-db pg_dump -U ticket ticket_db > emergency-backup-$DATE/ticket_db.sql

# Sauvegarder les volumes
docker run --rm -v helpdesk-microservices_auth-db-data:/data -v $(pwd)/emergency-backup-$DATE:/backup busybox tar czf /backup/auth-db-data.tar.gz -C /data .

echo "Emergency backup created in emergency-backup-$DATE/"
```

### Restaurer des données

```bash
#!/bin/bash
# restore-emergency.sh
BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: $0 <backup-directory>"
    exit 1
fi

# Arrêter les services
docker-compose -f docker-compose.services.yml stop

# Restaurer les bases de données
docker exec -i helpdesk-auth-db psql -U user auth_db < $BACKUP_DIR/auth_db.sql
docker exec -i helpdesk-user-db psql -U user user_db < $BACKUP_DIR/user_db.sql
docker exec -i helpdesk-ticket-db psql -U ticket ticket_db < $BACKUP_DIR/ticket_db.sql

# Redémarrer les services
docker-compose -f docker-compose.services.yml start

echo "Data restored from $BACKUP_DIR"
```

## ❓ FAQ

### Q: Comment réinitialiser complètement le système ?

```bash
# Arrêter tous les services et supprimer les données
docker-compose -f docker-compose.services.yml down -v

# Supprimer toutes les images
docker rmi $(docker images -q helpdesk-microservices*)

# Nettoyer le système Docker
docker system prune -af --volumes

# Redémarrer
docker-compose -f docker-compose.services.yml up -d --build
```

### Q: Comment débugger un service spécifique ?

```bash
# Arrêter le service
docker-compose -f docker-compose.services.yml stop auth-service

# Le démarrer en mode debug
docker-compose -f docker-compose.services.yml run --rm -p 3001:3001 -p 9229:9229 auth-service npm run debug

# Ou entrer dans le conteneur
docker-compose -f docker-compose.services.yml exec auth-service /bin/sh
```

### Q: Comment migrer vers une nouvelle version ?

```bash
# 1. Sauvegarder les données
./backup-data.sh

# 2. Télécharger la nouvelle version
git pull origin main

# 3. Reconstruire les services
docker-compose -f docker-compose.services.yml build --no-cache

# 4. Déployer
docker-compose -f docker-compose.services.yml up -d

# 5. Vérifier la migration
./test-services.sh
```

### Q: Comment scaler un service spécifique ?

```bash
# Scaler le service ticket
docker-compose -f docker-compose.services.yml up -d --scale ticket-service=3

# Ou pour la production avec load balancer
docker-compose -f docker-compose.prod.yml up -d --scale ticket-service=3
```

---

Ce guide de dépannage couvre la plupart des problèmes courants. Si vous rencontrez un problème non documenté, consultez les logs détaillés et n'hésitez pas à ouvrir une issue sur le repository GitHub.
