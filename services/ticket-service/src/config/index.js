// src/config/index.js
require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://ticket:ticketpass@localhost:5403/ticket_db',
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
    url: process.env.REDIS_URL || 'redis://localhost:6303',
    keyPrefix: 'ticket-service:',
    ttl: {
      ticket: parseInt(process.env.REDIS_TICKET_TTL, 10) || 1800, // 30 minutes
      ticketList: parseInt(process.env.REDIS_TICKET_LIST_TTL, 10) || 300, // 5 minutes
      userInfo: parseInt(process.env.REDIS_USER_INFO_TTL, 10) || 3600 // 1 hour
    }
  },

  // External Services
  authService: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT, 10) || 5000
  },

  userService: {
    url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    timeout: parseInt(process.env.USER_SERVICE_TIMEOUT, 10) || 5000
  },

  fileService: {
    url: process.env.FILE_SERVICE_URL || 'http://localhost:3004',
    timeout: parseInt(process.env.FILE_SERVICE_TIMEOUT, 10) || 10000,
    enabled: process.env.ENABLE_FILE_SERVICE === 'true',
    mock: process.env.MOCK_FILE_SERVICE === 'true'
  },

  notificationService: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
    timeout: parseInt(process.env.NOTIFICATION_SERVICE_TIMEOUT, 10) || 5000,
    enabled: process.env.ENABLE_NOTIFICATIONS === 'true',
    mock: process.env.MOCK_NOTIFICATIONS === 'true'
  },

  // Security Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // API Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT, 10) || 100
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  }
};

module.exports = config;
