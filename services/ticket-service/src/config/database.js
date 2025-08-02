// src/config/database.js
const { Pool } = require('pg');
const config = require('./index');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      this.pool = new Pool({
        connectionString: config.database.url,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
        ...config.database.pool
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('📊 Database connected successfully');
      return this.pool;
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      logger.info('📊 Database disconnected');
    }
  }

  getPool() {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
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
}

module.exports = new Database();