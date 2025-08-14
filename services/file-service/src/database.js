const { Pool } = require('pg');
const logger = require('./utils/logger');

class Database {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            const connectionString = process.env.DATABASE_URL;
            
            if (!connectionString) {
                throw new Error('DATABASE_URL environment variable is required');
            }

            this.pool = new Pool({
                connectionString,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Test la connexion
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            
            this.isConnected = true;
            logger.info('✅ Database connected successfully');
            
            // Créer les tables si elles n'existent pas
            await this.createTables();
            
        } catch (error) {
            logger.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    async createTables() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Table pour les fichiers
            await client.query(`
                CREATE TABLE IF NOT EXISTS files (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    original_name VARCHAR(255) NOT NULL,
                    filename VARCHAR(255) NOT NULL UNIQUE,
                    mime_type VARCHAR(100) NOT NULL,
                    size BIGINT NOT NULL,
                    bucket VARCHAR(100) NOT NULL,
                    object_key VARCHAR(500) NOT NULL,
                    ticket_id UUID,
                    user_id UUID NOT NULL,
                    uploaded_by UUID NOT NULL,
                    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB DEFAULT '{}',
                    is_deleted BOOLEAN DEFAULT FALSE,
                    deleted_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Index pour optimiser les requêtes
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_files_ticket_id ON files(ticket_id) WHERE is_deleted = FALSE;
            `);
            
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id) WHERE is_deleted = FALSE;
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_files_upload_date ON files(upload_date);
            `);

            // Table pour les logs de fichiers
            await client.query(`
                CREATE TABLE IF NOT EXISTS file_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    file_id UUID NOT NULL REFERENCES files(id),
                    action VARCHAR(50) NOT NULL,
                    user_id UUID NOT NULL,
                    ip_address INET,
                    user_agent TEXT,
                    details JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_file_logs_file_id ON file_logs(file_id);
            `);

            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_file_logs_created_at ON file_logs(created_at);
            `);

            // Trigger pour updated_at
            await client.query(`
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            `);

            await client.query(`
                DROP TRIGGER IF EXISTS update_files_updated_at ON files;
                CREATE TRIGGER update_files_updated_at
                    BEFORE UPDATE ON files
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            `);

            await client.query('COMMIT');
            logger.info('✅ Database tables created/updated successfully');

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('❌ Failed to create database tables:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async query(text, params = []) {
        if (!this.isConnected || !this.pool) {
            throw new Error('Database not connected');
        }
        
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            if (duration > 1000) {
                logger.warn('Slow query detected:', { 
                    query: text.substring(0, 100),
                    duration: `${duration}ms` 
                });
            }
            
            return result;
        } catch (error) {
            logger.error('Database query error:', {
                error: error.message,
                query: text.substring(0, 100),
                params: params?.length > 0 ? '[PARAMS_PROVIDED]' : '[]'
            });
            throw error;
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            logger.info('Database disconnected');
        }
    }

    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as health');
            return { 
                status: 'healthy', 
                connected: this.isConnected,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return { 
                status: 'unhealthy', 
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

const database = new Database();

module.exports = database;
