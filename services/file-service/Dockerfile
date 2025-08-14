# Dockerfile pour file-service
FROM node:18-alpine

# Informations de l'image
LABEL name="file-service"
LABEL version="1.0.0"
LABEL description="File Service for Helpdesk Microservices Architecture"

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S fileservice -u 1001

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration
COPY package.json package-lock.json* ./

# Installer les dépendances
RUN npm ci --only=production && npm cache clean --force

# Copier le code source
COPY --chown=fileservice:nodejs . .

# Créer les répertoires nécessaires
RUN mkdir -p logs && chown -R fileservice:nodejs logs
RUN mkdir -p uploads && chown -R fileservice:nodejs uploads

# Exposer le port
EXPOSE 3004

# Utiliser l'utilisateur non-root
USER fileservice

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3004/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Commande de démarrage
CMD ["node", "server.js"]
