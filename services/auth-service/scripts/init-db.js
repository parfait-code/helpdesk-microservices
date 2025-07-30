// scripts/init-db.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const DatabaseManager = require('../src/config/database');

async function initializeDatabase() {
  console.log('🔄 Initialisation de la base de données...');
  
  try {
    // Connexion à la base de données
    await DatabaseManager.connectPostgreSQL();
    await DatabaseManager.connectRedis();
    
    // Option 1: Utiliser le script SQL
    const sqlPath = path.join(__dirname, 'init-db.sql');
    if (fs.existsSync(sqlPath)) {
      console.log('📁 Utilisation du script SQL d\'initialisation...');
      const sqlScript = fs.readFileSync(sqlPath, 'utf8');
      
      const client = await DatabaseManager.pg.connect();
      try {
        await client.query(sqlScript);
        console.log('✅ Script SQL exécuté avec succès');
      } finally {
        client.release();
      }
    } else {
      // Option 2: Utiliser la méthode JavaScript
      console.log('📝 Utilisation de l\'initialisation JavaScript...');
      await DatabaseManager.initializeTables();
    }
    
    console.log('✅ Base de données initialisée avec succès');
    
    // Fermer les connexions
    await DatabaseManager.close();
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
    console.error('Details:', error.detail || '');
    
    // Afficher des conseils de dépannage
    console.log('\n🔧 Conseils de dépannage:');
    console.log('1. Vérifiez que PostgreSQL est démarré');
    console.log('2. Vérifiez les paramètres de connexion dans .env');
    console.log('3. Assurez-vous que la base de données existe');
    console.log('4. Vérifiez les permissions utilisateur PostgreSQL');
    
    process.exit(1);
  }
}

// Fonction pour créer la base de données si elle n'existe pas
async function createDatabaseIfNotExists() {
  console.log('🔄 Vérification de l\'existence de la base de données...');
  
  try {
    const { Pool } = require('pg');
    const url = new URL(process.env.DATABASE_URL);
    const dbName = url.pathname.slice(1); // Retirer le '/' du début
    
    // Connexion à la base postgres par défaut
    const adminPool = new Pool({
      ...Object.fromEntries(url.searchParams),
      host: url.hostname,
      port: url.port,
      user: url.username,
      password: url.password,
      database: 'postgres' // Connexion à la DB par défaut
    });
    
    const client = await adminPool.connect();
    
    try {
      // Vérifier si la base existe
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName]
      );
      
      if (result.rows.length === 0) {
        console.log(`📦 Création de la base de données: ${dbName}`);
        await client.query(`CREATE DATABASE "${dbName}"`);
        console.log('✅ Base de données créée avec succès');
      } else {
        console.log(`✅ Base de données ${dbName} existe déjà`);
      }
    } finally {
      client.release();
      await adminPool.end();
    }
    
  } catch (error) {
    console.warn('⚠️  Impossible de créer la base automatiquement:', error.message);
    console.log('Assurez-vous que la base de données existe manuellement');
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--create-db')) {
    createDatabaseIfNotExists()
      .then(() => initializeDatabase())
      .catch(console.error);
  } else {
    initializeDatabase();
  }
}

module.exports = { initializeDatabase, createDatabaseIfNotExists };