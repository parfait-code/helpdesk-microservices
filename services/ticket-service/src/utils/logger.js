// src/utils/logger.js
const winston = require('winston');
const config = require('../config');

// Créer le logger
const logger = winston.createLogger({
  level: config.logging?.level || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ticket-service' },
  transports: [
    // Console transport pour le développement
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          return `${timestamp} [${level}]: ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`;
        })
      )
    }),
    
    // File transport pour les erreurs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // File transport pour tous les logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// En production, ne pas logger sur la console
if (process.env.NODE_ENV === 'production') {
  logger.remove(winston.transports.Console);
}

module.exports = logger;
