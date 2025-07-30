// tests/unit/utils/CryptoService.test.js
const CryptoService = require('../../../src/services/CryptoService');

describe('CryptoService Unit Tests', () => {
  let cryptoService;

  beforeAll(() => {
    cryptoService = new CryptoService();
  });

  describe('validatePasswordStrength', () => {
    test('should accept strong password', () => {
      expect(() => {
        cryptoService.validatePasswordStrength('StrongPass123!');
      }).not.toThrow();
    });

    test('should reject short password', () => {
      expect(() => {
        cryptoService.validatePasswordStrength('Sh0rt!');
      }).toThrow();
    });

    test('should reject password without uppercase', () => {
      expect(() => {
        cryptoService.validatePasswordStrength('lowercase123!');
      }).toThrow();
    });

    test('should reject password without numbers', () => {
      expect(() => {
        cryptoService.validatePasswordStrength('NoNumbers!');
      }).toThrow();
    });

    test('should reject common password', () => {
      expect(() => {
        cryptoService.validatePasswordStrength('password');
      }).toThrow();
    });
  });

  describe('hashPassword', () => {
    test('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await cryptoService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });
  });

  describe('verifyPassword', () => {
    test('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await cryptoService.hashPassword(password);
      
      const isValid = await cryptoService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await cryptoService.hashPassword(password);
      
      const isValid = await cryptoService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateResetToken', () => {
    test('should generate unique reset tokens', () => {
      const token1 = cryptoService.generateResetToken();
      const token2 = cryptoService.generateResetToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe('evaluatePasswordStrength', () => {
    test('should evaluate weak password', () => {
      const result = cryptoService.evaluatePasswordStrength('123456');
      expect(result.score).toBeLessThan(3);
      expect(result.strength).toContain('faible');
    });

    test('should evaluate strong password', () => {
      const result = cryptoService.evaluatePasswordStrength('VeryStr0ng!P@ssw0rd2024');
      expect(result.score).toBeGreaterThan(3);
      expect(result.strength).toContain('fort');
    });
  });
});