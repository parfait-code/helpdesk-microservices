// src/controllers/AuthController.js
const AuthService = require('../services/AuthService');
const { body, validationResult } = require('express-validator');

class AuthController {
  constructor(database, redisClient) {
    this.authService = new AuthService(database, redisClient);
  }

  // Middleware de validation pour l'inscription
  validateRegister() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email invalide'),
      body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères'),
      body('confirmPassword')
        .custom((value, { req }) => {
          if (value !== req.body.password) {
            throw new Error('Les mots de passe ne correspondent pas');
          }
          return true;
        })
    ];
  }

  // Middleware de validation pour la connexion
  validateLogin() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email invalide'),
      body('password')
        .notEmpty()
        .withMessage('Mot de passe requis')
    ];
  }

  // Middleware de validation pour le mot de passe oublié
  validateForgotPassword() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email invalide')
    ];
  }

  // Middleware de validation pour la réinitialisation
  validateResetPassword() {
    return [
      body('token')
        .notEmpty()
        .withMessage('Token de réinitialisation requis'),
      body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères'),
      body('confirmPassword')
        .custom((value, { req }) => {
          if (value !== req.body.password) {
            throw new Error('Les mots de passe ne correspondent pas');
          }
          return true;
        })
    ];
  }

  // Inscription
  async register(req, res) {
    try {
      // Vérifier les erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { email, password, confirmPassword } = req.body;
      
      const result = await this.authService.register({
        email,
        password,
        confirmPassword
      });

      res.status(201).json({
        success: true,
        message: 'Compte créé avec succès',
        data: result
      });

    } catch (error) {
      console.error('Erreur inscription:', error);
      
      // Gérer les erreurs spécifiques
      if (error.message.includes('existe déjà')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('mot de passe')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Connexion
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      
      const result = await this.authService.login({
        email,
        password
      });

      // Définir le refresh token comme cookie httpOnly
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
      });

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });

    } catch (error) {
      console.error('Erreur connexion:', error);
      
      // Gérer les erreurs spécifiques
      if (error.message.includes('incorrect') || error.message.includes('verrouillé')) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('désactivé')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  }

  // Déconnexion
  async logout(req, res) {
    try {
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      const refreshToken = req.cookies.refreshToken;

      await this.authService.logout(accessToken, refreshToken);

      // Supprimer le cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Déconnexion réussie'
      });

    } catch (error) {
      console.error('Erreur déconnexion:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la déconnexion'
      });
    }
  }

  // Renouvellement du token
  async refresh(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token manquant'
        });
      }

      const result = await this.authService.refreshToken(refreshToken);

      // Mettre à jour le cookie avec le nouveau refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        message: 'Token renouvelé avec succès',
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });

    } catch (error) {
      console.error('Erreur renouvellement token:', error);
      
      // Supprimer le cookie si le token est invalide
      res.clearCookie('refreshToken');
      
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Vérification du token
  async verify(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token manquant'
        });
      }

      const result = await this.authService.verifyToken(token);

      if (!result.valid) {
        return res.status(401).json({
          success: false,
          message: result.error
        });
      }

      res.json({
        success: true,
        message: 'Token valide',
        data: {
          user: result.user,
          tokenData: result.tokenData
        }
      });

    } catch (error) {
      console.error('Erreur vérification token:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification'
      });
    }
  }

  // Informations utilisateur connecté
  async me(req, res) {
    try {
      const userId = req.user.userId;
      const user = await this.authService.getCurrentUser(userId);

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des informations'
      });
    }
  }

  // Obtenir un utilisateur par ID (pour les autres microservices)
  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'ID utilisateur requis'
        });
      }

      const user = await this.authService.getCurrentUser(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Erreur récupération utilisateur par ID:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des informations utilisateur'
      });
    }
  }

  // Obtenir des utilisateurs par email (pour synchronisation)
  async getUserByEmail(req, res) {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email requis'
        });
      }

      const user = await this.authService.findUserByEmail(email);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Ne pas exposer le mot de passe
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword
      });

    } catch (error) {
      console.error('Erreur récupération utilisateur par email:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des informations utilisateur'
      });
    }
  }

  // Mot de passe oublié
  async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Email invalide',
          errors: errors.array()
        });
      }

      const { email } = req.body;
      const result = await this.authService.forgotPassword(email);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Erreur mot de passe oublié:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la demande de réinitialisation'
      });
    }
  }

  // Réinitialisation du mot de passe
  async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { token, password, confirmPassword } = req.body;
      
      const result = await this.authService.resetPassword(token, password, confirmPassword);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      
      if (error.message.includes('invalide') || error.message.includes('expiré')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('mot de passe')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur lors de la réinitialisation'
      });
    }
  }

  // Déconnexion de tous les appareils
  async logoutAllDevices(req, res) {
    try {
      const userId = req.user.userId;
      
      await this.authService.logoutAllDevices(userId);

      // Supprimer le cookie actuel
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Déconnexion de tous les appareils réussie'
      });

    } catch (error) {
      console.error('Erreur déconnexion tous appareils:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la déconnexion'
      });
    }
  }

  // Statistiques (endpoint admin)
  async getStats(req, res) {
    try {
      // Vérifier les permissions admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }

      // Ici on pourrait ajouter des statistiques
      const stats = {
        message: 'Statistiques d\'authentification',
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur récupération stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  // Vérification de token (pour les autres microservices)
  async verify(req, res) {
    try {
      console.log('🔍 Verify endpoint called');
      const authHeader = req.headers.authorization;
      console.log('🔍 Auth header:', authHeader ? authHeader.substring(0, 50) + '...' : 'null');
      
      if (!authHeader) {
        console.log('❌ No auth header');
        return res.status(401).json({
          success: false,
          message: 'Token d\'authentification manquant'
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        console.log('❌ Invalid auth header format');
        return res.status(401).json({
          success: false,
          message: 'Format de token invalide'
        });
      }

      const token = authHeader.substring(7);
      console.log('🔍 Token extracted:', token ? token.substring(0, 50) + '...' : 'null');
      
      const verificationResult = await this.authService.verifyToken(token);
      console.log('🔍 Verification result:', verificationResult);
      
      if (!verificationResult.isValid) {
        console.log('❌ Token invalid:', verificationResult.error);
        return res.status(401).json({
          success: false,
          message: verificationResult.error || 'Token invalide'
        });
      }

      console.log('✅ Token valid');
      res.json({
        success: true,
        data: {
          user: verificationResult.user,
          token: {
            valid: true,
            expiresAt: verificationResult.expiresAt
          }
        }
      });

    } catch (error) {
      console.error('Erreur vérification token:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification du token'
      });
    }
  }

  // Health check
  async health(req, res) {
    try {
      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '1.0.0'
      };

      res.json(health);

    } catch (error) {
      console.error('Erreur health check:', error);
      res.status(500).json({
        status: 'ERROR',
        message: error.message
      });
    }
  }
}

module.exports = AuthController;