// src/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');
const config = require('../config');

// Rate limiting standard
const generalRateLimit = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting pour les uploads
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads par 15 minutes
  message: {
    success: false,
    message: 'Trop d\'uploads, veuillez réessayer plus tard'
  }
});

// Rate limiting pour les opérations admin
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requêtes par 15 minutes pour les admins
  message: {
    success: false,
    message: 'Limite de requêtes administrateur atteinte'
  }
});

module.exports = {
  generalRateLimit,
  uploadRateLimit,
  adminRateLimit
};

