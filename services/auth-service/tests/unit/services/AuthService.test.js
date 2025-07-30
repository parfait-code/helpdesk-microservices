// tests/unit/services/AuthService.test.js
const AuthService = require('../../../src/services/AuthService');
const DatabaseManager = require('../../../src/config/database');

describe('AuthService Unit Tests', () => {
  let authService;

  beforeAll(async () => {
    await DatabaseManager.connectPostgreSQL();
    await DatabaseManager.connectRedis();
    authService = new AuthService(DatabaseManager, DatabaseManager.redis);
  });

  afterEach(async () => {
    // Nettoyer après chaque test
    const client = await DatabaseManager.pg.connect();
    await client.query('DELETE FROM users WHERE email LIKE \'%unit-test%\'');
    client.release();
  });

  describe('register', () => {
    test('should register user successfully', async () => {
      const userData = {
        email: 'unit-test@example.com',
        password: 'UnitTest123!',
        confirmPassword: 'UnitTest123!'
      };

      const result = await authService.register(userData);

      expect(result.user.email).toBe(userData.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    test('should throw error for mismatched passwords', async () => {
      const userData = {
        email: 'unit-test2@example.com',
        password: 'UnitTest123!',
        confirmPassword: 'DifferentPassword123!'
      };

      await expect(authService.register(userData))
        .rejects
        .toThrow('Les mots de passe ne correspondent pas');
    });

    test('should throw error for weak password', async () => {
      const userData = {
        email: 'unit-test3@example.com',
        password: 'weak',
        confirmPassword: 'weak'
      };

      await expect(authService.register(userData))
        .rejects
        .toThrow();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Créer un utilisateur de test
      await authService.register({
        email: 'login-unit-test@example.com',
        password: 'LoginTest123!',
        confirmPassword: 'LoginTest123!'
      });
    });

    test('should login successfully with valid credentials', async () => {
      const result = await authService.login({
        email: 'login-unit-test@example.com',
        password: 'LoginTest123!'
      });

      expect(result.user.email).toBe('login-unit-test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    test('should throw error for invalid credentials', async () => {
      await expect(authService.login({
        email: 'login-unit-test@example.com',
        password: 'WrongPassword123!'
      })).rejects.toThrow('Email ou mot de passe incorrect');
    });

    test('should throw error for non-existent user', async () => {
      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: 'Password123!'
      })).rejects.toThrow('Email ou mot de passe incorrect');
    });
  });
});