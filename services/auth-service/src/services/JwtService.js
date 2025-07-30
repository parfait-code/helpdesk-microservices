// src/services/JwtService.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class JwtService {
  constructor(redisClient) {
    this.redis = redisClient;
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN;
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN;
  }

  // Générer un access token
  generateAccessToken(payload) {
    const tokenPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'auth-service',
      audience: 'client-app'
    });
  }

  // Générer un refresh token
  generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  // Vérifier un access token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'auth-service',
        audience: 'client-app'
      });
    } catch (error) {
      throw new Error(`Token invalide: ${error.message}`);
    }
  }

  // Décoder un token sans vérification (pour debug)
  decodeToken(token) {
    return jwt.decode(token);
  }

  // Hasher un refresh token pour le stockage
  hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Calculer l'expiration du refresh token
  getRefreshTokenExpiration() {
    const duration = this.refreshTokenExpiresIn;
    const now = new Date();
    
    // Parse duration (ex: "7d", "24h", "30m")
    const match = duration.match(/^(\d+)([dhm])$/);
    if (!match) {
      throw new Error('Format de durée invalide');
    }
    
    const [, amount, unit] = match;
    const milliseconds = {
      'd': parseInt(amount) * 24 * 60 * 60 * 1000,
      'h': parseInt(amount) * 60 * 60 * 1000,
      'm': parseInt(amount) * 60 * 1000
    }[unit];
    
    return new Date(now.getTime() + milliseconds);
  }

  // Stocker un token en blacklist (pour déconnexion)
  async blacklistToken(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return;

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.setex(`blacklist:${token}`, ttl, 'true');
      }
    } catch (error) {
      console.error('Erreur blacklist token:', error.message);
    }
  }

  // Vérifier si un token est en blacklist
  async isTokenBlacklisted(token) {
    try {
      const result = await this.redis.get(`blacklist:${token}`);
      return result !== null;
    } catch (error) {
      console.error('Erreur vérification blacklist:', error.message);
      return false;
    }
  }

  // Stocker des données de session
  async storeSession(userId, sessionData, ttl = 86400) {
    const sessionId = uuidv4();
    const key = `session:${userId}:${sessionId}`;
    
    await this.redis.setex(key, ttl, JSON.stringify({
      ...sessionData,
      sessionId,
      createdAt: new Date().toISOString()
    }));
    
    return sessionId;
  }

  // Récupérer une session
  async getSession(userId, sessionId) {
    const key = `session:${userId}:${sessionId}`;
    const data = await this.redis.get(key);
    
    return data ? JSON.parse(data) : null;
  }

  // Supprimer une session
  async deleteSession(userId, sessionId) {
    const key = `session:${userId}:${sessionId}`;
    return await this.redis.del(key);
  }

  // Supprimer toutes les sessions d'un utilisateur
  async deleteAllUserSessions(userId) {
    const pattern = `session:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      return await this.redis.del(...keys);
    }
    
    return 0;
  }

  // Générer une paire de tokens complète
  async generateTokenPair(userPayload) {
    const accessToken = this.generateAccessToken(userPayload);
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = this.getRefreshTokenExpiration();

    return {
      accessToken,
      refreshToken,
      refreshTokenHash,
      expiresAt
    };
  }

  // Nettoyer les tokens expirés du cache
  async cleanupExpiredTokens() {
    try {
      const pattern = 'blacklist:*';
      const keys = await this.redis.keys(pattern);
      
      let cleanedCount = 0;
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
          cleanedCount++;
        }
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Erreur nettoyage tokens:', error.message);
      return 0;
    }
  }
}

module.exports = JwtService;