// src/middleware/auth.js
const axios = require('axios');
const config = require('../config');

// Middleware d'authentification basique
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Vérification du token avec le auth-service
    // Pour l'instant, on simule une vérification basique
    // À remplacer par un appel au auth-service quand il sera disponible
    if (process.env.NODE_ENV === 'development') {
      // Mode développement - authentification simulée
      req.user = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        role: 'user'
      };
      return next();
    }

    try {
      // Appel au auth-service pour valider le token
      const authResponse = await axios.get(`${config.authService.url}/api/v1/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000
      });

      if (authResponse.data.success) {
        req.user = authResponse.data.user;
        next();
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    } catch (authError) {
      console.error('Auth service error:', authError.message);
      return res.status(503).json({
        success: false,
        message: 'Authentication service unavailable'
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Middleware optionnel d'authentification (n'échoue pas si pas de token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(); // Continuer sans utilisateur authentifié
    }

    // Même logique que authenticate mais sans échouer
    if (process.env.NODE_ENV === 'development') {
      req.user = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        role: 'user'
      };
      return next();
    }

    try {
      const authResponse = await axios.get(`${config.authService.url}/api/v1/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000
      });

      if (authResponse.data.success) {
        req.user = authResponse.data.user;
      }
    } catch (authError) {
      console.warn('Optional auth failed:', authError.message);
      // Ne pas échouer, continuer sans utilisateur
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continuer même en cas d'erreur
  }
};

module.exports = {
  authenticate,
  optionalAuth
};
