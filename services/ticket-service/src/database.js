// src/database.js
const { Pool } = require('pg');
const config = require('./config');

let pool;

const initializeDatabase = () => {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: config.database.url,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    ...config.database.pool
  });

  // Gestion des événements de connexion
  pool.on('connect', () => {
    console.log('✅ Connected to ticket database');
  });

  pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
  });

  return pool;
};

const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('🔍 Database connection test successful:', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

const createTables = async () => {
  const createTicketsTable = `
    CREATE TABLE IF NOT EXISTS tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed')),
      category VARCHAR(50) NOT NULL,
      user_id UUID NOT NULL,
      assignee_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      resolved_at TIMESTAMP WITH TIME ZONE,
      closed_at TIMESTAMP WITH TIME ZONE
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
  `;

  try {
    const client = await pool.connect();
    
    console.log('📋 Creating tickets table...');
    await client.query(createTicketsTable);
    
    console.log('📋 Creating indexes...');
    await client.query(createIndexes);
    
    console.log('✅ Database tables and indexes created successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error creating database tables:', error.message);
    return false;
  }
};

const closeConnection = async () => {
  if (pool) {
    await pool.end();
    console.log('🔐 Database connection closed');
  }
};

module.exports = {
  initializeDatabase,
  testConnection,
  createTables,
  closeConnection,
  getPool: () => pool
};