// src/routes/internal.js
const express = require('express');
const profileService = require('../services/ProfileService');
const logger = require('../utils/logger');
const { ValidationError, ConflictError } = require('../utils/errors');

const router = express.Router();

// POST /internal/user-registered - Notification d'inscription utilisateur depuis auth-service
router.post('/user-registered', async (req, res, next) => {
  try {
    const { userId, email, timestamp } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: 'userId and email are required'
      });
    }

    logger.info('Received user registration notification', { userId, email });

    // Créer le profil utilisateur
    const profile = await profileService.createProfile({
      userId,
      email
    });

    logger.info('User profile created from notification', { userId, email });

    res.status(201).json({
      success: true,
      data: profile,
      message: 'User profile created successfully'
    });

  } catch (error) {
    if (error instanceof ConflictError) {
      // Le profil existe déjà, ce n'est pas grave
      logger.info('User profile already exists', { userId: req.body.userId });
      return res.status(200).json({
        success: true,
        message: 'User profile already exists'
      });
    }

    logger.error('Error processing user registration notification:', {
      userId: req.body.userId,
      error: error.message
    });

    next(error);
  }
});

// GET /internal/health - Health check interne
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'user-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
