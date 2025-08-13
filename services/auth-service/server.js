// server-fix.js - Remplacez le contenu de server.js par ceci
require('dotenv').config();

// Validate environment variables first
const validateEnvironment = require('./src/utils/validateEnv');
validateEnvironment();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const DatabaseManager = require('./src/config/database');
const AuthRoutes = require('./src/routes/auth');
const EventPublisher = require('./src/services/EventPublisher');

class AuthServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.database = DatabaseManager;
    this.eventPublisher = new EventPublisher();
    this.authRoutes = null; // Sera initialisé après la connexion DB
    
    this.setupMiddlewares();
    // Ne pas appeler setupRoutes() ici
    this.setupErrorHandling();
  }

  // Configuration des middlewares
  setupMiddlewares() {
    // Sécurité
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression
    this.app.use(compression());

    // Parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Middleware pour les événements
    this.app.locals.eventPublisher = this.eventPublisher;
    this.app.use(this.eventPublisher.createExpressMiddleware());

    // Headers personnalisés
    this.app.use((req, res, next) => {
      res.setHeader('X-Powered-By', 'Auth-Service-v1.0');
      res.setHeader('X-API-Version', '1.0.0');
      next();
    });
  }

  // Configuration des routes - appelée APRÈS l'initialisation de la DB
  setupRoutes() {
    // Route de santé générale
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'auth-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        database: {
          postgres: !!this.database.pg,
          redis: !!this.database.redis
        }
      });
    });

    // Routes d'authentification - créées APRÈS la connexion DB
    this.authRoutes = new AuthRoutes(this.database, this.database.redis);
    this.app.use('/api/auth', this.authRoutes.getRouter());

    // Route de documentation API
    this.app.get('/api-docs', (req, res) => {
      res.json({
        service: 'Auth Service API',
        version: '1.0.0',
        endpoints: {
          auth: {
            'POST /api/auth/register': 'Inscription utilisateur',
            'POST /api/auth/login': 'Connexion utilisateur',
            'POST /api/auth/logout': 'Déconnexion utilisateur',
            'POST /api/auth/refresh': 'Renouvellement token',
            'GET /api/auth/verify': 'Vérification token',
            'GET /api/auth/me': 'Informations utilisateur connecté',
            'POST /api/auth/forgot-password': 'Mot de passe oublié',
            'POST /api/auth/reset-password': 'Réinitialisation mot de passe',
            'POST /api/auth/logout-all': 'Déconnexion tous appareils',
            'GET /api/auth/stats': 'Statistiques (admin)'
          },
          system: {
            'GET /health': 'Health check du service',
            'GET /api-docs': 'Documentation API'
          }
        }
      });
    });

    // Route 404
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint non trouvé',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  // Gestion globale des erreurs
  setupErrorHandling() {
    this.app.use((err, req, res, next) => {
      console.error('🚨 Erreur non gérée:', err);

      const isDevelopment = process.env.NODE_ENV === 'development';

      res.status(err.status || 500).json({
        success: false,
        message: isDevelopment ? err.message : 'Erreur interne du serveur',
        ...(isDevelopment && { stack: err.stack }),
        timestamp: new Date().toISOString()
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error);
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  // Initialisation de la base de données
  async initializeDatabase() {
    try {
      console.log('🔄 Connexion à la base de données...');
      
      // Connexion PostgreSQL
      await this.database.connectPostgreSQL();
      console.log('✅ PostgreSQL connecté avec succès');
      
      // Connexion Redis
      await this.database.connectRedis();
      console.log('✅ Redis connecté avec succès');
      
      // Initialisation des tables
      try {
        await this.database.initializeTables();
        console.log('✅ Tables initialisées avec succès');
      } catch (error) {
        throw new Error(`Erreur initialisation tables: ${error.message}`);
      }
      
    } catch (error) {
      console.error('❌ Erreur initialisation base de données:', error.message);
      throw error;
    }
  }

  // Tâches de maintenance périodiques
  setupMaintenanceTasks() {
    // Nettoyage des tokens expirés toutes les heures
    setInterval(async () => {
      try {
        console.log('🧹 Démarrage du nettoyage périodique...');
        
        const client = await this.database.pg.connect();
        const result = await client.query(
          'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = true'
        );
        client.release();
        
        const keys = await this.database.redis.keys('blacklist:*');
        let cleanedCount = 0;
        for (const key of keys) {
          const ttl = await this.database.redis.ttl(key);
          if (ttl <= 0) {
            await this.database.redis.del(key);
            cleanedCount++;
          }
        }
        
        console.log(`✅ Nettoyage terminé: ${result.rowCount} tokens DB, ${cleanedCount} entrées cache`);
        
      } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error.message);
      }
    }, 60 * 60 * 1000);

    // Statistiques de santé toutes les 10 minutes
    setInterval(async () => {
      try {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        console.log('📊 Stats système:', {
          memory: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          uptime: `${Math.round(process.uptime())}s`,
          cpu: `${cpuUsage.user + cpuUsage.system}μs`
        });
        
      } catch (error) {
        console.error('❌ Erreur stats système:', error.message);
      }
    }, 10 * 60 * 1000);
  }

  // Démarrage du serveur
  async start() {
    try {
      // IMPORTANT: Initialiser la base de données AVANT les routes
      await this.initializeDatabase();
      
      // Maintenant on peut configurer les routes
      this.setupRoutes();
      
      // Configurer les tâches de maintenance
      this.setupMaintenanceTasks();
      
      // Démarrer le serveur HTTP
      this.server = this.app.listen(this.port, () => {
        console.log(`
🚀 Auth Service démarré avec succès!
📡 Port: ${this.port}
🌍 Environnement: ${process.env.NODE_ENV}
📅 Démarré le: ${new Date().toISOString()}
🔗 Health check: http://localhost:${this.port}/health
📖 API Docs: http://localhost:${this.port}/api-docs
        `);
      });

      this.server.timeout = 30000;
      
    } catch (error) {
      console.error('❌ Erreur démarrage serveur:', error.message);
      process.exit(1);
    }
  }

  // Arrêt gracieux du serveur
  async gracefulShutdown(signal) {
    console.log(`\n🛑 Arrêt gracieux du serveur (${signal})...`);
    
    try {
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        console.log('✅ Serveur HTTP fermé');
      }

      if (this.database) {
        await this.database.close();
        console.log('✅ Connexions base de données fermées');
      }

      if (this.eventPublisher) {
        await this.eventPublisher.close();
        console.log('✅ Event publisher fermé');
      }

      console.log('✅ Arrêt gracieux terminé');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'arrêt gracieux:', error.message);
      process.exit(1);
    }
  }
}

// Démarrage du serveur si ce fichier est exécuté directement
if (require.main === module) {
  const server = new AuthServer();
  server.start().catch(error => {
    console.error('❌ Échec du démarrage:', error.message);
    process.exit(1);
  });
}

module.exports = AuthServer;