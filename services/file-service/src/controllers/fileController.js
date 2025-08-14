const fileModel = require('../models/File');
const minioService = require('../services/minioService');
const validator = require('../utils/validator');
const logger = require('../utils/logger');
const config = require('../config');
const axios = require('axios');
const sharp = require('sharp');

class FileController {
    constructor() {
        this.ticketServiceUrl = config.services.ticket.url;
        this.ticketServiceTimeout = config.services.ticket.timeout;
    }

    // Upload d'un seul fichier
    async uploadFile(req, res) {
        try {
            const { ticket_id, description, is_public = false } = req.body;
            const userId = req.user.id;

            // Vérifier que le fichier existe
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Aucun fichier fourni'
                });
            }

            // Vérifier que le ticket existe
            const ticketExists = await this.verifyTicketExists(ticket_id, userId);
            if (!ticketExists) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket non trouvé ou accès non autorisé'
                });
            }

            // Vérifier le nombre de fichiers existants pour ce ticket
            const fileCount = await fileModel.countByTicketId(ticket_id);
            if (fileCount >= config.upload.maxFilesPerTicket) {
                return res.status(400).json({
                    success: false,
                    error: `Nombre maximum de fichiers atteint (${config.upload.maxFilesPerTicket}) pour ce ticket`
                });
            }

            const file = req.file;
            
            // Générer un nom de fichier sécurisé
            const safeFilename = validator.generateSafeFilename(file.originalname);
            const objectPath = minioService.generateObjectPath(safeFilename, ticket_id, is_public);

            // Optimiser l'image si nécessaire
            let fileBuffer = file.buffer;
            if (validator.isImage(file.mimetype)) {
                fileBuffer = await this.optimizeImage(file.buffer, file.mimetype);
            }

            // Upload vers MinIO
            const uploadResult = await minioService.uploadFile(
                fileBuffer,
                objectPath,
                file.mimetype,
                {
                    'original-name': file.originalname,
                    'ticket-id': ticket_id,
                    'user-id': userId,
                    'is-public': is_public.toString(),
                    'description': description || ''
                }
            );

            // Enregistrer en base de données
            const fileData = {
                original_name: file.originalname,
                filename: safeFilename,
                mime_type: file.mimetype,
                size: fileBuffer.length,
                bucket: config.minio.bucketName,
                object_key: objectPath,
                ticket_id,
                user_id: userId,
                uploaded_by: userId,
                metadata: {
                    description: description || '',
                    is_public: is_public,
                    optimized: validator.isImage(file.mimetype)
                }
            };

            const savedFile = await fileModel.create(fileData);

            // Logger l'opération
            logger.fileOperation('upload', savedFile, userId);

            // Notifier le service de tickets si configuré
            await this.notifyTicketService(ticket_id, 'file_uploaded', {
                file_id: savedFile.id,
                file_name: file.originalname,
                file_size: savedFile.size,
                uploaded_by: userId
            });

            res.status(201).json({
                success: true,
                message: 'Fichier uploadé avec succès',
                data: {
                    ...savedFile,
                    download_url: `/api/v1/files/${savedFile.id}/download`,
                    preview_url: validator.isImage(file.mimetype) ? `/api/v1/files/${savedFile.id}/preview` : null
                }
            });

        } catch (error) {
            logger.error('Error uploading file:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'upload du fichier'
            });
        }
    }

    // Upload de plusieurs fichiers
    async uploadMultipleFiles(req, res) {
        try {
            const { ticket_id, description, is_public = false } = req.body;
            const userId = req.user.id;

            // Vérifier que des fichiers existent
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Aucun fichier fourni'
                });
            }

            // Vérifier que le ticket existe
            const ticketExists = await this.verifyTicketExists(ticket_id, userId);
            if (!ticketExists) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket non trouvé ou accès non autorisé'
                });
            }

            // Vérifier le nombre de fichiers existants
            const currentFileCount = await fileModel.countByTicketId(ticket_id);
            const totalFiles = currentFileCount + req.files.length;
            
            if (totalFiles > config.upload.maxFilesPerTicket) {
                return res.status(400).json({
                    success: false,
                    error: `Nombre maximum de fichiers dépassé. Current: ${currentFileCount}, Upload: ${req.files.length}, Max: ${config.upload.maxFilesPerTicket}`
                });
            }

            const uploadedFiles = [];
            const errors = [];

            // Traiter chaque fichier
            for (const file of req.files) {
                try {
                    // Générer un nom de fichier sécurisé
                    const safeFilename = validator.generateSafeFilename(file.originalname);
                    const objectPath = minioService.generateObjectPath(safeFilename, ticket_id, is_public);

                    // Optimiser l'image si nécessaire
                    let fileBuffer = file.buffer;
                    if (validator.isImage(file.mimetype)) {
                        fileBuffer = await this.optimizeImage(file.buffer, file.mimetype);
                    }

                    // Upload vers MinIO
                    await minioService.uploadFile(
                        fileBuffer,
                        objectPath,
                        file.mimetype,
                        {
                            'original-name': file.originalname,
                            'ticket-id': ticket_id,
                            'user-id': userId,
                            'is-public': is_public.toString(),
                            'description': description || ''
                        }
                    );

                    // Enregistrer en base de données
                    const fileData = {
                        original_name: file.originalname,
                        filename: safeFilename,
                        mime_type: file.mimetype,
                        size: fileBuffer.length,
                        bucket: config.minio.bucketName,
                        object_key: objectPath,
                        ticket_id,
                        user_id: userId,
                        uploaded_by: userId,
                        metadata: {
                            description: description || '',
                            is_public: is_public,
                            optimized: validator.isImage(file.mimetype)
                        }
                    };

                    const savedFile = await fileModel.create(fileData);
                    uploadedFiles.push({
                        ...savedFile,
                        download_url: `/api/v1/files/${savedFile.id}/download`,
                        preview_url: validator.isImage(file.mimetype) ? `/api/v1/files/${savedFile.id}/preview` : null
                    });

                    // Logger l'opération
                    logger.fileOperation('upload', savedFile, userId);

                } catch (error) {
                    errors.push({
                        file: file.originalname,
                        error: error.message
                    });
                }
            }

            // Notifier le service de tickets
            if (uploadedFiles.length > 0) {
                await this.notifyTicketService(ticket_id, 'files_uploaded', {
                    files_count: uploadedFiles.length,
                    files: uploadedFiles.map(f => ({
                        file_id: f.id,
                        file_name: f.original_name,
                        file_size: f.size
                    })),
                    uploaded_by: userId
                });
            }

            res.status(201).json({
                success: uploadedFiles.length > 0,
                message: `${uploadedFiles.length} fichier(s) uploadé(s) avec succès${errors.length > 0 ? `, ${errors.length} erreur(s)` : ''}`,
                data: {
                    uploaded_files: uploadedFiles,
                    errors: errors.length > 0 ? errors : undefined
                }
            });

        } catch (error) {
            logger.error('Error uploading multiple files:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'upload des fichiers'
            });
        }
    }

    // Télécharger un fichier
    async downloadFile(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const file = await fileModel.findById(id);
            if (!file) {
                return res.status(404).json({
                    success: false,
                    error: 'Fichier non trouvé'
                });
            }

            // Vérifier les permissions
            if (!await this.checkFileAccess(file, userId, 'read', req.user?.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé'
                });
            }

            // Télécharger depuis MinIO
            const fileBuffer = await minioService.downloadFile(file.object_key);

            // Logger l'action
            await fileModel.logAction(id, 'DOWNLOAD', userId, {}, req);

            // Définir les headers appropriés
            res.setHeader('Content-Type', file.mime_type);
            res.setHeader('Content-Length', file.size);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
            res.setHeader('Cache-Control', 'private, no-cache');

            res.send(fileBuffer);

        } catch (error) {
            logger.error('Error downloading file:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors du téléchargement'
            });
        }
    }

    // Prévisualisation d'un fichier (pour les images)
    async previewFile(req, res) {
        try {
            const { id } = req.params;
            const { width, height, quality = 80 } = req.query;
            const userId = req.user?.id;

            const file = await fileModel.findById(id);
            if (!file) {
                return res.status(404).json({
                    success: false,
                    error: 'Fichier non trouvé'
                });
            }

            // Vérifier que c'est une image
            if (!validator.isImage(file.mime_type)) {
                return res.status(400).json({
                    success: false,
                    error: 'La prévisualisation n\'est disponible que pour les images'
                });
            }

            // Vérifier les permissions
            if (!await this.checkFileAccess(file, userId, 'read', req.user?.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé'
                });
            }

            // Télécharger l'image depuis MinIO
            const imageBuffer = await minioService.downloadFile(file.object_key);

            // Redimensionner si demandé
            let processedBuffer = imageBuffer;
            if (width || height) {
                const sharpInstance = sharp(imageBuffer);
                
                if (width || height) {
                    sharpInstance.resize(
                        width ? parseInt(width) : undefined,
                        height ? parseInt(height) : undefined,
                        { 
                            fit: 'inside',
                            withoutEnlargement: true
                        }
                    );
                }

                if (file.mime_type === 'image/jpeg') {
                    sharpInstance.jpeg({ quality: parseInt(quality) });
                } else if (file.mime_type === 'image/png') {
                    sharpInstance.png({ quality: parseInt(quality) });
                } else if (file.mime_type === 'image/webp') {
                    sharpInstance.webp({ quality: parseInt(quality) });
                }

                processedBuffer = await sharpInstance.toBuffer();
            }

            // Logger l'action
            await fileModel.logAction(id, 'PREVIEW', userId, { width, height, quality }, req);

            // Headers pour la prévisualisation
            res.setHeader('Content-Type', file.mime_type);
            res.setHeader('Content-Length', processedBuffer.length);
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 heure

            res.send(processedBuffer);

        } catch (error) {
            logger.error('Error previewing file:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la prévisualisation'
            });
        }
    }

    // Obtenir les informations d'un fichier
    async getFileInfo(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const file = await fileModel.findById(id);
            if (!file) {
                return res.status(404).json({
                    success: false,
                    error: 'Fichier non trouvé'
                });
            }

            // Vérifier les permissions
            if (!await this.checkFileAccess(file, userId, 'read', req.user?.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé'
                });
            }

            // Ajouter les URLs de téléchargement
            const fileInfo = {
                ...file,
                download_url: `/api/v1/files/${file.id}/download`,
                preview_url: validator.isImage(file.mime_type) ? `/api/v1/files/${file.id}/preview` : null,
                formatted_size: validator.formatFileSize(file.size)
            };

            res.json({
                success: true,
                data: fileInfo
            });

        } catch (error) {
            logger.error('Error getting file info:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des informations'
            });
        }
    }

    // Lister les fichiers d'un ticket
    async getTicketFiles(req, res) {
        try {
            const { ticketId } = req.params;
            const { page = 1, limit = 20 } = req.query;
            const userId = req.user?.id;

            // Vérifier l'accès au ticket
            const ticketExists = await this.verifyTicketExists(ticketId, userId);
            if (!ticketExists) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket non trouvé ou accès non autorisé'
                });
            }

            const files = await fileModel.findByTicketId(ticketId, {
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit)
            });

            // Ajouter les URLs pour chaque fichier
            const filesWithUrls = files.map(file => ({
                ...file,
                download_url: `/api/v1/files/${file.id}/download`,
                preview_url: validator.isImage(file.mime_type) ? `/api/v1/files/${file.id}/preview` : null,
                formatted_size: validator.formatFileSize(file.size)
            }));

            // Obtenir le nombre total
            const totalFiles = await fileModel.countByTicketId(ticketId);

            res.json({
                success: true,
                data: {
                    files: filesWithUrls,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: totalFiles,
                        total_pages: Math.ceil(totalFiles / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error getting ticket files:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des fichiers'
            });
        }
    }

    // Rechercher des fichiers
    async searchFiles(req, res) {
        try {
            const { error, value } = validator.validateSearch(req.query);
            
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Paramètres de recherche invalides',
                    details: error.details.map(detail => detail.message)
                });
            }

            const userId = req.user?.id;
            const userRole = req.user?.role;

            // Les utilisateurs normaux ne peuvent rechercher que leurs propres fichiers
            if (!['admin', 'super_admin', 'support'].includes(userRole)) {
                value.user_id = userId;
            }

            const result = await fileModel.search(value);

            // Ajouter les URLs pour chaque fichier
            const filesWithUrls = result.files.map(file => ({
                ...file,
                download_url: `/api/v1/files/${file.id}/download`,
                preview_url: validator.isImage(file.mime_type) ? `/api/v1/files/${file.id}/preview` : null,
                formatted_size: validator.formatFileSize(file.size)
            }));

            res.json({
                success: true,
                data: {
                    files: filesWithUrls,
                    pagination: {
                        page: result.page,
                        limit: result.limit,
                        total: result.totalCount,
                        total_pages: result.totalPages
                    }
                }
            });

        } catch (error) {
            logger.error('Error searching files:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la recherche'
            });
        }
    }

    // Mettre à jour un fichier
    async updateFile(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const { error, value } = validator.validateUpdate(req.body);
            
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: error.details.map(detail => detail.message)
                });
            }

            const file = await fileModel.findById(id);
            if (!file) {
                return res.status(404).json({
                    success: false,
                    error: 'Fichier non trouvé'
                });
            }

            // Vérifier les permissions
            if (!await this.checkFileAccess(file, userId, 'update', req.user?.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé'
                });
            }

            // Mettre à jour
            const updatedFile = await fileModel.update(id, value, userId);

            res.json({
                success: true,
                message: 'Fichier mis à jour avec succès',
                data: {
                    ...updatedFile,
                    download_url: `/api/v1/files/${updatedFile.id}/download`,
                    preview_url: validator.isImage(updatedFile.mime_type) ? `/api/v1/files/${updatedFile.id}/preview` : null,
                    formatted_size: validator.formatFileSize(updatedFile.size)
                }
            });

        } catch (error) {
            logger.error('Error updating file:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la mise à jour'
            });
        }
    }

    // Supprimer un fichier
    async deleteFile(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const file = await fileModel.findById(id);
            if (!file) {
                return res.status(404).json({
                    success: false,
                    error: 'Fichier non trouvé'
                });
            }

            // Vérifier les permissions
            if (!await this.checkFileAccess(file, userId, 'delete', req.user?.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé'
                });
            }

            // Supprimer de la base de données (soft delete)
            const deletedFile = await fileModel.delete(id, userId);
            
            // Supprimer de MinIO en arrière-plan
            minioService.deleteFile(file.object_key).catch(error => {
                logger.error('Error deleting file from MinIO:', error);
            });

            // Notifier le service de tickets
            await this.notifyTicketService(file.ticket_id, 'file_deleted', {
                file_id: id,
                file_name: file.original_name,
                deleted_by: userId
            });

            res.json({
                success: true,
                message: 'Fichier supprimé avec succès'
            });

        } catch (error) {
            logger.error('Error deleting file:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la suppression'
            });
        }
    }

    // Obtenir les statistiques des fichiers
    async getStats(req, res) {
        try {
            const { ticket_id, user_id } = req.query;
            const currentUserId = req.user?.id;
            const userRole = req.user?.role;

            // Vérifier les permissions pour les statistiques
            let statsUserId = user_id;
            
            // Les utilisateurs normaux ne peuvent voir que leurs propres stats
            if (!['admin', 'super_admin', 'support'].includes(userRole)) {
                statsUserId = currentUserId;
            }

            const stats = await fileModel.getStats(statsUserId, ticket_id);

            res.json({
                success: true,
                data: {
                    ...stats,
                    formatted_total_size: validator.formatFileSize(parseInt(stats.total_size || 0)),
                    formatted_average_size: validator.formatFileSize(parseInt(stats.average_size || 0))
                }
            });

        } catch (error) {
            logger.error('Error getting file stats:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des statistiques'
            });
        }
    }

    // Méthodes utilitaires

    // Vérifier si un ticket existe et si l'utilisateur y a accès
    async verifyTicketExists(ticketId, userId) {
        try {
            const response = await axios.get(
                `${this.ticketServiceUrl}/api/v1/tickets/${ticketId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.getAuthToken()}`,
                        'X-User-ID': userId
                    },
                    timeout: this.ticketServiceTimeout
                }
            );

            return response.data && response.data.success;

        } catch (error) {
            logger.warn('Ticket verification failed:', error.message);
            return false;
        }
    }

    // Vérifier l'accès à un fichier
    async checkFileAccess(file, userId, action = 'read', userRole = null) {
        // Les admins ont tous les droits
        if (['admin', 'super_admin'].includes(userRole)) {
            return true;
        }

        // Le support peut lire et modifier
        if (userRole === 'support' && ['read', 'update'].includes(action)) {
            return true;
        }

        // Propriétaire du fichier
        if (file.user_id === userId || file.uploaded_by === userId) {
            return true;
        }

        // Fichiers publics en lecture seule
        if (file.metadata?.is_public && action === 'read') {
            return true;
        }

        return false;
    }

    // Notifier le service de tickets
    async notifyTicketService(ticketId, event, data) {
        try {
            await axios.post(
                `${this.ticketServiceUrl}/api/v1/tickets/${ticketId}/events`,
                {
                    event_type: event,
                    event_data: data,
                    source: 'file-service'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.getAuthToken()}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.ticketServiceTimeout
                }
            );

        } catch (error) {
            logger.warn('Failed to notify ticket service:', error.message);
            // Ne pas faire échouer l'opération principale
        }
    }

    // Obtenir le token d'authentification pour les appels inter-services
    getAuthToken() {
        // Pour les appels inter-services, utiliser un token de service ou partager le token utilisateur
        return process.env.SERVICE_TOKEN || req.user?.token;
    }

    // Optimiser une image
    async optimizeImage(buffer, mimeType) {
        try {
            const sharpInstance = sharp(buffer);
            
            // Limiter la taille maximale à 2048x2048
            sharpInstance.resize(2048, 2048, { 
                fit: 'inside',
                withoutEnlargement: true 
            });

            // Optimiser selon le type
            if (mimeType === 'image/jpeg') {
                return await sharpInstance.jpeg({ quality: 85 }).toBuffer();
            } else if (mimeType === 'image/png') {
                return await sharpInstance.png({ quality: 85 }).toBuffer();
            } else if (mimeType === 'image/webp') {
                return await sharpInstance.webp({ quality: 85 }).toBuffer();
            } else {
                return buffer; // Pas d'optimisation pour les autres formats
            }

        } catch (error) {
            logger.warn('Image optimization failed:', error.message);
            return buffer; // Retourner le buffer original en cas d'erreur
        }
    }
}

const fileController = new FileController();

module.exports = fileController;
