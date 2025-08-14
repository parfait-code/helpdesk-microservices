#!/usr/bin/env node

const fileServiceApp = require('./src/app');
const logger = require('./src/utils/logger');

async function startServer() {
    try {
        // Initialiser l'application
        await fileServiceApp.initialize();
        
        // Démarrer le serveur
        await fileServiceApp.start();
        
    } catch (error) {
        logger.error('❌ Failed to start File Service:', error);
        process.exit(1);
    }
}

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
    startServer();
}

module.exports = fileServiceApp;
