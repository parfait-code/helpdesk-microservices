// src/middleware/auth.js
const JwtService = require('../services/JwtService');
const rateLimit = require('express-rate-limit');

class AuthMiddleware {
  constructor(redisClient) {
    this.jwtService = new JwtService(redisClient);
  }

  // Middleware d'authentification
  authenticate() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
          return res.status(401).json({
            success: false,
            message: 'Token d\'authentification manquant'
          });
        }

        if (!authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            message: 'Format de token invalide'
          });
        }

        const token = authHeader.substring(7);

        // Vérifier si le token est en blacklist
        if (await this.jwtService.isTokenBlacklisted(token)) {
          return res.status(401).json({
            success: false,
            message: 'Token révoqué'
          });
        }

        // Vérifier la validité du token
        const decoded = this.jwtService.verifyAccessToken(token);

        // Ajouter les informations utilisateur à la requête
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          iat: decoded.iat,
          exp: decoded.exp
        };

        req.token = token;
        next();

      } catch (error) {
        console.error('Erreur authentification:', error.message);
        return res.status(401).json({
          success: false,
          message: 'Token invalide ou expiré'
        });
      }
    };
  }

  // Middleware d'autorisation par rôle
  authorize(roles = []) {
    if (typeof roles === 'string') {
      roles = [roles];
    }

    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      if (roles.length === 0) {
        return next();
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Permissions insuffisantes'
        });
      }

      next();
    };
  }

  // Middleware optionnel (utilisateur connecté ou non)
  optionalAuth() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          req.user = null;
          return next();
        }

        const token = authHeader.substring(7);

        // Vérifier si le token est en blacklist
        if (await this.jwtService.isTokenBlacklisted(token)) {
          req.user = null;
          return next();
        }

        try {
          const decoded = this.jwtService.verifyAccessToken(token);
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            iat: decoded.iat,
            exp: decoded.exp
          };
          req.token = token;
        } catch (error) {
          req.user = null;
        }

        next();

      } catch (error) {
        req.user = null;
        next();
      }
    };
  }

  // Rate limiting pour l'authentification
  createAuthRateLimit() {
    return rateLimit({
      windowMs: 3 * 60 * 1000, // 15 minutes
      max: 15, // 5 tentatives par fenêtre
      message: {
        success: false,
        message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
        });
      }
    });
  }

  // Rate limiting général
  createGeneralRateLimit() {
    return rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: {
        success: false,
        message: 'Trop de requêtes. Réessayez plus tard.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  // Middleware de validation du refresh token
  validateRefreshToken() {
    return async (req, res, next) => {
      try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
          return res.status(401).json({
            success: false,
            message: 'Refresh token manquant'
          });
        }

        req.refreshToken = refreshToken;
        next();

      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Format de refresh token invalide'
        });
      }
    };
  }

  // Middleware de logging des requêtes authentifiées
  logAuthenticatedRequests() {
    return (req, res, next) => {
      if (req.user) {
        console.log(`🔐 [AUTH] ${req.method} ${req.path} - User: ${req.user.email} (${req.user.role})`);
      }
      next();
    };
  }

  // Middleware de vérification de l'expiration du token
  checkTokenExpiry() {
    return (req, res, next) => {
      if (req.user && req.user.exp) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = req.user.exp - now;

        // Si le token expire dans moins de 5 minutes, ajouter un header
        if (timeUntilExpiry < 300) {
          res.setHeader('X-Token-Expires-Soon', 'true');
          res.setHeader('X-Token-Expires-In', timeUntilExpiry.toString());
        }
      }
      next();
    };
  }

  // Middleware de sécurité pour les headers
  securityHeaders() {
    return (req, res, next) => {
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // XSS Protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Referrer Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Content Security Policy
      res.setHeader('Content-Security-Policy', "default-src 'self'");

      next();
    };
  }

  // Middleware de validation de l'origine
  validateOrigin() {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];

    return (req, res, next) => {
      const origin = req.headers.origin;

      if (req.method === 'OPTIONS') {
        return next();
      }

      if (origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({
          success: false,
          message: 'Origine non autorisée'
        });
      }

      next();
    };
  }

  // Middleware de nettoyage des données sensibles dans les logs
  sanitizeLogging() {
    return (req, res, next) => {
      // Supprimer les mots de passe des logs
      if (req.body && req.body.password) {
        const sanitizedBody = { ...req.body };
        sanitizedBody.password = '***';
        sanitizedBody.confirmPassword = '***';
        req.sanitizedBody = sanitizedBody;
      }

      next();
    };
  }

  // Middleware d'audit trail
  auditTrail() {
    return (req, res, next) => {
      const auditData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        userId: req.user?.userId,
        sessionId: req.headers['x-session-id']
      };

      // En production, sauvegarder dans une base de données d'audit
      if (process.env.NODE_ENV === 'production') {
        console.log('🔍 [AUDIT]', JSON.stringify(auditData));
      }

      next();
    };
  }
}

module.exports = AuthMiddleware;