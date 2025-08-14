const database = require('../src/database');
const minioService = require('../src/services/minioService');

// Configuration pour les tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock des services externes si nécessaire
jest.mock('axios');

// Setup et teardown pour les tests
beforeAll(async () => {
    // Initialiser les services si nécessaire pour les tests d'intégration
    try {
        // Note: En mode test, on peut utiliser des mocks ou des services de test
        if (process.env.INTEGRATION_TESTS === 'true') {
            await database.connect();
            await minioService.initialize();
        }
    } catch (error) {
        console.warn('Services externes non disponibles en mode test:', error.message);
    }
});

afterAll(async () => {
    try {
        if (database.isConnected) {
            await database.disconnect();
        }
    } catch (error) {
        console.warn('Erreur lors de la fermeture des services:', error.message);
    }
});

// Configuration Jest globale
jest.setTimeout(30000);

// Helper functions pour les tests
global.createMockFile = (overrides = {}) => {
    return {
        id: 'test-file-id',
        original_name: 'test-file.jpg',
        filename: 'test-file.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        bucket: 'test-bucket',
        object_key: 'test/path/file.jpg',
        ticket_id: 'test-ticket-id',
        user_id: 'test-user-id',
        uploaded_by: 'test-user-id',
        upload_date: new Date(),
        metadata: {
            description: 'Test file',
            is_public: false
        },
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides
    };
};

global.createMockUser = (overrides = {}) => {
    return {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
        ...overrides
    };
};

global.createMockAuthToken = () => {
    // Token JWT valide pour les tests (expiré dans un an)
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzMxNTM2MDAwfQ';
};
