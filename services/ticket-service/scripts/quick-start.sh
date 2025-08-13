#!/bin/bash
# scripts/quick-start.sh

echo "🚀 Quick Start - Ticket Service"
echo "================================="

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer pour continuer."
    exit 1
fi

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Démarrer le service
echo "🔄 Démarrage du Ticket Service..."
echo "📍 Port: 3003"
echo "🔗 Health: http://localhost:3003/api/v1/health"
echo "🔗 Service: http://localhost:3003/"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le service."
echo ""

npm start
