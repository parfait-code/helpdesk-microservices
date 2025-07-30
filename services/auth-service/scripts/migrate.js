// scripts/migrate.js
require('dotenv').config();
const DatabaseManager = require('../src/config/database');

const migrations = [
  {
    version: '001',
    name: 'add_password_reset_table',
    up: `
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash 
      ON password_resets(token_hash);
      
      CREATE INDEX IF NOT EXISTS idx_password_resets_user_id 
      ON password_resets(user_id);
    `,
    down: `
      DROP TABLE IF EXISTS password_resets;
    `
  },
  {
    version: '002',
    name: 'add_user_sessions_table',
    up: `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
      ON user_sessions(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id 
      ON user_sessions(session_id);
    `,
    down: `
      DROP TABLE IF EXISTS user_sessions;
    `
  }
];

async function runMigrations() {
  console.log('🔄 Exécution des migrations...');
  
  try {
    await DatabaseManager.connectPostgreSQL();
    const client = await DatabaseManager.pg.connect();
    
    // Créer la table des migrations si elle n'existe pas
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        version VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Obtenir les migrations déjà exécutées
    const executedResult = await client.query(
      'SELECT version FROM migrations ORDER BY version'
    );
    const executedMigrations = executedResult.rows.map(row => row.version);
    
    // Exécuter les nouvelles migrations
    for (const migration of migrations) {
      if (!executedMigrations.includes(migration.version)) {
        console.log(`🔄 Exécution migration ${migration.version}: ${migration.name}`);
        
        await client.query('BEGIN');
        try {
          await client.query(migration.up);
          await client.query(
            'INSERT INTO migrations (version, name) VALUES ($1, $2)',
            [migration.version, migration.name]
          );
          await client.query('COMMIT');
          
          console.log(`✅ Migration ${migration.version} exécutée avec succès`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      } else {
        console.log(`⏭️  Migration ${migration.version} déjà exécutée`);
      }
    }
    
    client.release();
    console.log('✅ Toutes les migrations ont été exécutées');
    
    await DatabaseManager.close();
    
  } catch (error) {
    console.error('❌ Erreur lors des migrations:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations, migrations };