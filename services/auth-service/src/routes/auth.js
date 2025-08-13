// src/routes/auth.js
const express = require('express');
const AuthController = require('../controllers/AuthController');
const AuthMiddleware = require('../middleware/auth');

class AuthRoutes {
  constructor(database, redisClient) {
    this.router = express.Router();
    this.authController = new AuthController(database, redisClient);
    this.authMiddleware = new AuthMiddleware(redisClient);
    
    this.setupRoutes();
  }

  setupRoutes() {
    // Rate limiting pour les routes d'authentification
    const authRateLimit = this.authMiddleware.createAuthRateLimit();
    const generalRateLimit = this.authMiddleware.createGeneralRateLimit();

    // Middleware communs
    this.router.use(this.authMiddleware.securityHeaders());
    this.router.use(this.authMiddleware.sanitizeLogging());
    this.router.use(generalRateLimit);

    // Routes publiques (sans authentification)
    
    // POST /auth/register - Inscription
    this.router.post('/register',
      authRateLimit,
      this.authController.validateRegister(),
      this.authController.register.bind(this.authController)
    );

    // POST /auth/login - Connexion
    this.router.post('/login',
      authRateLimit,
      this.authController.validateLogin(),
      this.authController.login.bind(this.authController)
    );

    // POST /auth/forgot-password - Mot de passe oublié
    this.router.post('/forgot-password',
      authRateLimit,
      this.authController.validateForgotPassword(),
      this.authController.forgotPassword.bind(this.authController)
    );

    // POST /auth/reset-password - Réinitialisation mot de passe
    this.router.post('/reset-password',
      authRateLimit,
      this.authController.validateResetPassword(),
      this.authController.resetPassword.bind(this.authController)
    );

    // POST /auth/refresh - Renouvellement token
    this.router.post('/refresh',
      this.authMiddleware.validateRefreshToken(),
      this.authController.refresh.bind(this.authController)
    );

    // GET /auth/verify - Vérification token (peut être public pour certains cas)
    this.router.get('/verify',
      this.authController.verify.bind(this.authController)
    );

    // Health check
    this.router.get('/health',
      this.authController.health.bind(this.authController)
    );

    // Routes protégées (authentification requise)
    
    // POST /auth/logout - Déconnexion
    this.router.post('/logout',
      this.authMiddleware.authenticate(),
      this.authMiddleware.logAuthenticatedRequests(),
      this.authController.logout.bind(this.authController)
    );

    // GET /auth/me - Informations utilisateur connecté
    this.router.get('/me',
      this.authMiddleware.authenticate(),
      this.authMiddleware.checkTokenExpiry(),
      this.authMiddleware.logAuthenticatedRequests(),
      this.authController.me.bind(this.authController)
    );

    // GET /auth/users/:userId - Informations utilisateur par ID (pour les microservices)
    this.router.get('/users/:userId',
      this.authMiddleware.authenticate(),
      this.authMiddleware.checkTokenExpiry(),
      this.authMiddleware.logAuthenticatedRequests(),
      this.authController.getUserById.bind(this.authController)
    );

    // GET /auth/users/email/:email - Informations utilisateur par email (pour synchronisation)
    this.router.get('/users/email/:email',
      this.authMiddleware.authenticate(),
      this.authMiddleware.checkTokenExpiry(),
      this.authMiddleware.logAuthenticatedRequests(),
      this.authController.getUserByEmail.bind(this.authController)
    );

    // POST /auth/logout-all - Déconnexion de tous les appareils
    this.router.post('/logout-all',
      this.authMiddleware.authenticate(),
      this.authMiddleware.logAuthenticatedRequests(),
      this.authController.logoutAllDevices.bind(this.authController)
    );

    // Routes administrateur
    
    // GET /auth/stats - Statistiques (admin seulement)
    this.router.get('/stats',
      this.authMiddleware.authenticate(),
      this.authMiddleware.authorize(['admin']),
      this.authMiddleware.auditTrail(),
      this.authController.getStats.bind(this.authController)
    );

    // Middleware de gestion d'erreurs pour les routes
    this.router.use(this.errorHandler.bind(this));
  }

  // Gestionnaire d'erreurs spécifique aux routes d'auth
  errorHandler(err, req, res, next) {
    console.error('Erreur dans les routes auth:', err);

    // Erreurs de validation JWT
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
    }

    // Erreurs de base de données
    if (err.code === '23505') { // Violation de contrainte unique PostgreSQL
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Erreur générique
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' 
        ? 'Erreur interne du serveur' 
        : err.message
    });
  }

  // Obtenir le routeur configuré
  getRouter() {
    return this.router;
  }
}

module.exports = AuthRoutes;