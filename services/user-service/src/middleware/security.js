// src/middleware/security.js
const helmet = require('helmet');

// Configuration de sécurité avec helmet
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
});

// Middleware pour ajouter des headers de sécurité personnalisés
const customSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Service', 'user-service');
  res.setHeader('X-Version', process.env.npm_package_version || '1.0.0');
  next();
};

// Middleware pour nettoyer les logs sensibles
const sanitizeLogging = (req, res, next) => {
  // Nettoyer les données sensibles des logs
  if (req.body && req.body.password) {
    req.body.password = '[REDACTED]';
  }
  if (req.body && req.body.token) {
    req.body.token = '[REDACTED]';
  }
  next();
};

module.exports = {
  securityHeaders,
  customSecurityHeaders,
  sanitizeLogging
};