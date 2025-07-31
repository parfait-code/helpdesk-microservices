# Makefile pour simplifier les commandes
.PHONY: help build up down logs shell db-shell redis-shell migrate seed test clean

help: ## Afficher l'aide
	@echo "Commandes disponibles:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Construire les images Docker
	docker-compose -f docker-compose.user.yml build

up: ## Démarrer les services
	docker-compose -f docker-compose.user.yml up -d

down: ## Arrêter les services
	docker-compose -f docker-compose.user.yml down

logs: ## Voir les logs
	docker-compose -f docker-compose.user.yml logs -f user-service

shell: ## Shell dans le conteneur user-service
	docker-compose -f docker-compose.user.yml exec user-service sh

db-shell: ## Shell PostgreSQL
	docker-compose -f docker-compose.user.yml exec user-db psql -U user -d user_db

redis-shell: ## Shell Redis
	docker-compose -f docker-compose.user.yml exec user-redis redis-cli

migrate: ## Exécuter les migrations
	docker-compose -f docker-compose.user.yml exec user-service npm run db:migrate

seed: ## Remplir la base avec des données de test
	docker-compose -f docker-compose.user.yml exec user-service npm run db:seed

test: ## Exécuter les tests
	docker-compose -f docker-compose.user.yml exec user-service npm test

test-integration: ## Tests d'intégration
	docker-compose -f docker-compose.user.yml exec user-service npm run test:integration

clean: ## Nettoyer les volumes et images
	docker-compose -f docker-compose.user.yml down -v
	docker system prune -f