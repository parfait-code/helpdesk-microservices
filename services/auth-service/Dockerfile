# Dockerfile
FROM node:18-alpine AS base

# Installer les dépendances système
RUN apk add --no-cache \
    dumb-init \
    postgresql-client \
    redis \
    curl

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY .npmrc ./

# Stage de développement
FROM base AS development

# Installer toutes les dépendances (dev incluses)
RUN npm ci --include=dev

# Copier le code source
COPY --chown=nodejs:nodejs . .

# Exposer le port
EXPOSE 3001

# Utiliser dumb-init pour la gestion des signaux
ENTRYPOINT ["dumb-init", "--"]

# Commande de développement
CMD ["npm", "run", "dev"]

# Stage de production
FROM base AS production

# Variables d'environnement pour la production
ENV NODE_ENV=production
ENV NPM_CONFIG_CACHE=/tmp/.npm

# Installer uniquement les dépendances de production
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copier le code source
COPY --chown=nodejs:nodejs . .

# Supprimer les fichiers de développement
RUN rm -rf \
    tests/ \
    *.test.js \
    .eslintrc.js \
    .prettierrc \
    docker-compose*.yml \
    Dockerfile \
    README.md

# Créer les dossiers nécessaires
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app

# Passer à l'utilisateur non-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Exposer le port
EXPOSE 3001

# Utiliser dumb-init pour la gestion des signaux
ENTRYPOINT ["dumb-init", "--"]

# Commande de production
CMD ["npm", "start"]

# Multi-stage final
FROM ${NODE_ENV:-development} AS final