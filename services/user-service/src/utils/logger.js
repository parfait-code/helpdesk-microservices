// src/utils/logger.js
const winston = require('winston');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
}

const transports = [];

// Toujours ajouter la console
transports.push(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
}));

// Ajouter les fichiers seulement si on peut écrire
try {
  transports.push(
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error' 
    })
  );
  transports.push(
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log') 
    })
  );
} catch (error) {
  console.error('Warning: Could not create file transports:', error);
}

const logger = winston.createLogger({
  level: config.logging.level || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: transports,
  exitOnError: false // Important : ne pas crasher sur erreur
});

module.exports = logger;