// src/middleware/auth.js
const authServiceClient = require('../services/AuthServiceClient');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

class AuthMiddleware {
  // Middleware d'authentification principal
  static authenticate() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
          return next(new UnauthorizedError('Token d\'authentification manquant'));
        }

        if (!authHeader.startsWith('Bearer ')) {
          return next(new UnauthorizedError('Format de token invalide'));
        }

        const token = authHeader.substring(7);

        // Vérifier le token via l'Auth Service
        const authResult = await authServiceClient.verifyToken(token);
        
        if (!authResult.success) {
          return next(new UnauthorizedError(authResult.error || 'Token invalide'));
        }

        // Ajouter les informations utilisateur à la requête
        req.user = authResult.user;
        req.token = token;
        
        // Log de l'activité si activé
        if (req.user) {
          logger.info('User authenticated', {
            userId: req.user.userId,
            email: req.user.email,
            role: req.user.role,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
            method: req.method
          });
        }

        next();
      } catch (error) {
        logger.error('Authentication error:', {
          error: error.message,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip
        });

        if (error.message === 'Auth Service unavailable') {
          return res.status(503).json({
            success: false,
            message: 'Service d\'authentification temporairement indisponible'
          });
        }

        return next(new UnauthorizedError('Erreur d\'authentification'));
      }
    };
  }

  // Middleware d'autorisation par rôle
  static authorize(roles = []) {
    if (typeof roles === 'string') {
      roles = [roles];
    }

    return (req, res, next) => {
      if (!req.user) {
        return next(new UnauthorizedError('Authentification requise'));
      }

      if (roles.length === 0) {
        return next();
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('Authorization failed', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: roles,
          url: req.originalUrl,
          method: req.method
        });

        return next(new ForbiddenError('Permissions insuffisantes'));
      }

      next();
    };
  }

  // Middleware pour vérifier si l'utilisateur peut accéder à ses propres données
  static checkOwnership() {
    return (req, res, next) => {
      const userId = req.params.id || req.params.userId;
      
      // Les admins peuvent accéder à tout
      if (req.user.role === 'admin') {
        return next();
      }

      // Les utilisateurs ne peuvent accéder qu'à leurs propres données
      if (req.user.userId !== userId) {
        return next(new ForbiddenError('Accès non autorisé à ces données'));
      }

      next();
    };
  }

  // Middleware optionnel (utilisateur connecté ou non)
  static optionalAuth() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return next();
        }

        const token = authHeader.substring(7);
        const authResult = await authServiceClient.verifyToken(token);
        
        if (authResult.success) {
          req.user = authResult.user;
          req.token = token;
        }
        
        next();
      } catch (error) {
        // En cas d'erreur, on continue sans utilisateur authentifié
        logger.warn('Optional auth failed:', error.message);
        next();
      }
    };
  }
}

module.exports = AuthMiddleware;

