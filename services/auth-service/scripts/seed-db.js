// scripts/seed-db.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const DatabaseManager = require('../src/config/database');

async function seedDatabase() {
  console.log('🌱 Ajout de données de test...');
  
  try {
    await DatabaseManager.connectPostgreSQL();
    
    const client = await DatabaseManager.pg.connect();
    
    // Créer un utilisateur admin de test
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    await client.query(`
      INSERT INTO users (email, password_hash, role, email_verified, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@test.com', adminPassword, 'admin', true, true]);
    
    // Créer un utilisateur normal de test
    const userPassword = await bcrypt.hash('User123!', 12);
    await client.query(`
      INSERT INTO users (email, password_hash, role, email_verified, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['user@test.com', userPassword, 'user', true, true]);
    
    client.release();
    
    console.log('✅ Données de test ajoutées:');
    console.log('   Admin: admin@test.com / Admin123!');
    console.log('   User:  user@test.com  / User123!');
    
    await DatabaseManager.close();
    
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;