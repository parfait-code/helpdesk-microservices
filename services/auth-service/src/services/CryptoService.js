// src/services/CryptoService.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class CryptoService {
  constructor() {
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  }

  // Validation de la force du mot de passe
  validatePasswordStrength(password) {
    const minLength = 8;
    const maxLength = 128;

    if (!password) {
      throw new Error('Le mot de passe est requis');
    }

    if (password.length < minLength) {
      throw new Error(`Le mot de passe doit contenir au moins ${minLength} caractères`);
    }

    if (password.length > maxLength) {
      throw new Error(`Le mot de passe ne peut pas dépasser ${maxLength} caractères`);
    }

    // Vérifications des critères de sécurité
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const criteriaMet = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(Boolean).length;

    if (criteriaMet < 3) {
      throw new Error('Le mot de passe doit contenir au moins 3 des critères suivants: majuscules, minuscules, chiffres, caractères spéciaux');
    }

    // Vérifier les mots de passe communs/faibles
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      throw new Error('Ce mot de passe est trop commun');
    }

    return true;
  }

  // Hasher un mot de passe
  async hashPassword(password) {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  // Vérifier un mot de passe
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Générer un token de réinitialisation sécurisé
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Générer un token d'email verification
  generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Hasher un token pour le stockage
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Générer un identifiant unique
  generateUniqueId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Chiffrer des données sensibles
  encrypt(text, key = process.env.ENCRYPTION_KEY) {
    if (!key) {
      throw new Error('Clé de chiffrement manquante');
    }

    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM(algorithm, Buffer.from(key.slice(0, 32), 'utf8'), iv);
    
    cipher.setAAD(Buffer.from('auth-service', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // Déchiffrer des données
  decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
    if (!key) {
      throw new Error('Clé de chiffrement manquante');
    }

    const algorithm = 'aes-256-gcm';
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipherGCM(algorithm, Buffer.from(key.slice(0, 32), 'utf8'), iv);
    
    decipher.setAAD(Buffer.from('auth-service', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Générer une signature HMAC
  generateHMAC(data, secret = process.env.HMAC_SECRET) {
    if (!secret) {
      throw new Error('Secret HMAC manquant');
    }
    
    return crypto.createHmac('sha256', secret)
                 .update(data)
                 .digest('hex');
  }

  // Vérifier une signature HMAC
  verifyHMAC(data, signature, secret = process.env.HMAC_SECRET) {
    if (!secret) {
      throw new Error('Secret HMAC manquant');
    }
    
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Générer un hash sécurisé pour les comparaisons
  generateSecureHash(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(32).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
    
    return {
      hash,
      salt
    };
  }

  // Vérifier un hash sécurisé
  verifySecureHash(data, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(verifyHash, 'hex')
    );
  }

  // Générer un code à usage unique (TOTP-like)
  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }
    
    return otp;
  }

  // Validation d'email
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  // Nettoyer et normaliser un email
  normalizeEmail(email) {
    if (!this.isValidEmail(email)) {
      throw new Error('Format d\'email invalide');
    }
    
    return email.trim().toLowerCase();
  }

  // Générer un nonce pour CSP
  generateNonce() {
    return crypto.randomBytes(16).toString('base64');
  }

  // Calculer l'entropie d'un mot de passe
  calculatePasswordEntropy(password) {
    const charSets = [
      { regex: /[a-z]/, size: 26 },      // minuscules
      { regex: /[A-Z]/, size: 26 },      // majuscules
      { regex: /[0-9]/, size: 10 },      // chiffres
      { regex: /[^a-zA-Z0-9]/, size: 32 } // caractères spéciaux
    ];

    let charSetSize = 0;
    charSets.forEach(set => {
      if (set.regex.test(password)) {
        charSetSize += set.size;
      }
    });

    return password.length * Math.log2(charSetSize);
  }

  // Évaluer la force d'un mot de passe
  evaluatePasswordStrength(password) {
    const entropy = this.calculatePasswordEntropy(password);
    
    if (entropy < 30) return { strength: 'Très faible', score: 1 };
    if (entropy < 50) return { strength: 'Faible', score: 2 };
    if (entropy < 70) return { strength: 'Moyen', score: 3 };
    if (entropy < 90) return { strength: 'Fort', score: 4 };
    return { strength: 'Très fort', score: 5 };
  }
}

module.exports = CryptoService;