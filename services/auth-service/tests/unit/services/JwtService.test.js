// tests/unit/services/JwtService.test.js
const JwtService = require('../../../src/services/JwtService');
const DatabaseManager = require('../../../src/config/database');

describe('JwtService Unit Tests', () => {
  let jwtService;

  beforeAll(async () => {
    await DatabaseManager.connectRedis();
    jwtService = new JwtService(DatabaseManager.redis);
  });

  describe('generateAccessToken', () => {
    test('should generate valid access token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user'
      };

      const token = jwtService.generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwtService.verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });
  });

  describe('generateRefreshToken', () => {
    test('should generate unique refresh tokens', () => {
      const token1 = jwtService.generateRefreshToken();
      const token2 = jwtService.generateRefreshToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(50);
    });
  });

  describe('blacklistToken', () => {
    test('should blacklist token successfully', async () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user'
      };

      const token = jwtService.generateAccessToken(payload);
      await jwtService.blacklistToken(token);

      const isBlacklisted = await jwtService.isTokenBlacklisted(token);
      expect(isBlacklisted).toBe(true);
    });
  });
});