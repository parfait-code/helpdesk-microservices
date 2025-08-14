const express = require('express');
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');

const router = express.Router();

// Routes pour l'upload de fichiers
router.post('/upload',
    authMiddleware.authenticate(),
    authMiddleware.requirePermission('file:upload'),
    uploadMiddleware.validateUploadParams(),
    uploadMiddleware.single('file'),
    uploadMiddleware.logUpload(),
    fileController.uploadFile
);

router.post('/upload/multiple',
    authMiddleware.authenticate(),
    authMiddleware.requirePermission('file:upload'),
    uploadMiddleware.validateUploadParams(),
    uploadMiddleware.multiple('files'),
    uploadMiddleware.logUpload(),
    fileController.uploadMultipleFiles
);

// Routes pour la gestion des fichiers
router.get('/search',
    authMiddleware.authenticate(),
    authMiddleware.requirePermission('file:read'),
    fileController.searchFiles
);

router.get('/stats',
    authMiddleware.authenticate(),
    authMiddleware.requirePermission('file:read'),
    fileController.getStats
);

router.get('/ticket/:ticketId',
    authMiddleware.authenticate(),
    authMiddleware.requirePermission('file:read'),
    fileController.getTicketFiles
);

router.get('/:id',
    authMiddleware.authenticate(),
    authMiddleware.requirePermission('file:read'),
    fileController.getFileInfo
);

router.get('/:id/download',
    authMiddleware.optionalAuth(), // Permet l'accès aux fichiers publics
    fileController.downloadFile
);

router.get('/:id/preview',
    authMiddleware.optionalAuth(), // Permet l'accès aux fichiers publics
    fileController.previewFile
);

router.put('/:id',
    authMiddleware.authenticate(),
    authMiddleware.requirePermission('file:update'),
    fileController.updateFile
);

router.delete('/:id',
    authMiddleware.authenticate(),
    authMiddleware.requirePermission('file:delete'),
    fileController.deleteFile
);

module.exports = router;
