#!/bin/bash

echo "=========================================="
echo "  File Service - Quick Start"
echo "=========================================="
echo ""

echo "1. Démarrage des services Docker..."
docker-compose up -d

echo ""
echo "2. Attente du démarrage des services..."
sleep 10

echo ""
echo "3. Vérification des services..."
docker-compose ps

echo ""
echo "4. Test de santé du service..."
node scripts/verify-service.js

echo ""
echo "=========================================="
echo "  File Service est prêt !"
echo "=========================================="
echo ""
echo "Accès:"
echo "- API: http://localhost:3004/api/v1"
echo "- Health: http://localhost:3004/api/v1/health"
echo "- MinIO Console: http://localhost:9001"
echo ""
echo "Pour arrêter: docker-compose down"
echo ""
