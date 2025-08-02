// src/app.js - Version minimale pour tester
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware basiques
app.use(cors());
app.use(express.json());

// Routes de test
app.get('/', (req, res) => {
  res.json({
    service: 'User Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    service: 'user-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    dependencies: {
      database: 'not-checked',
      redis: 'not-checked',
      authService: 'not-checked'
    }
  });
});

// Route de fallback
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🎯 User Service running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/v1/health`);
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;