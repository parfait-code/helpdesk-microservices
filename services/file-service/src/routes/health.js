const express = require('express');
const database = require('../database');
const minioService = require('../services/minioService');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const healthStatus = {
            service: config.server.serviceName,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: config.server.env,
            checks: {}
        };

        // Vérifier la base de données
        const dbHealth = await database.healthCheck();
        healthStatus.checks.database = dbHealth;

        // Vérifier MinIO
        const minioHealth = await minioService.healthCheck();
        healthStatus.checks.minio = minioHealth;

        // Déterminer le statut global
        const allHealthy = Object.values(healthStatus.checks).every(
            check => check.status === 'healthy'
        );

        if (!allHealthy) {
            healthStatus.status = 'degraded';
        }

        const statusCode = allHealthy ? 200 : 503;
        res.status(statusCode).json(healthStatus);

    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            service: config.server.serviceName,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Ready check endpoint (pour Kubernetes)
router.get('/ready', async (req, res) => {
    try {
        // Vérifications critiques pour la readiness
        const checks = await Promise.allSettled([
            database.healthCheck(),
            minioService.healthCheck()
        ]);

        const allReady = checks.every(result => 
            result.status === 'fulfilled' && 
            result.value.status === 'healthy'
        );

        if (allReady) {
            res.json({
                service: config.server.serviceName,
                status: 'ready',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                service: config.server.serviceName,
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                checks: checks.map(result => 
                    result.status === 'fulfilled' ? result.value : { status: 'error', error: result.reason.message }
                )
            });
        }

    } catch (error) {
        logger.error('Ready check failed:', error);
        res.status(503).json({
            service: config.server.serviceName,
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Live check endpoint (pour Kubernetes)
router.get('/live', (req, res) => {
    res.json({
        service: config.server.serviceName,
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});

// Info endpoint
router.get('/info', (req, res) => {
    res.json({
        service: config.server.serviceName,
        version: '1.0.0',
        description: 'File Service for Helpdesk Microservices Architecture',
        environment: config.server.env,
        port: config.server.port,
        features: {
            upload: {
                max_file_size: config.upload.maxFileSize,
                max_files_per_ticket: config.upload.maxFilesPerTicket,
                allowed_types: config.upload.allowedMimeTypes.length
            },
            storage: {
                provider: 'MinIO',
                bucket: config.minio.bucketName
            }
        },
        endpoints: {
            upload_single: 'POST /api/v1/files/upload',
            upload_multiple: 'POST /api/v1/files/upload/multiple',
            download: 'GET /api/v1/files/:id/download',
            preview: 'GET /api/v1/files/:id/preview',
            search: 'GET /api/v1/files/search',
            stats: 'GET /api/v1/files/stats'
        }
    });
});

module.exports = router;
