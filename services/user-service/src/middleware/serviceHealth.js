// src/middleware/serviceHealth.js
const authServiceClient = require('../services/AuthServiceClient');
const logger = require('../utils/logger');

class ServiceHealthMiddleware {
  constructor() {
    this.healthStatus = {
      authService: false,
      lastChecked: null
    };
    
    // Vérification périodique toutes les 30 secondes
    setInterval(() => this.checkServicesHealth(), 30000);
    
    // Vérification initiale
    this.checkServicesHealth();
  }

  async checkServicesHealth() {
    try {
      this.healthStatus.authService = await authServiceClient.healthCheck();
      this.healthStatus.lastChecked = new Date();
      
      if (!this.healthStatus.authService) {
        logger.warn('Auth Service est indisponible');
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification de santé des services:', error.message);
      this.healthStatus.authService = false;
    }
  }

  // Middleware pour vérifier la disponibilité de l'auth service
  checkAuthServiceAvailability() {
    return (req, res, next) => {
      if (!this.healthStatus.authService) {
        return res.status(503).json({
          success: false,
          message: 'Service d\'authentification temporairement indisponible',
          error: 'AUTH_SERVICE_UNAVAILABLE'
        });
      }
      next();
    };
  }

  // Endpoint pour obtenir le statut de santé
  getHealthStatus() {
    return (req, res) => {
      res.json({
        success: true,
        data: {
          userService: true,
          externalServices: this.healthStatus,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      });
    };
  }
}

module.exports = new ServiceHealthMiddleware();
