// src/services/AuthService.js
const { User, RefreshToken } = require('../models');
const JwtService = require('./JwtService');
const CryptoService = require('./CryptoService');
const EventPublisher = require('./EventPublisher');

class AuthService {
  constructor(database, redisClient) {
    this.userModel = new User(database.pg);
    this.refreshTokenModel = new RefreshToken(database.pg);
    this.jwtService = new JwtService(redisClient);
    this.cryptoService = new CryptoService();
    this.eventPublisher = new EventPublisher();
  }

  // Inscription d'un nouvel utilisateur
  async register({ email, password, confirmPassword }) {
    // Validation des mots de passe
    if (password !== confirmPassword) {
      throw new Error('Les mots de passe ne correspondent pas');
    }

    // Validation force du mot de passe
    this.cryptoService.validatePasswordStrength(password);

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.userModel.findByEmail(email);
    if (existingUser) {
      throw new Error('Un compte existe déjà avec cet email');
    }

    try {
      // Créer l'utilisateur
      const user = await this.userModel.create({
        email: email.toLowerCase(),
        password,
        role: 'user'
      });

      // Publier l'événement
      await this.eventPublisher.publish('user.registered', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      // Générer les tokens
      const tokenPair = await this.jwtService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Sauvegarder le refresh token
      await this.refreshTokenModel.create(
        user.id,
        tokenPair.refreshTokenHash,
        tokenPair.expiresAt
      );

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      throw new Error('Erreur lors de la création du compte');
    }
  }

  // Connexion utilisateur
  async login({ email, password }) {
    const user = await this.userModel.findByEmail(email.toLowerCase());
    
    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }

    if (!user.is_active) {
      throw new Error('Compte désactivé');
    }

    // Vérifier si le compte est verrouillé
    if (await this.userModel.isLocked(user.id)) {
      throw new Error('Compte temporairement verrouillé suite à trop de tentatives');
    }

    // Vérifier le mot de passe
    const isValidPassword = await this.userModel.verifyPassword(user, password);
    
    if (!isValidPassword) {
      // Incrémenter les tentatives échouées
      await this.userModel.incrementFailedAttempts(user.id);
      throw new Error('Email ou mot de passe incorrect');
    }

    try {
      // Réinitialiser les tentatives et mettre à jour la dernière connexion
      await this.userModel.resetFailedAttempts(user.id);
      await this.userModel.updateLastLogin(user.id);

      // Générer les tokens
      const tokenPair = await this.jwtService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Sauvegarder le refresh token
      await this.refreshTokenModel.create(
        user.id,
        tokenPair.refreshTokenHash,
        tokenPair.expiresAt
      );

      // Publier l'événement
      await this.eventPublisher.publish('user.login', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw new Error('Erreur lors de la connexion');
    }
  }

  // Déconnexion
  async logout(accessToken, refreshToken) {
    try {
      // Blacklister l'access token
      await this.jwtService.blacklistToken(accessToken);

      // Révoquer le refresh token
      if (refreshToken) {
        const tokenHash = this.jwtService.hashRefreshToken(refreshToken);
        await this.refreshTokenModel.revoke(tokenHash);
      }

      // Publier l'événement
      const decoded = this.jwtService.decodeToken(accessToken);
      if (decoded) {
        await this.eventPublisher.publish('user.logout', {
          userId: decoded.userId,
          timestamp: new Date().toISOString()
        });
      }

      return { success: true };

    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      throw new Error('Erreur lors de la déconnexion');
    }
  }

  // Renouvellement du token
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token requis');
    }

    try {
      const tokenHash = this.jwtService.hashRefreshToken(refreshToken);
      const tokenData = await this.refreshTokenModel.findByTokenHash(tokenHash);

      if (!tokenData) {
        throw new Error('Refresh token invalide');
      }

      if (tokenData.is_revoked) {
        throw new Error('Refresh token révoqué');
      }

      if (new Date() > new Date(tokenData.expires_at)) {
        throw new Error('Refresh token expiré');
      }

      if (!tokenData.is_active) {
        throw new Error('Compte utilisateur désactivé');
      }

      // Révoquer l'ancien token
      await this.refreshTokenModel.revoke(tokenHash);

      // Générer une nouvelle paire de tokens
      const tokenPair = await this.jwtService.generateTokenPair({
        userId: tokenData.user_id,
        email: tokenData.email,
        role: tokenData.role
      });

      // Sauvegarder le nouveau refresh token
      await this.refreshTokenModel.create(
        tokenData.user_id,
        tokenPair.refreshTokenHash,
        tokenPair.expiresAt
      );

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        user: {
          id: tokenData.user_id,
          email: tokenData.email,
          role: tokenData.role
        }
      };

    } catch (error) {
      console.error('Erreur renouvellement token:', error);
      throw error;
    }
  }

  // Vérification du token
  async verifyToken(token) {
    try {
      // Vérifier si le token est en blacklist
      if (await this.jwtService.isTokenBlacklisted(token)) {
        throw new Error('Token révoqué');
      }

      // Vérifier la validité du token
      const decoded = this.jwtService.verifyAccessToken(token);

      // Vérifier que l'utilisateur existe toujours
      const user = await this.userModel.findById(decoded.userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (!user.is_active) {
        throw new Error('Compte désactivé');
      }

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        tokenData: decoded
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Récupérer les informations de l'utilisateur connecté
  async getCurrentUser(userId) {
    try {
      const user = await this.userModel.findById(userId);
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login
      };

    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      throw error;
    }
  }

  // Mot de passe oublié
  async forgotPassword(email) {
    try {
      const user = await this.userModel.findByEmail(email.toLowerCase());
      
      if (!user) {
        // Ne pas révéler si l'email existe ou non
        return { success: true, message: 'Si cet email existe, un lien de réinitialisation a été envoyé' };
      }

      // Générer un token de réinitialisation
      const resetToken = this.cryptoService.generateResetToken();
      const resetTokenHash = this.cryptoService.hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Stocker le token dans Redis
      await this.jwtService.redis.setex(
        `reset:${resetTokenHash}`,
        900, // 15 minutes
        JSON.stringify({
          userId: user.id,
          email: user.email,
          createdAt: new Date().toISOString()
        })
      );

      // Publier l'événement pour l'envoi d'email
      await this.eventPublisher.publish('user.password_reset_requested', {
        userId: user.id,
        email: user.email,
        resetToken,
        expiresAt: expiresAt.toISOString(),
        timestamp: new Date().toISOString()
      });

      return { 
        success: true, 
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé' 
      };

    } catch (error) {
      console.error('Erreur mot de passe oublié:', error);
      throw new Error('Erreur lors de la demande de réinitialisation');
    }
  }

  // Réinitialisation du mot de passe
  async resetPassword(token, newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
      throw new Error('Les mots de passe ne correspondent pas');
    }

    // Validation force du mot de passe
    this.cryptoService.validatePasswordStrength(newPassword);

    try {
      const tokenHash = this.cryptoService.hashToken(token);
      const resetData = await this.jwtService.redis.get(`reset:${tokenHash}`);

      if (!resetData) {
        throw new Error('Token de réinitialisation invalide ou expiré');
      }

      const { userId, email } = JSON.parse(resetData);

      // Vérifier que l'utilisateur existe
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Hasher le nouveau mot de passe
      const passwordHash = await this.cryptoService.hashPassword(newPassword);

      // Mettre à jour le mot de passe
      const client = await this.userModel.db.connect();
      try {
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [passwordHash, userId]
        );
      } finally {
        client.release();
      }

      // Supprimer le token de réinitialisation
      await this.jwtService.redis.del(`reset:${tokenHash}`);

      // Révoquer tous les refresh tokens existants
      await this.refreshTokenModel.revokeAllForUser(userId);

      // Supprimer toutes les sessions actives
      await this.jwtService.deleteAllUserSessions(userId);

      // Publier l'événement
      await this.eventPublisher.publish('user.password_reset_completed', {
        userId,
        email,
        timestamp: new Date().toISOString()
      });

      return { success: true, message: 'Mot de passe réinitialisé avec succès' };

    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      throw error;
    }
  }

  // Déconnexion de tous les appareils
  async logoutAllDevices(userId) {
    try {
      // Révoquer tous les refresh tokens
      await this.refreshTokenModel.revokeAllForUser(userId);

      // Supprimer toutes les sessions
      await this.jwtService.deleteAllUserSessions(userId);

      // Publier l'événement
      await this.eventPublisher.publish('user.logout_all_devices', {
        userId,
        timestamp: new Date().toISOString()
      });

      return { success: true };

    } catch (error) {
      console.error('Erreur déconnexion tous appareils:', error);
      throw new Error('Erreur lors de la déconnexion');
    }
  }

  // Nettoyage périodique
  async cleanup() {
    try {
      const expiredTokens = await this.refreshTokenModel.cleanExpired();
      const cleanedCache = await this.jwtService.cleanupExpiredTokens();

      console.log(`Nettoyage effectué: ${expiredTokens} tokens expirés, ${cleanedCache} entrées cache supprimées`);

      return { expiredTokens, cleanedCache };

    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      return { expiredTokens: 0, cleanedCache: 0 };
    }
  }
}

module.exports = AuthService;