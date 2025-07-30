// src/config/database.js
const { Pool } = require('pg');
const Redis = require('ioredis');

class DatabaseManager {
  constructor() {
    this.pgPool = null;
    this.redisClient = null;
  }

  // Configuration PostgreSQL
  async connectPostgreSQL() {
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
      }

      this.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test de connexion avec retry
      let retries = 3;
      while (retries > 0) {
        try {
          const client = await this.pgPool.connect();
          console.log('✅ PostgreSQL connecté avec succès');
          client.release();
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.log(`⚠️ Tentative de reconnexion PostgreSQL (${3 - retries}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return this.pgPool;
    } catch (error) {
      console.error('❌ Erreur connexion PostgreSQL:', error.message);
      throw error;
    }
  }

  // Configuration Redis
  async connectRedis() {
    try {
      this.redisClient = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis connecté avec succès');
      });

      this.redisClient.on('error', (error) => {
        console.error('❌ Erreur Redis:', error.message);
      });

      await this.redisClient.connect();
      return this.redisClient;
    } catch (error) {
      console.error('❌ Erreur connexion Redis:', error.message);
      throw error;
    }
  }

  // Initialisation des tables
  async initializeTables() {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');

      // Vérifier si l'extension uuid-ossp existe, sinon utiliser gen_random_uuid()
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
      `);

      // Table users d'abord
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          is_active BOOLEAN DEFAULT true,
          email_verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          failed_login_attempts INT DEFAULT 0,
          locked_until TIMESTAMP
        )
      `);

      // Créer les index pour la table users
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
      `);

      // Table refresh_tokens après la table users
      await client.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          is_revoked BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ajouter la contrainte de clé étrangère séparément
      await client.query(`
        DO $ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'refresh_tokens_user_id_fkey'
          ) THEN
            ALTER TABLE refresh_tokens 
            ADD CONSTRAINT refresh_tokens_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
        END $
      `);

      // Créer les index pour la table refresh_tokens
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash)
      `);

      // Fonction pour mettre à jour updated_at automatiquement
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $ language 'plpgsql'
      `);

      // Trigger pour auto-update du champ updated_at
      await client.query(`
        DROP TRIGGER IF EXISTS update_users_updated_at ON users
      `);
      
      await client.query(`
        CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);

      await client.query('COMMIT');
      console.log('✅ Tables initialisées avec succès');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Erreur initialisation tables:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // Fermeture des connexions
  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
      console.log('PostgreSQL connection fermée');
    }
    
    if (this.redisClient) {
      this.redisClient.disconnect();
      console.log('Redis connection fermée');
    }
  }

  // Getters
  get pg() {
    return this.pgPool;
  }

  get redis() {
    return this.redisClient;
  }
}

module.exports = new DatabaseManager();