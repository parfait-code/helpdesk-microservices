// src/config/index.js
require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5402/user_db',
    ssl: process.env.NODE_ENV === 'production',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 2000
    }
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6302',
    keyPrefix: 'user-service:',
    ttl: {
      profile: parseInt(process.env.REDIS_PROFILE_TTL, 10) || 3600, // 1 hour
      userList: parseInt(process.env.REDIS_USER_LIST_TTL, 10) || 300 // 5 minutes
    }
  },

  // External Services
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT, 10) || 5000
    },
    file: {
      url: process.env.FILE_SERVICE_URL || 'http://localhost:3004',
      timeout: parseInt(process.env.FILE_SERVICE_TIMEOUT, 10) || 10000,
      enabled: process.env.ENABLE_FILE_SERVICE === 'true',
      mock: process.env.MOCK_FILE_SERVICE === 'true'
    }
  },

  // Kafka Configuration
  kafka: {
    enabled: process.env.ENABLE_KAFKA === 'true',
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    clientId: 'user-service',
    groupId: 'user-service-group',
    topics: {
      userCreated: 'user.created',
      userUpdated: 'user.updated',
      userDeleted: 'user.deleted',
      profileUpdated: 'profile.updated'
    }
  },

  // Upload Configuration
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    avatarSize: {
      width: 300,
      height: 300,
      quality: 80
    }
  },

  // Security
  security: {
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
    }
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  }
};

module.exports = config;

