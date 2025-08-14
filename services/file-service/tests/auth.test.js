const request = require('supertest');
const fileServiceApp = require('../src/app');

let app;

describe('File Service - Authentication', () => {
    beforeAll(async () => {
        app = fileServiceApp.getApp();
    });

    describe('Protected Routes', () => {
        const protectedRoutes = [
            { method: 'get', path: '/api/v1/files/search' },
            { method: 'get', path: '/api/v1/files/stats' },
            { method: 'post', path: '/api/v1/files/upload' },
            { method: 'post', path: '/api/v1/files/upload/multiple' }
        ];

        protectedRoutes.forEach(route => {
            it(`should require authentication for ${route.method.toUpperCase()} ${route.path}`, async () => {
                const response = await request(app)
                    [route.method](route.path)
                    .expect(401);

                expect(response.body.success).toBe(false);
                expect(response.body.error).toContain('authentification');
            });
        });
    });

    describe('File Download/Preview Routes', () => {
        it('should allow access to download endpoint without auth (for public files)', async () => {
            const response = await request(app)
                .get('/api/v1/files/non-existent-id/download')
                .expect(404); // File not found, but no auth error

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Fichier non trouvé');
        });

        it('should allow access to preview endpoint without auth (for public files)', async () => {
            const response = await request(app)
                .get('/api/v1/files/non-existent-id/preview')
                .expect(404); // File not found, but no auth error

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Fichier non trouvé');
        });
    });

    describe('Invalid Token', () => {
        it('should reject invalid tokens', async () => {
            const response = await request(app)
                .get('/api/v1/files/search')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('invalide');
        });

        it('should reject malformed authorization header', async () => {
            const response = await request(app)
                .get('/api/v1/files/search')
                .set('Authorization', 'InvalidFormat token')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});
