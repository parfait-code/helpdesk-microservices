// tests/integration/auth.test.js
const request = require('supertest');
const AuthServer = require('../../src/server');

describe('Auth Integration Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    server = new AuthServer();
    await server.initializeDatabase();
    app = server.app;
  });

  afterAll(async () => {
    if (server) {
      await server.gracefulShutdown('TEST_END');
    }
  });

  describe('POST /auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.accessToken).toBeDefined();
    });

    test('should reject duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#'
      };

      // Premier enregistrement
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Tentative de doublon
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('existe déjà');
    });

    test('should reject weak password', async () => {
      const userData = {
        email: 'weak@example.com',
        password: '123',
        confirmPassword: '123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Créer un utilisateur de test
      await request(app)
        .post('/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });
    });

    test('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Test123!@#'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.email).toBe('login@example.com');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      // Créer un utilisateur et obtenir un refresh token
      await request(app)
        .post('/auth/register')
        .send({
          email: 'refresh@example.com',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'refresh@example.com',
          password: 'Test123!@#'
        });

      // Extraire le refresh token du cookie
      const cookies = loginResponse.headers['set-cookie'];
      refreshToken = cookies
        .find(cookie => cookie.startsWith('refreshToken='))
        ?.split('=')[1]?.split(';')[0];
    });

    test('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    let accessToken;

    beforeEach(async () => {
      // Créer un utilisateur et obtenir un access token
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'me@example.com',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });

      accessToken = registerResponse.body.data.accessToken;
    });

    test('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('me@example.com');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'logout@example.com',
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        });

      accessToken = registerResponse.body.data.accessToken;
    });

    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Vérifier que le token est maintenant invalide
      await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});