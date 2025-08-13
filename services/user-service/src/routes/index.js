// src/routes/index.js
const express = require('express');
const profileRoutes = require('./profile');
const adminRoutes = require('./admin');
const internalRoutes = require('./internal');
const authServiceClient = require('../services/AuthServiceClient');

const router = express.Router();

// Routes internes (sans authentification)
router.use('/internal', internalRoutes);

// Routes de profil utilisateur
router.use('/users', profileRoutes);

// Routes d'administration des utilisateurs
router.use('/users', adminRoutes);

// Health check
router.get('/health', async (req, res) => {
  const health = {
    service: 'user-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    dependencies: {
      database: 'connected',
      redis: 'connected',
      authService: await authServiceClient.healthCheck() ? 'connected' : 'disconnected'
    }
  };

  const statusCode = Object.values(health.dependencies).includes('disconnected') ? 503 : 200;
  res.status(statusCode).json(health);
});

// API Info
router.get('/', (req, res) => {
  res.json({
    service: 'User Service',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Service de gestion des profils utilisateurs',
    endpoints: {
      profile: {
        'GET /users/profile': 'Obtenir son profil',
        'PUT /users/profile': 'Mettre à jour son profil',
        'POST /users/avatar': 'Upload avatar',
        'DELETE /users/avatar': 'Supprimer avatar',
        'GET /users/activities': 'Historique des activités'
      },
      admin: {
        'GET /users': 'Liste des utilisateurs (admin)',
        'GET /users/:id': 'Détails utilisateur (admin)',
        'PUT /users/:id': 'Modifier utilisateur (admin)',
        'DELETE /users/:id': 'Supprimer utilisateur (admin)',
        'PUT /users/:id/role': 'Changer rôle (admin)',
        'GET /users/stats': 'Statistiques (admin)'
      }
    }
  });
});

module.exports = router;

