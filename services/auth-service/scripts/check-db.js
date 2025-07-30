// scripts/check-db.js
require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabase() {
  console.log('🔍 Vérification de la configuration base de données...');
  
  try {
    const url = new URL(process.env.DATABASE_URL);
    const dbName = url.pathname.slice(1);
    
    console.log(`📊 Configuration détectée:`);
    console.log(`   - Host: ${url.hostname}`);
    console.log(`   - Port: ${url.port}`);
    console.log(`   - Database: ${dbName}`);
    console.log(`   - User: ${url.username}`);
    
    // Test de connexion à PostgreSQL
    console.log('\n🔄 Test de connexion...');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });
    
    const client = await pool.connect();
    
    // Vérifier la version PostgreSQL
    const versionResult = await client.query('SELECT version()');
    console.log('✅ PostgreSQL connecté:', versionResult.rows[0].version.split(' ')[1]);
    
    // Vérifier les tables existantes
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 Tables existantes:');
    if (tablesResult.rows.length === 0) {
      console.log('   Aucune table trouvée - initialisation nécessaire');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
    // Vérifier les extensions
    const extResult = await client.query(`
      SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp'
    `);
    
    if (extResult.rows.length === 0) {
      console.log('⚠️  Extension uuid-ossp non installée - sera créée automatiquement');
    } else {
      console.log('✅ Extension uuid-ossp disponible');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Vérification terminée avec succès');
    
  } catch (error) {
    console.error('\n❌ Erreur de connexion:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Le serveur PostgreSQL n\'est pas accessible');
      console.log('   Vérifiez que PostgreSQL est démarré');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Connexion refusée');
      console.log('   Vérifiez le port et que PostgreSQL accepte les connexions');
    } else if (error.code === '3D000') {
      console.log('💡 Base de données introuvable');
      console.log('   Exécutez: npm run db:create');
    } else if (error.code === '28P01') {
      console.log('💡 Erreur d\'authentification');
      console.log('   Vérifiez le nom d\'utilisateur et mot de passe');
    }
    
    process.exit(1);
  }
}

// Fonction pour créer la base de données
async function createDatabase() {
  console.log('🔄 Création de la base de données...');
  
  try {
    const url = new URL(process.env.DATABASE_URL);
    const dbName = url.pathname.slice(1);
    
    // Connexion à la base postgres
    const adminUrl = new URL(process.env.DATABASE_URL);
    adminUrl.pathname = '/postgres';
    
    const pool = new Pool({
      connectionString: adminUrl.toString(),
      ssl: false
    });
    
    const client = await pool.connect();
    
    // Vérifier si la base existe
    const checkResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    
    if (checkResult.rows.length === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Base de données "${dbName}" créée avec succès`);
    } else {
      console.log(`✅ Base de données "${dbName}" existe déjà`);
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erreur création base:', error.message);
    process.exit(1);
  }
}

// Fonction pour supprimer la base (attention!)
async function dropDatabase() {
  const url = new URL(process.env.DATABASE_URL);
  const dbName = url.pathname.slice(1);
  
  console.log(`⚠️  ATTENTION: Vous allez supprimer la base "${dbName}"`);
  console.log('Cette action est irréversible!');
  
  // En production, ajouter une confirmation
  if (process.env.NODE_ENV === 'production') {
    console.log('❌ Suppression de base interdite en production');
    process.exit(1);
  }
  
  try {
    const adminUrl = new URL(process.env.DATABASE_URL);
    adminUrl.pathname = '/postgres';
    
    const pool = new Pool({
      connectionString: adminUrl.toString(),
      ssl: false
    });
    
    const client = await pool.connect();
    
    // Terminer les connexions actives
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);
    
    // Supprimer la base
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`✅ Base de données "${dbName}" supprimée`);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erreur suppression base:', error.message);
    process.exit(1);
  }
}

// CLI
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      checkDatabase();
      break;
    case 'create':
      createDatabase();
      break;
    case 'drop':
      dropDatabase();
      break;
    default:
      console.log('Usage:');
      console.log('  node scripts/check-db.js check   - Vérifier la connexion');
      console.log('  node scripts/check-db.js create  - Créer la base de données');
      console.log('  node scripts/check-db.js drop    - Supprimer la base de données');
  }
}

module.ex