const multer = require('multer');
const path = require('path');
const config = require('../config');
const validator = require('../utils/validator');
const logger = require('../utils/logger');

class UploadMiddleware {
    constructor() {
        this.maxFileSize = config.upload.maxFileSize;
        this.allowedMimeTypes = config.upload.allowedMimeTypes;
        this.maxFilesPerTicket = config.upload.maxFilesPerTicket;
    }

    // Configuration de base de Multer (stockage en mémoire)
    createMulterConfig() {
        const storage = multer.memoryStorage();

        const fileFilter = (req, file, cb) => {
            // Vérifier le type MIME
            if (!this.allowedMimeTypes.includes(file.mimetype)) {
                const error = new Error(`Type de fichier non autorisé: ${file.mimetype}`);
                error.code = 'INVALID_FILE_TYPE';
                return cb(error, false);
            }

            // Vérifier le nom du fichier
            if (!file.originalname || file.originalname.length === 0) {
                const error = new Error('Nom de fichier requis');
                error.code = 'INVALID_FILENAME';
                return cb(error, false);
            }

            // Vérifier les caractères dangereux
            const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
            if (dangerousChars.test(file.originalname)) {
                const error = new Error('Nom de fichier contient des caractères non autorisés');
                error.code = 'INVALID_FILENAME';
                return cb(error, false);
            }

            cb(null, true);
        };

        const limits = {
            fileSize: this.maxFileSize,
            files: this.maxFilesPerTicket,
            fields: 10,
            fieldNameSize: 100,
            fieldSize: 1000000 // 1MB pour les champs texte
        };

        return multer({
            storage,
            fileFilter,
            limits
        });
    }

    // Middleware pour upload simple (un fichier)
    single(fieldName = 'file') {
        const upload = this.createMulterConfig();
        
        return (req, res, next) => {
            upload.single(fieldName)(req, res, (err) => {
                if (err) {
                    return this.handleUploadError(err, req, res);
                }

                // Validation supplémentaire
                if (req.file) {
                    const validation = validator.validateFile(req.file);
                    if (!validation.isValid) {
                        return res.status(400).json({
                            success: false,
                            error: 'Fichier invalide',
                            details: validation.errors
                        });
                    }
                }

                next();
            });
        };
    }

    // Middleware pour upload multiple
    multiple(fieldName = 'files', maxCount = null) {
        const upload = this.createMulterConfig();
        const max = maxCount || this.maxFilesPerTicket;
        
        return (req, res, next) => {
            upload.array(fieldName, max)(req, res, (err) => {
                if (err) {
                    return this.handleUploadError(err, req, res);
                }

                // Validation supplémentaire pour plusieurs fichiers
                if (req.files && req.files.length > 0) {
                    const validation = validator.validateFiles(req.files, req.body.ticket_id);
                    if (!validation.isValid) {
                        return res.status(400).json({
                            success: false,
                            error: 'Fichiers invalides',
                            details: validation.errors
                        });
                    }

                    // Remplacer les fichiers par ceux validés
                    req.files = validation.validFiles;
                }

                next();
            });
        };
    }

    // Middleware pour upload avec champs multiples
    fields(fieldsConfig) {
        const upload = this.createMulterConfig();
        
        return (req, res, next) => {
            upload.fields(fieldsConfig)(req, res, (err) => {
                if (err) {
                    return this.handleUploadError(err, req, res);
                }

                // Validation des fichiers dans tous les champs
                let hasErrors = false;
                const errors = [];

                for (const field of fieldsConfig) {
                    if (req.files && req.files[field.name]) {
                        const validation = validator.validateFiles(req.files[field.name]);
                        if (!validation.isValid) {
                            hasErrors = true;
                            errors.push(`${field.name}: ${validation.errors.join(', ')}`);
                        } else {
                            req.files[field.name] = validation.validFiles;
                        }
                    }
                }

                if (hasErrors) {
                    return res.status(400).json({
                        success: false,
                        error: 'Fichiers invalides',
                        details: errors
                    });
                }

                next();
            });
        };
    }

    // Gestion des erreurs d'upload
    handleUploadError(err, req, res) {
        let statusCode = 400;
        let message = 'Erreur lors de l\'upload';
        let details = [];

        logger.error('Upload error:', {
            error: err.message,
            code: err.code,
            field: err.field,
            storageErrors: err.storageErrors
        });

        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'Fichier trop volumineux';
                details.push(`Taille maximum autorisée: ${validator.formatFileSize(this.maxFileSize)}`);
                break;

            case 'LIMIT_FILE_COUNT':
                message = 'Trop de fichiers';
                details.push(`Maximum ${this.maxFilesPerTicket} fichiers autorisés`);
                break;

            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Champ de fichier inattendu';
                details.push(`Champ non autorisé: ${err.field}`);
                break;

            case 'INVALID_FILE_TYPE':
                message = 'Type de fichier non autorisé';
                details.push(`Types acceptés: ${validator.getAllowedExtensions().join(', ')}`);
                break;

            case 'INVALID_FILENAME':
                message = 'Nom de fichier invalide';
                details.push(err.message);
                break;

            case 'LIMIT_FIELD_KEY':
                message = 'Nom de champ trop long';
                break;

            case 'LIMIT_FIELD_VALUE':
                message = 'Valeur de champ trop longue';
                break;

            case 'LIMIT_FIELD_COUNT':
                message = 'Trop de champs';
                break;

            case 'LIMIT_PART_COUNT':
                message = 'Trop de parties dans la requête';
                break;

            default:
                message = err.message || 'Erreur lors de l\'upload';
                statusCode = 500;
                break;
        }

        res.status(statusCode).json({
            success: false,
            error: message,
            details: details.length > 0 ? details : undefined
        });
    }

    // Middleware pour valider les paramètres de requête
    validateUploadParams() {
        return (req, res, next) => {
            const { error, value } = validator.validateUpload(req.body);
            
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Paramètres invalides',
                    details: error.details.map(detail => detail.message)
                });
            }

            // Remplacer req.body par les valeurs validées
            req.body = value;
            next();
        };
    }

    // Middleware pour logger les uploads
    logUpload() {
        return (req, res, next) => {
            const originalJson = res.json;
            
            res.json = function(data) {
                // Logger uniquement si l'upload a réussi
                if (data.success && req.files) {
                    const files = Array.isArray(req.files) ? req.files : [req.files].filter(Boolean);
                    
                    files.forEach(file => {
                        logger.info('File uploaded:', {
                            originalName: file.originalname,
                            mimetype: file.mimetype,
                            size: file.size,
                            ticketId: req.body.ticket_id,
                            userId: req.user?.id,
                            ip: req.ip
                        });
                    });
                }
                
                return originalJson.call(this, data);
            };

            next();
        };
    }
}

const uploadMiddleware = new UploadMiddleware();

module.exports = uploadMiddleware;
