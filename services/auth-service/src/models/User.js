// src/models/User.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(db) {
    this.db = db;
  }

  // Créer un nouvel utilisateur
  async create({ email, password, role = 'user' }) {
    const client = await this.db.connect();
    
    try {
      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS));
      
      const result = await client.query(
        `INSERT INTO users (email, password_hash, role, created_at, updated_at) 
         VALUES ($1, $2, $3, NOW(), NOW()) 
         RETURNING id, email, role, is_active, email_verified, created_at`,
        [email, passwordHash, role]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Trouver un utilisateur par email
  async findByEmail(email) {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Trouver un utilisateur par ID
  async findById(id) {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(
        'SELECT id, email, role, is_active, email_verified, created_at, updated_at, last_login FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Vérifier le mot de passe
  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  // Mettre à jour la dernière connexion
  async updateLastLogin(userId) {
    const client = await this.db.connect();
    
    try {
      await client.query(
        'UPDATE users SET last_login = NOW(), failed_login_attempts = 0, updated_at = NOW() WHERE id = $1',
        [userId]
      );
    } finally {
      client.release();
    }
  }

  // Incrémenter les tentatives de connexion échouées
  async incrementFailedAttempts(userId) {
    const client = await this.db.connect();
    
    try {
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS);
      const lockTimeMinutes = parseInt(process.env.LOCK_TIME);
      
      const result = await client.query(
        `UPDATE users 
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE 
               WHEN failed_login_attempts + 1 >= $2 
               THEN NOW() + INTERVAL '${lockTimeMinutes} minutes'
               ELSE locked_until 
             END,
             updated_at = NOW()
         WHERE id = $1 
         RETURNING failed_login_attempts, locked_until`,
        [userId, maxAttempts]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Vérifier si le compte est verrouillé
  async isLocked(userId) {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(
        'SELECT locked_until FROM users WHERE id = $1',
        [userId]
      );
      
      const user = result.rows[0];
      if (!user || !user.locked_until) return false;
      
      return new Date() < new Date(user.locked_until);
    } finally {
      client.release();
    }
  }

  // Réinitialiser les tentatives de connexion
  async resetFailedAttempts(userId) {
    const client = await this.db.connect();
    
    try {
      await client.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1',
        [userId]
      );
    } finally {
      client.release();
    }
  }
}

// src/models/RefreshToken.js
class RefreshToken {
  constructor(db) {
    this.db = db;
  }

  // Créer un nouveau refresh token
  async create(userId, tokenHash, expiresAt) {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at) 
         VALUES ($1, $2, $3, NOW()) 
         RETURNING id, user_id, expires_at, created_at`,
        [userId, tokenHash, expiresAt]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Trouver un token par hash
  async findByTokenHash(tokenHash) {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(
        `SELECT rt.*, u.email, u.role, u.is_active 
         FROM refresh_tokens rt 
         JOIN users u ON rt.user_id = u.id 
         WHERE rt.token_hash = $1 AND rt.is_revoked = false`,
        [tokenHash]
      );
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Révoquer un token
  async revoke(tokenHash) {
    const client = await this.db.connect();
    
    try {
      await client.query(
        'UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1',
        [tokenHash]
      );
    } finally {
      client.release();
    }
  }

  // Révoquer tous les tokens d'un utilisateur
  async revokeAllForUser(userId) {
    const client = await this.db.connect();
    
    try {
      await client.query(
        'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
        [userId]
      );
    } finally {
      client.release();
    }
  }

  // Nettoyer les tokens expirés
  async cleanExpired() {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = true'
      );
      
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  // Obtenir tous les tokens actifs d'un utilisateur
  async findActiveByUserId(userId) {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(
        `SELECT id, token_hash, expires_at, created_at 
         FROM refresh_tokens 
         WHERE user_id = $1 AND is_revoked = false AND expires_at > NOW()`,
        [userId]
      );
      
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = {
  User,
  RefreshToken
};