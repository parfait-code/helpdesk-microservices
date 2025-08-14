const express = require('express');
const filesRoutes = require('./files');
const healthRoutes = require('./health');

const router = express.Router();

// Routes principales
router.use('/files', filesRoutes);
router.use('/', healthRoutes);

// Route par défaut pour l'API
router.get('/', (req, res) => {
    res.json({
        success: true,
        service: 'file-service',
        version: '1.0.0',
        message: 'File Service API is running',
        timestamp: new Date().toISOString(),
        documentation: {
            health: 'GET /api/v1/health',
            info: 'GET /api/v1/info',
            upload: 'POST /api/v1/files/upload',
            download: 'GET /api/v1/files/:id/download'
        }
    });
});

// Gestion des routes non trouvées
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route non trouvée',
        path: req.originalUrl,
        method: req.method,
        available_routes: {
            health: 'GET /api/v1/health',
            files: 'GET /api/v1/files/*',
            info: 'GET /api/v1/info'
        }
    });
});

module.exports = router;
