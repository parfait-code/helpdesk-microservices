// tests/ticket-service-integration.test.js
const request = require('supertest');
const app = require('../src/app');

describe('Ticket Service Integration Tests', () => {
  let server;

  beforeAll((done) => {
    server = app.listen(0, done); // Port 0 pour un port dynamique
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Basic Endpoints', () => {
    test('GET / should return service info', async () => {
      const response = await request(server)
        .get('/')
        .expect(200);
      
      expect(response.body.service).toBe('Ticket Service');
      expect(response.body.port).toBe(3003);
      expect(response.body.status).toBe('running');
    });

    test('GET /api/v1/health should return health status', async () => {
      const response = await request(server)
        .get('/api/v1/health')
        .expect(200);
      
      expect(response.body.service).toBe('ticket-service');
      expect(response.body.port).toBe(3003);
      expect(response.body.dependencies).toBeDefined();
    });

    test('GET /api/v1/ping should return API status', async () => {
      const response = await request(server)
        .get('/api/v1/ping')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Ticket Service API is running');
    });
  });

  describe('File Service Integration Endpoints', () => {
    test('GET /api/v1/tickets/files/:ticketId should be ready for file service integration', async () => {
      const testTicketId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(server)
        .get(`/api/v1/tickets/files/${testTicketId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.ticketId).toBe(testTicketId);
      expect(response.body.files).toEqual([]);
      expect(response.body.status).toBe('pending-file-service-integration');
    });
  });

  describe('Error Handling', () => {
    test('GET /nonexistent should return 404', async () => {
      const response = await request(server)
        .get('/nonexistent')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Endpoint not found');
      expect(response.body.service).toBe('ticket-service');
    });
  });
});

// Test pour vérifier la configuration du port
describe('Port Configuration', () => {
  test('Service should be configured for port 3003', () => {
    const config = require('../src/config');
    expect(config.port).toBe(3003);
  });
});

// Test de préparation pour l'intégration file-service
describe('File Service Integration Readiness', () => {
  test('File service endpoints should be prepared', async () => {
    const response = await request(app)
      .get('/api/v1/tickets/files/test-ticket-id')
      .expect(200);
    
    expect(response.body.note).toContain('file-service when available');
  });
});
