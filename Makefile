# Makefile pour le déploiement des microservices Helpdesk
.PHONY: help install build start stop restart logs clean test-integration

# Aide
help:
	@echo "🏥 Helpdesk Microservices - Commandes disponibles:"
	@echo ""
	@echo "  make install          - Installer les dépendances"
	@echo "  make build            - Construire les images Docker"
	@echo "  make start            - Démarrer tous les services"
	@echo "  make stop             - Arrêter tous les services"
	@echo "  make restart          - Redémarrer tous les services"
	@echo "  make logs             - Voir les logs de tous les services"
	@echo "  make logs-auth        - Voir les logs du service auth"
	@echo "  make logs-user        - Voir les logs du service user"
	@echo "  make clean            - Nettoyer les containers et volumes"
	@echo "  make test-integration - Tester l'intégration des services"
	@echo "  make status           - Voir l'état des services"
	@echo ""

# Installation des dépendances
install:
	@echo "📦 Installation des dépendances..."
	@cd services/auth-service && npm install
	@cd services/user-service && npm install
	@npm install axios colors
	@echo "✅ Dépendances installées"

# Construction des images
build:
	@echo "🏗️  Construction des images Docker..."
	@docker-compose -f docker-compose.services.yml build
	@echo "✅ Images construites"

# Démarrage des services
start:
	@echo "🚀 Démarrage des services..."
	@docker-compose -f docker-compose.services.yml up -d
	@echo "✅ Services démarrés"
	@echo ""
	@echo "📡 Services disponibles:"
	@echo "  - Auth Service: http://localhost:3001"
	@echo "  - User Service: http://localhost:3002"
	@echo "  - Auth DB: localhost:5401"
	@echo "  - User DB: localhost:5402"
	@echo ""

# Arrêt des services
stop:
	@echo "🛑 Arrêt des services..."
	@docker-compose -f docker-compose.services.yml down
	@echo "✅ Services arrêtés"

# Redémarrage des services
restart: stop start

# Logs de tous les services
logs:
	@docker-compose -f docker-compose.services.yml logs -f

# Logs du service auth
logs-auth:
	@docker-compose -f docker-compose.services.yml logs -f auth-service

# Logs du service user
logs-user:
	@docker-compose -f docker-compose.services.yml logs -f user-service

# Nettoyage complet
clean:
	@echo "🧹 Nettoyage des containers et volumes..."
	@docker-compose -f docker-compose.services.yml down -v --remove-orphans
	@docker system prune -f
	@echo "✅ Nettoyage terminé"

# Test d'intégration
test-integration:
	@echo "🧪 Démarrage des tests d'intégration..."
	@echo "⏳ Attente du démarrage complet des services (30s)..."
	@sleep 30
	@node scripts/test-integration.js

# Statut des services
status:
	@echo "📊 État des services:"
	@docker-compose -f docker-compose.services.yml ps
	@echo ""
	@echo "🌐 Health checks:"
	@curl -s http://localhost:3001/health | jq '.status' || echo "❌ Auth Service indisponible"
	@curl -s http://localhost:3002/health | jq '.status' || echo "❌ User Service indisponible"

# Développement - Démarrage avec monitoring
dev: start
	@echo "🔧 Mode développement activé"
	@echo "👀 Surveillance des logs..."
	@make logs

# Reset de la base de données
reset-db:
	@echo "🗄️  Reset des bases de données..."
	@docker-compose -f docker-compose.services.yml exec auth-db psql -U user -d auth_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@docker-compose -f docker-compose.services.yml exec user-db psql -U user -d user_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@docker-compose -f docker-compose.services.yml restart auth-service user-service
	@echo "✅ Bases de données réinitialisées"
