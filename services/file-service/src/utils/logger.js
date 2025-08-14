const winston = require('winston');
const config = require('../config');

// Configuration des formats de logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, service = 'file-service', ...meta }) => {
        let log = `${timestamp} [${service}] ${level}: ${message}`;
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }
        return log;
    })
);

// Configuration du logger
const logger = winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    defaultMeta: { service: 'file-service' },
    transports: [
        // Logs d'erreur dans un fichier séparé
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Tous les logs dans un fichier général
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// En développement, afficher les logs dans la console
if (config.server.env !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// Middleware pour capturer les logs de requêtes Express
logger.requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent')?.substring(0, 100)
        };

        if (res.statusCode >= 400) {
            logger.warn('HTTP Request', logData);
        } else {
            logger.info('HTTP Request', logData);
        }
    });

    next();
};

// Fonction pour logger les opérations de fichiers
logger.fileOperation = (operation, fileData, userId, result = 'success') => {
    logger.info('File Operation', {
        operation,
        fileId: fileData.id,
        fileName: fileData.original_name,
        fileSize: fileData.size,
        userId,
        result
    });
};

// Fonction pour logger les erreurs de validation
logger.validationError = (field, value, message) => {
    logger.warn('Validation Error', {
        field,
        value: typeof value === 'string' ? value.substring(0, 100) : value,
        message
    });
};

module.exports = logger;
