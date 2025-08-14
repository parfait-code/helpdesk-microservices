const request = require('supertest');
const fileServiceApp = require('../src/app');

let app;

describe('File Service - Health & Info', () => {
    beforeAll(async () => {
        app = fileServiceApp.getApp();
    });

    describe('GET /api/v1/health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/api/v1/health')
                .expect(200);

            expect(response.body).toHaveProperty('service');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body.service).toBe('file-service');
        });
    });

    describe('GET /api/v1/info', () => {
        it('should return service information', async () => {
            const response = await request(app)
                .get('/api/v1/info')
                .expect(200);

            expect(response.body).toHaveProperty('service');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('description');
            expect(response.body.service).toBe('file-service');
        });
    });

    describe('GET /api/v1/live', () => {
        it('should return liveness status', async () => {
            const response = await request(app)
                .get('/api/v1/live')
                .expect(200);

            expect(response.body.status).toBe('alive');
        });
    });

    describe('GET /', () => {
        it('should return service welcome message', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.service).toBe('file-service');
        });
    });

    describe('GET /api/v1', () => {
        it('should return API information', async () => {
            const response = await request(app)
                .get('/api/v1')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.service).toBe('file-service');
        });
    });

    describe('GET /non-existent-route', () => {
        it('should return 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/non-existent-route')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Endpoint non trouvé');
        });
    });
});
