const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const config = {
    // Configuration du serveur
    server: {
        port: process.env.PORT || 3004,
        env: process.env.NODE_ENV || 'development',
        serviceName: process.env.SERVICE_NAME || 'file-service'
    },

    // Configuration de la base de données
    database: {
        url: process.env.DATABASE_URL || 'postgresql://file:filepass@localhost:5404/file_db'
    },

    // Configuration Redis
    redis: {
        url: process.env.REDIS_URL || 'redis://:redispass@localhost:6304'
    },

    // Configuration MinIO
    minio: {
        endpoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT) || 9000,
        accessKey: process.env.MINIO_ACCESS_KEY || 'minio',
        secretKey: process.env.MINIO_SECRET_KEY || 'minio123',
        useSSL: process.env.MINIO_USE_SSL === 'true',
        bucketName: process.env.MINIO_BUCKET_NAME || 'helpdesk-files'
    },

    // Configuration des fichiers
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
        allowedMimeTypes: process.env.ALLOWED_MIME_TYPES ? 
            process.env.ALLOWED_MIME_TYPES.split(',') : [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf', 'text/plain',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ],
        maxFilesPerTicket: parseInt(process.env.MAX_FILES_PER_TICKET) || 10
    },

    // Services externes
    services: {
        auth: {
            url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
            timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT) || 5000
        },
        ticket: {
            url: process.env.TICKET_SERVICE_URL || 'http://localhost:3003',
            timeout: parseInt(process.env.TICKET_SERVICE_TIMEOUT) || 5000
        }
    },

    // Sécurité
    security: {
        corsOrigin: process.env.CORS_ORIGIN ? 
            process.env.CORS_ORIGIN.split(',') : 
            ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
        jwtSecret: process.env.JWT_SECRET || 'default-secret-key'
    },

    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    },

    // Health check
    healthCheck: {
        interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000
    }
};

module.exports = config;
