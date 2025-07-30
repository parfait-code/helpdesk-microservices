// tests/setup.js
require('dotenv').config({ path: '.env.test' });

const DatabaseManager = require('../src/config/database');

// Configuration globale pour les tests
global.testDatabase = DatabaseManager;

// Setup avant tous les tests
beforeAll(async () => {
  try {
    await DatabaseManager.connectPostgreSQL();
    await DatabaseManager.connectRedis();
    await DatabaseManager.initializeTables();
  } catch (error) {
    console.error('Erreur setup tests:', error);
    process.exit(1);
  }
});

// Nettoyage après tous les tests
afterAll(async () => {
  try {
    // Nettoyer les données de test
    const client = await DatabaseManager.pg.connect();
    await client.query('TRUNCATE users, refresh_tokens CASCADE');
    client.release();
    
    // Nettoyer Redis
    await DatabaseManager.redis.flushall();
    
    // Fermer les connexions
    await DatabaseManager.close();
  } catch (error) {
    console.error('Erreur nettoyage tests:', error);
  }
});