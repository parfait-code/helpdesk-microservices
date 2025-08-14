const Joi = require('joi');
const mimeTypes = require('mime-types');
const config = require('../config');

class FileValidator {
    constructor() {
        // Schema pour l'upload de fichier
        this.uploadSchema = Joi.object({
            ticket_id: Joi.string().uuid().required(),
            description: Joi.string().max(500).optional(),
            is_public: Joi.boolean().optional().default(false)
        });

        // Schema pour la mise à jour de fichier
        this.updateSchema = Joi.object({
            original_name: Joi.string().min(1).max(255).optional(),
            description: Joi.string().max(500).optional(),
            is_public: Joi.boolean().optional()
        });

        // Schema pour la recherche
        this.searchSchema = Joi.object({
            ticket_id: Joi.string().uuid().optional(),
            user_id: Joi.string().uuid().optional(),
            mime_type: Joi.string().optional(),
            start_date: Joi.date().optional(),
            end_date: Joi.date().optional(),
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(20)
        });
    }

    // Valider les données d'upload
    validateUpload(data) {
        return this.uploadSchema.validate(data);
    }

    // Valider les données de mise à jour
    validateUpdate(data) {
        return this.updateSchema.validate(data);
    }

    // Valider les paramètres de recherche
    validateSearch(data) {
        return this.searchSchema.validate(data);
    }

    // Valider un fichier uploadé
    validateFile(file) {
        const errors = [];

        if (!file) {
            errors.push('Aucun fichier fourni');
            return { isValid: false, errors };
        }

        // Vérifier la taille du fichier
        if (file.size > config.upload.maxFileSize) {
            errors.push(`Fichier trop volumineux. Taille maximum: ${this.formatFileSize(config.upload.maxFileSize)}`);
        }

        // Vérifier le type MIME
        if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
            errors.push(`Type de fichier non autorisé. Types acceptés: ${this.getAllowedExtensions().join(', ')}`);
        }

        // Vérifier le nom du fichier
        if (!file.originalname || file.originalname.length === 0) {
            errors.push('Nom de fichier requis');
        } else if (file.originalname.length > 255) {
            errors.push('Nom de fichier trop long (maximum 255 caractères)');
        }

        // Vérifier les caractères dangereux dans le nom
        const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (dangerousChars.test(file.originalname)) {
            errors.push('Nom de fichier contient des caractères non autorisés');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Valider plusieurs fichiers
    validateFiles(files, ticketId) {
        const errors = [];
        const validFiles = [];

        if (!Array.isArray(files)) {
            files = [files];
        }

        if (files.length > config.upload.maxFilesPerTicket) {
            errors.push(`Trop de fichiers. Maximum ${config.upload.maxFilesPerTicket} fichiers par ticket`);
            return { isValid: false, errors, validFiles };
        }

        for (const file of files) {
            const fileValidation = this.validateFile(file);
            if (fileValidation.isValid) {
                validFiles.push(file);
            } else {
                errors.push(`${file.originalname}: ${fileValidation.errors.join(', ')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            validFiles
        };
    }

    // Formater la taille de fichier
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Obtenir les extensions autorisées
    getAllowedExtensions() {
        return config.upload.allowedMimeTypes.map(mimeType => {
            const ext = mimeTypes.extension(mimeType);
            return ext ? `.${ext}` : mimeType;
        }).filter(Boolean);
    }

    // Valider un UUID
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    // Générer un nom de fichier sécurisé
    generateSafeFilename(originalName) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const ext = originalName.split('.').pop().toLowerCase();
        
        // Nettoyer le nom original
        const baseName = originalName
            .replace(/\.[^/.]+$/, "") // Enlever l'extension
            .replace(/[^a-zA-Z0-9\-_.]/g, '_') // Remplacer les caractères spéciaux
            .substring(0, 100); // Limiter la longueur
        
        return `${timestamp}_${random}_${baseName}.${ext}`;
    }

    // Vérifier si un fichier est une image
    isImage(mimeType) {
        return mimeType.startsWith('image/');
    }

    // Vérifier si un fichier est un document
    isDocument(mimeType) {
        const documentTypes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        return documentTypes.includes(mimeType);
    }
}

module.exports = new FileValidator();
