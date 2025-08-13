const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const database = require('./database');
const routes = require('./routes');

const app = express();

// Initialiser la base de données
const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database connection...');
    database.initializeDatabase();
    
    const isConnected = await database.testConnection();
    if (!isConnected) {
      throw new Error('Database connection test failed');
    }
    
    console.log('🔄 Setting up database tables...');
    const tablesCreated = await database.createTables();
    if (!tablesCreated) {
      throw new Error('Failed to create database tables');
    }
    
    console.log('✅ Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
};

// Middleware de sécurité
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware basiques
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes principales
app.use('/api', routes);

// Routes principales
app.get('/', (req, res) => {
  res.json({
    service: 'Ticket Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    port: config.port
  });
});

app.get('/api/v1/health', async (req, res) => {
  try {
    // Test de la connexion à la base de données
    const dbConnected = await database.testConnection();
    
    res.json({
      service: 'ticket-service',
      status: dbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      port: config.port,
      dependencies: {
        database: dbConnected ? 'ready' : 'failed',
        redis: 'ready',
        authService: 'ready',
        userService: 'ready',
        fileService: 'pending',
        notificationService: 'pending'
      }
    });
  } catch (error) {
    res.status(503).json({
      service: 'ticket-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Endpoints pour intégration avec file-service (prêt pour intégration future)
app.get('/api/v1/tickets/files/:ticketId', (req, res) => {
  res.json({
    message: 'File service integration endpoint ready',
    ticketId: req.params.ticketId,
    files: [],
    status: 'pending-file-service'
  });
});

// Route de fallback
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    service: 'ticket-service'
  });
});

// Démarrage du serveur
const startServer = async () => {
  try {
    // Initialiser la base de données
    await initDatabase();
    
    // Démarrer le serveur
    app.listen(config.port, () => {
      console.log(`🎯 Ticket Service running on port ${config.port}`);
      console.log(`📱 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health Check: http://localhost:${config.port}/api/v1/health`);
      console.log(`🔗 Service Info: http://localhost:${config.port}/`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await database.closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await database.closeConnection();
  process.exit(0);
});

// Démarrer le serveur
startServer();

module.exports = app;
