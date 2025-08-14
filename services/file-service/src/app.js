const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Configuration
const config = require('./config');
const logger = require('./utils/logger');

// Services
const database = require('./database');
const minioService = require('./services/minioService');

// Routes
const routes = require('./routes');

class FileServiceApp {
    constructor() {
        this.app = express();
        this.server = null;
        this.isShuttingDown = false;
    }

    async initialize() {
        try {
            // Initialiser les services
            await this.initializeServices();
            
            // Configurer l'application
            this.configureMiddleware();
            this.configureRoutes();
            this.configureErrorHandling();
            
            logger.info('✅ File Service application initialized successfully');
            
        } catch (error) {
            logger.error('❌ Failed to initialize File Service application:', error);
            throw error;
        }
    }

    async initializeServices() {
        try {
            // Connecter à la base de données
            await database.connect();
            
            // Initialiser MinIO
            await minioService.initialize();
            
            logger.info('✅ All services initialized successfully');
            
        } catch (error) {
            logger.error('❌ Failed to initialize services:', error);
            throw error;
        }
    }

    configureMiddleware() {
        // Sécurité
        this.app.use(helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            contentSecurityPolicy: false // Désactiver pour les uploads de fichiers
        }));

        // CORS
        this.app.use(cors({
            origin: config.security.corsOrigin,
            credentials: true,
            optionsSuccessStatus: 200
        }));

        // Compression
        this.app.use(compression());

        // Body parsing
        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: config.rateLimit.windowMs,
            max: config.rateLimit.maxRequests,
            message: {
                success: false,
                error: 'Trop de requêtes, veuillez réessayer plus tard',
                retry_after: Math.ceil(config.rateLimit.windowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false
        });

        this.app.use('/api/', limiter);

        // Trust proxy (pour les reverse proxies)
        this.app.set('trust proxy', 1);

        // Request logging
        this.app.use(logger.requestLogger);

        // Créer le répertoire logs s'il n'existe pas
        const fs = require('fs');
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    }

    configureRoutes() {
        // Routes API
        this.app.use('/api/v1', routes);

        // Route de base
        this.app.get('/', (req, res) => {
            res.json({
                success: true,
                service: 'file-service',
                version: '1.0.0',
                message: 'File Service is running',
                timestamp: new Date().toISOString(),
                endpoints: {
                    api: '/api/v1',
                    health: '/api/v1/health',
                    info: '/api/v1/info',
                    upload: 'POST /api/v1/files/upload'
                }
            });
        });

        // Favicon
        this.app.get('/favicon.ico', (req, res) => {
            res.status(204).end();
        });
    }

    configureErrorHandling() {
        // Gestion des erreurs 404
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint non trouvé',
                path: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        });

        // Gestion globale des erreurs
        this.app.use((error, req, res, next) => {
            logger.error('Unhandled error:', {
                error: error.message,
                stack: error.stack,
                path: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Ne pas exposer les détails de l'erreur en production
            const isDevelopment = config.server.env === 'development';
            
            res.status(error.status || 500).json({
                success: false,
                error: error.message || 'Erreur interne du serveur',
                ...(isDevelopment && { stack: error.stack }),
                timestamp: new Date().toISOString()
            });
        });

        // Gestion des rejets de promesses non capturées
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Promise Rejection:', {
                reason: reason instanceof Error ? reason.message : reason,
                stack: reason instanceof Error ? reason.stack : undefined
            });
        });

        // Gestion des exceptions non capturées
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', {
                error: error.message,
                stack: error.stack
            });
            
            // Arrêt gracieux
            this.shutdown('uncaughtException');
        });
    }

    async start() {
        try {
            if (!this.server) {
                this.server = this.app.listen(config.server.port, () => {
                    logger.info(`🚀 File Service started successfully`);
                    logger.info(`📡 Server running on port ${config.server.port}`);
                    logger.info(`🌍 Environment: ${config.server.env}`);
                    logger.info(`📁 MinIO Bucket: ${config.minio.bucketName}`);
                    logger.info(`🔗 Health check: http://localhost:${config.server.port}/api/v1/health`);
                });

                // Gestion de l'arrêt gracieux
                this.setupGracefulShutdown();
            }
            
        } catch (error) {
            logger.error('❌ Failed to start server:', error);
            throw error;
        }
    }

    setupGracefulShutdown() {
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        
        signals.forEach(signal => {
            process.on(signal, () => {
                logger.info(`Received ${signal}, starting graceful shutdown...`);
                this.shutdown(signal);
            });
        });
    }

    async shutdown(signal = 'SHUTDOWN') {
        if (this.isShuttingDown) {
            logger.warn('Shutdown already in progress...');
            return;
        }

        this.isShuttingDown = true;
        logger.info(`🛑 Starting graceful shutdown (${signal})...`);

        try {
            // Arrêter d'accepter de nouvelles connexions
            if (this.server) {
                this.server.close(() => {
                    logger.info('HTTP server closed');
                });
            }

            // Fermer les connexions aux services
            await database.disconnect();
            logger.info('Database connections closed');

            logger.info('✅ Graceful shutdown completed');
            process.exit(0);

        } catch (error) {
            logger.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }

    // Méthode pour obtenir l'instance Express (utile pour les tests)
    getApp() {
        return this.app;
    }

    // Méthode pour vérifier si le serveur est démarré
    isRunning() {
        return this.server && this.server.listening;
    }
}

// Export de la classe et création d'une instance par défaut
const fileServiceApp = new FileServiceApp();

module.exports = fileServiceApp;
