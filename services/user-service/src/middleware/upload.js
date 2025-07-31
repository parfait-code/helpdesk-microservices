// src/middleware/upload.js
const multer = require('multer');
const sharp = require('sharp');
const { ValidationError } = require('../utils/errors');
const config = require('../config');

// Configuration du storage en mémoire
const storage = multer.memoryStorage();

// Filtre pour les types de fichiers
const fileFilter = (req, file, cb) => {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError(`Type de fichier non autorisé. Types acceptés: ${config.upload.allowedTypes.join(', ')}`), false);
  }
};

// Configuration de multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSize,
    files: 1
  }
});

// Middleware pour traiter l'upload d'avatar
const uploadAvatar = upload.single('avatar');

// Middleware pour redimensionner l'avatar
const processAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const { width, height, quality } = config.upload.avatarSize;

    // Redimensionner et optimiser l'image
    const processedBuffer = await sharp(req.file.buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality })
      .toBuffer();

    // Remplacer le buffer original
    req.file.buffer = processedBuffer;
    req.file.mimetype = 'image/jpeg';
    req.file.size = processedBuffer.length;

    next();
  } catch (error) {
    next(new ValidationError('Erreur lors du traitement de l\'image'));
  }
};

// Middleware de gestion d'erreur pour multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new ValidationError('Fichier trop volumineux'));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ValidationError('Champ de fichier inattendu'));
    }
  }
  next(error);
};

module.exports = {
  uploadAvatar,
  processAvatar,
  handleUploadError
};

