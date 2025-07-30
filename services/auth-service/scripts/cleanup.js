// scripts/cleanup.js
require('dotenv').config();
const DatabaseManager = require('../src/config/database');

async function cleanup() {
  console.log('🧹 Nettoyage de la base de données...');
  
  try {
    await DatabaseManager.connectPostgreSQL();
    await DatabaseManager.connectRedis();
    
    const client = await DatabaseManager.pg.connect();
    
    // Nettoyer les refresh tokens expirés
    const tokensResult = await client.query(`
      DELETE FROM refresh_tokens 
      WHERE expires_at < NOW() OR is_revoked = true
    `);
    
    // Nettoyer les utilisateurs non vérifiés depuis plus de 24h
    const usersResult = await client.query(`
      DELETE FROM users 
      WHERE email_verified = false 
      AND created_at < NOW() - INTERVAL '24 hours'
    `);
    
    client.release();
    
    // Nettoyer Redis
    const keys = await DatabaseManager.redis.keys('*');
    let redisCleanCount = 0;
    
    for (const key of keys) {
      const ttl = await DatabaseManager.redis.ttl(key);
      if (ttl === -1 || ttl === 0) {
        await DatabaseManager.redis.del(key);
        redisCleanCount++;
      }
    }
    
    console.log(`✅ Nettoyage terminé:`);
    console.log(`   ${tokensResult.rowCount} refresh tokens supprimés`);
    console.log(`   ${usersResult.rowCount} utilisateurs non vérifiés supprimés`);
    console.log(`   ${redisCleanCount} clés Redis nettoyées`);
    
    await DatabaseManager.close();
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanup();
}

module.exports = cleanup;