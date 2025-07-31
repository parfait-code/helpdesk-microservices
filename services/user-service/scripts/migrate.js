// scripts/migrate.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

class DatabaseMigrator {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.migrationsDir = path.join(__dirname, '../src/migrations');
  }

  async getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    return files.map(file => ({
      name: file,
      path: path.join(this.migrationsDir, file)
    }));
  }

  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await this.pool.query(query);
    console.log('✅ Migrations table created');
  }

  async getExecutedMigrations() {
    try {
      const result = await this.pool.query('SELECT name FROM migrations ORDER BY id');
      return result.rows.map(row => row.name);
    } catch (error) {
      return [];
    }
  }

  async executeMigration(migration) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const sql = fs.readFileSync(migration.path, 'utf8');
      await client.query(sql);
      
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration.name]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration executed: ${migration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration failed: ${migration.name}`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate() {
    try {
      console.log('🔄 Starting database migrations...');
      
      await this.createMigrationsTable();
      
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      const pendingMigrations = migrationFiles.filter(
        migration => !executedMigrations.includes(migration.name)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }
      
      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('🎉 All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async rollback(steps = 1) {
    try {
      console.log(`🔄 Rolling back ${steps} migration(s)...`);
      
      const executedMigrations = await this.getExecutedMigrations();
      const migrationsToRollback = executedMigrations.slice(-steps);
      
      if (migrationsToRollback.length === 0) {
        console.log('❌ No migrations to rollback');
        return;
      }
      
      for (const migrationName of migrationsToRollback.reverse()) {
        await this.pool.query(
          'DELETE FROM migrations WHERE name = $1',
          [migrationName]
        );
        console.log(`↩️  Rolled back: ${migrationName}`);
      }
      
      console.log('✅ Rollback completed');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async status() {
    try {
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      console.log('\n📊 Migration Status:');
      console.log('===================');
      
      for (const migration of migrationFiles) {
        const isExecuted = executedMigrations.includes(migration.name);
        const status = isExecuted ? '✅ Executed' : '⏳ Pending';
        console.log(`${status} - ${migration.name}`);
      }
      
      console.log(`\nTotal: ${migrationFiles.length} migrations`);
      console.log(`Executed: ${executedMigrations.length}`);
      console.log(`Pending: ${migrationFiles.length - executedMigrations.length}`);
    } catch (error) {
      console.error('❌ Status check failed:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// CLI
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2];
  const param = process.argv[3];
  
  switch (command) {
    case 'up':
      migrator.migrate();
      break;
    case 'down':
      migrator.rollback(parseInt(param) || 1);
      break;
    case 'status':
      migrator.status();
      break;
    default:
      console.log('Usage:');
      console.log('  npm run db:migrate up     - Execute pending migrations');
      console.log('  npm run db:migrate down [n] - Rollback n migrations (default: 1)');
      console.log('  npm run db:migrate status - Show migration status');
  }
}

module.exports = DatabaseMigrator;

