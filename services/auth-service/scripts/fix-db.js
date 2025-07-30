// scripts/fix-db.js
require('dotenv').config();
const { Pool } = require('pg');

async function diagnoseProblem() {
  console.log('🔍 Diagnostic du problème de base de données...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  try {
    const client = await pool.connect();
    
    // 1. Vérifier les extensions disponibles
    console.log('\n📊 Extensions disponibles:');
    const extensionsResult = await client.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pgcrypto')
    `);
    
    if (extensionsResult.rows.length === 0) {
      console.log('   ⚠️  Aucune extension UUID trouvée');
      console.log('   💡 Tentative d\'installation des extensions...');
      
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        console.log('   ✅ Extension uuid-ossp installée');
      } catch (error) {
        console.log('   ❌ Impossible d\'installer uuid-ossp:', error.message);
        
        try {
          await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
          console.log('   ✅ Extension pgcrypto installée (fallback)');
        } catch (error2) {
          console.log('   ❌ Impossible d\'installer pgcrypto:', error2.message);
        }
      }
    } else {
      extensionsResult.rows.forEach(row => {
        console.log(`   ✅ ${row.extname} v${row.extversion}`);
      });
    }
    
    // 2. Vérifier les tables existantes et leurs types
    console.log('\n📋 Tables existantes:');
    const tablesResult = await client.query(`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.udt_name
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      AND t.table_name IN ('users', 'refresh_tokens')
      ORDER BY t.table_name, c.ordinal_position
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('   ✅ Aucune table existante - création propre possible');
    } else {
      const tablesByName = {};
      tablesResult.rows.forEach(row => {
        if (!tablesByName[row.table_name]) {
          tablesByName[row.table_name] = [];
        }
        tablesByName[row.table_name].push({
          column: row.column_name,
          type: row.data_type,
          udt: row.udt_name
        });
      });
      
      Object.keys(tablesByName).forEach(tableName => {
        console.log(`   📊 Table: ${tableName}`);
        tablesByName[tableName].forEach(col => {
          const typeInfo = col.udt === 'uuid' ? 'UUID' : col.type;
          console.log(`      - ${col.column}: ${typeInfo}`);
          
          if (col.column === 'id' && col.udt !== 'uuid') {
            console.log(`        ⚠️  PROBLÈME: La colonne id devrait être UUID, mais est ${col.udt}`);
          }
        });
      });
    }
    
    // 3. Vérifier les contraintes existantes
    console.log('\n🔗 Contraintes de clé étrangère:');
    const constraintsResult = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    `);
    
    if (constraintsResult.rows.length === 0) {
      console.log('   ✅ Aucune contrainte existante');
    } else {
      constraintsResult.rows.forEach(row => {
        console.log(`   🔗 ${row.constraint_name}: ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erreur diagnostic:', error.message);
  } finally {
    await pool.end();
  }
}

async function cleanAndRecreate() {
  console.log('🧹 Nettoyage et recréation de la base...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  try {
    const client = await pool.connect();
    
    // 1. Supprimer seulement NOS tables (pas celles de Prisma)
    console.log('🗑️  Suppression des tables auth-service...');
    await client.query('DROP TABLE IF EXISTS refresh_tokens CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    // Ne pas toucher aux tables Prisma (*prisma*migrations, etc.)
    
    // 2. Supprimer nos fonctions
    await client.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
    
    console.log('✅ Tables auth-service supprimées (tables Prisma préservées)');
    
    // 3. Installer les extensions nécessaires
    console.log('🔧 Installation des extensions...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ Extension uuid-ossp installée');
    } catch (error) {
      console.log('⚠️  uuid-ossp non disponible, utilisation de gen_random_uuid()');
      
      // Vérifier si gen_random_uuid est disponible (PostgreSQL 13+)
      try {
        await client.query('SELECT gen_random_uuid()');
        console.log('✅ gen_random_uuid() disponible');
      } catch (error2) {
        throw new Error('Aucune fonction UUID disponible. Mettez à jour PostgreSQL ou installez uuid-ossp.');
      }
    }
    
    client.release();
    console.log('✅ Base nettoyée et prête pour l\'initialisation');
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function testUUIDFunctions() {
  console.log('🧪 Test des fonctions UUID disponibles...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  try {
    const client = await pool.connect();
    
    // Test uuid-ossp
    try {
      await client.query('SELECT uuid_generate_v4()');
      console.log('✅ uuid_generate_v4() fonctionne');
    } catch (error) {
      console.log('❌ uuid_generate_v4() non disponible');
    }
    
    // Test gen_random_uuid
    try {
      await client.query('SELECT gen_random_uuid()');
      console.log('✅ gen_random_uuid() fonctionne');
    } catch (error) {
      console.log('❌ gen_random_uuid() non disponible');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erreur test UUID:', error.message);
  } finally {
    await pool.end();
  }
}

// CLI
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'diagnose':
      diagnoseProblem();
      break;
    case 'clean':
      cleanAndRecreate();
      break;
    case 'test-uuid':
      testUUIDFunctions();
      break;
    case 'fix':
      console.log('🔧 Réparation complète de la base de données...');
      cleanAndRecreate()
        .then(() => {
          console.log('✅ Nettoyage terminé. Relancez npm run db:init');
        })
        .catch(console.error);
      break;
    default:
      console.log('Usage:');
      console.log('  node scripts/fix-db.js diagnose   - Diagnostiquer les problèmes');
      console.log('  node scripts/fix-db.js clean      - Nettoyer les tables');
      console.log('  node scripts/fix-db.js test-uuid  - Tester les fonctions UUID');
      console.log('  node scripts/fix-db.js fix        - Réparation complète');
  }
}

module.exports = { diagnoseProblem, cleanAndRecreate, testUUIDFunctions };