// scripts/seed.js
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class DatabaseSeeder {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async seedUsers() {
    console.log('🌱 Seeding user profiles...');
    
    const users = [
      {
        userId: uuidv4(),
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        department: 'IT',
        jobTitle: 'System Administrator',
        preferences: {
          language: 'fr',
          theme: 'dark',
          notifications: { email: true, browser: true, sms: false },
          timezone: 'Europe/Paris'
        }
      },
      {
        userId: uuidv4(),
        email: 'manager@example.com',
        firstName: 'Manager',
        lastName: 'User',
        department: 'Operations',
        jobTitle: 'Operations Manager',
        preferences: {
          language: 'fr',
          theme: 'light',
          notifications: { email: true, browser: true, sms: true },
          timezone: 'Europe/Paris'
        }
      },
      {
        userId: uuidv4(),
        email: 'user1@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        department: 'Sales',
        jobTitle: 'Sales Representative',
        phone: '+33123456789',
        preferences: {
          language: 'fr',
          theme: 'light',
          notifications: { email: true, browser: false, sms: false },
          timezone: 'Europe/Paris'
        }
      },
      {
        userId: uuidv4(),
        email: 'user2@example.com',
        firstName: 'Marie',
        lastName: 'Martin',
        department: 'Marketing',
        jobTitle: 'Marketing Specialist',
        phone: '+33987654321',
        preferences: {
          language: 'fr',
          theme: 'auto',
          notifications: { email: true, browser: true, sms: false },
          timezone: 'Europe/Paris'
        }
      },
      {
        userId: uuidv4(),
        email: 'user3@example.com',
        firstName: 'Pierre',
        lastName: 'Durand',
        department: 'IT',
        jobTitle: 'Developer',
        preferences: {
          language: 'en',
          theme: 'dark',
          notifications: { email: false, browser: true, sms: false },
          timezone: 'Europe/Paris'
        }
      }
    ];

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const user of users) {
        const query = `
          INSERT INTO user_profiles (
            user_id, email, first_name, last_name, phone, 
            department, job_title, preferences
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_id) DO NOTHING
        `;
        
        const values = [
          user.userId,
          user.email,
          user.firstName,
          user.lastName,
          user.phone || null,
          user.department,
          user.jobTitle,
          JSON.stringify(user.preferences)
        ];
        
        await client.query(query, values);
        console.log(`✅ Seeded user: ${user.email}`);
      }
      
      await client.query('COMMIT');
      console.log('🎉 User profiles seeded successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async seedActivities() {
    console.log('🌱 Seeding user activities...');
    
    // Récupérer les utilisateurs existants
    const usersResult = await this.pool.query('SELECT user_id FROM user_profiles LIMIT 5');
    const userIds = usersResult.rows.map(row => row.user_id);
    
    if (userIds.length === 0) {
      console.log('❌ No users found, skipping activities seeding');
      return;
    }

    const activityTypes = [
      'profile_created',
      'profile_updated',
      'avatar_uploaded',
      'login',
      'logout',
      'password_changed'
    ];

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const userId of userIds) {
        // Créer 3-7 activités par utilisateur
        const activityCount = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < activityCount; i++) {
          const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
          const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Derniers 30 jours
          
          const query = `
            INSERT INTO user_activities (
              user_id, activity_type, activity_data, 
              ip_address, created_at
            ) VALUES ($1, $2, $3, $4, $5)
          `;
          
          const values = [
            userId,
            activityType,
            JSON.stringify({
              source: 'seed',
              timestamp: createdAt.toISOString()
            }),
            `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
            createdAt
          ];
          
          await client.query(query, values);
        }
        
        console.log(`✅ Seeded ${activityCount} activities for user ${userId.slice(0, 8)}...`);
      }
      
      await client.query('COMMIT');
      console.log('🎉 User activities seeded successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Activities seeding failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async seed() {
    try {
      console.log('🌱 Starting database seeding...');
      
      await this.seedUsers();
      await this.seedActivities();
      
      console.log('🎉 Database seeding completed successfully');
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async clear() {
    try {
      console.log('🧹 Clearing database...');
      
      await this.pool.query('TRUNCATE user_activities, user_profiles RESTART IDENTITY CASCADE');
      
      console.log('✅ Database cleared');
    } catch (error) {
      console.error('❌ Clear failed:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }
}

// CLI
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  const command = process.argv[2];
  
  switch (command) {
    case 'run':
      seeder.seed();
      break;
    case 'clear':
      seeder.clear();
      break;
    default:
      console.log('Usage:');
      console.log('  npm run db:seed run   - Seed the database');
      console.log('  npm run db:seed clear - Clear all data');
  }
}

module.exports = DatabaseSeeder;