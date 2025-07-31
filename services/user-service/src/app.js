// src/app.js
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const database = require('./config/database');
const redisClient = require('./config/redis');
const kafkaService = require('./services/KafkaService');
const routes = require('./routes');
const { handleError } = require('./utils/errors');
const { securityHeaders, customSecurityHeaders, sanitizeLogging } = require('./middleware/security');
const { generalRateLimit } = require('./middleware/rateLimit');
const logger = require('./utils/logger');

class App {
  constructor() {
    this.app = express();
    this.server = null;
  }

  async initialize() {
    try {
      // Connexion aux bases de données
      await database.connect();
      await redisClient.connect();
      
      // Connexion à Kafka (optionnel)
      await kafkaService.connect();

      // Configuration de l'application Express
      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandling();

      logger.info('🚀 User Service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize User Service:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Sécurité
    this.app.use(securityHeaders);
    this.app.use(customSecurityHeaders);
    this.app.use(sanitizeLogging);

    // CORS
    this.app.use(cors({
      origin: config.security.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression et parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(generalRateLimit);

    // Trust proxy pour obtenir la vraie IP
    this.app.set('trust proxy', 1);

    // Middleware de logging des requêtes
    this.app.use((req, res, next) => {
      logger.info('Request received', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  setupRoutes() {
    // Routes principales
    this.app.use('/api/v1', routes);

    // Route de fallback
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
      });
    });
  }

  setupErrorHandling() {
    // Gestionnaire d'erreurs global
    this.app.use(handleError);

    // Gestion des erreurs non capturées
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown();
    });

    // Gestion des signaux d'arrêt
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  async start() {
    await this.initialize();

    this.server = this.app.listen(config.port, () => {
      logger.info(`🎯 User Service running on port ${config.port}`);
      logger.info(`📱 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 API Base URL: http://localhost:${config.port}/api/v1`);
    });

    return this.server;
  }

  async shutdown() {
    logger.info('🔄 Shutting down User Service...');

    try {
      // Fermer les connexions
      if (this.server) {
        this.server.close();
      }

      await kafkaService.disconnect();
      await redisClient.disconnect();
      await database.disconnect();

      logger.info('✅ User Service shut down complete');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Démarrage de l'application si exécutée directement
if (require.main === module) {
  const app = new App();
  app.start().catch((error) => {
    logger.error('❌ Failed to start User Service:', error);
    process.exit(1);
  });
}

module.exports = App;