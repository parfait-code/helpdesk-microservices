const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class AuthMiddleware {
    constructor() {
        this.authServiceUrl = config.services.auth.url;
        this.jwtSecret = config.security.jwtSecret;
        this.timeout = config.services.auth.timeout;
    }

    // Middleware principal d'authentification
    authenticate() {
        return async (req, res, next) => {
            try {
                const token = this.extractToken(req);
                
                if (!token) {
                    return res.status(401).json({
                        success: false,
                        error: 'Token d\'authentification requis'
                    });
                }

                // Vérifier le token JWT localement d'abord
                const decoded = await this.verifyJWT(token);
                
                if (!decoded) {
                    return res.status(401).json({
                        success: false,
                        error: 'Token invalide'
                    });
                }

                // Vérifier avec le service d'authentification si nécessaire
                const userInfo = await this.validateWithAuthService(token);
                
                if (!userInfo) {
                    return res.status(401).json({
                        success: false,
                        error: 'Utilisateur non authentifié'
                    });
                }

                // Ajouter les informations utilisateur à la requête
                req.user = {
                    id: userInfo.id || decoded.userId,
                    email: userInfo.email || decoded.email,
                    role: userInfo.role || decoded.role,
                    permissions: userInfo.permissions || decoded.permissions || [],
                    token: token
                };

                next();

            } catch (error) {
                logger.error('Authentication error:', error);
                res.status(401).json({
                    success: false,
                    error: 'Erreur d\'authentification'
                });
            }
        };
    }

    // Middleware pour vérifier les permissions
    requirePermission(permission) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentification requise'
                });
            }

            const userPermissions = req.user.permissions || [];
            const userRole = req.user.role;

            logger.info(`DEBUG: Checking permission ${permission} for user role: ${userRole}`);

            // Les admins ont toutes les permissions
            if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'user') {
                logger.info(`Full access granted for role: ${userRole}`);
                return next();
            }

            // Vérifier la permission spécifique
            if (userPermissions.includes(permission)) {
                return next();
            }

            // Permissions par rôle pour les fichiers
            const rolePermissions = {
                'admin': ['file:read', 'file:upload', 'file:delete', 'file:stats', 'file:manage'],
                'support': ['file:read', 'file:upload', 'file:delete:own', 'file:stats'],
                'user': ['file:read:own', 'file:upload:own', 'file:upload', 'file:read', 'file:stats']
            };

            const allowedPermissions = rolePermissions[userRole] || [];
            
            if (allowedPermissions.includes(permission)) {
                return next();
            }

            logger.warn('Permission denied:', {
                userId: req.user.id,
                role: userRole,
                requiredPermission: permission,
                userPermissions: userPermissions
            });

            res.status(403).json({
                success: false,
                error: 'Permission insuffisante'
            });
        };
    }

    // Middleware pour vérifier la propriété d'un fichier
    requireFileOwnership() {
        return async (req, res, next) => {
            try {
                const fileId = req.params.id;
                const userId = req.user.id;
                const userRole = req.user.role;

                // Les admins et support peuvent accéder à tous les fichiers
                if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'support') {
                    return next();
                }

                // Vérifier dans la base de données si l'utilisateur est propriétaire
                const database = require('../database');
                const result = await database.query(
                    'SELECT user_id, uploaded_by FROM files WHERE id = $1 AND is_deleted = FALSE',
                    [fileId]
                );

                if (result.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Fichier non trouvé'
                    });
                }

                const file = result.rows[0];
                
                // Vérifier si l'utilisateur est le propriétaire ou celui qui a uploadé le fichier
                if (file.user_id !== userId && file.uploaded_by !== userId) {
                    return res.status(403).json({
                        success: false,
                        error: 'Accès non autorisé à ce fichier'
                    });
                }

                next();

            } catch (error) {
                logger.error('File ownership check error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la vérification des droits'
                });
            }
        };
    }

    // Extraire le token de la requête
    extractToken(req) {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Vérifier aussi dans les cookies si disponible
        if (req.cookies && req.cookies.token) {
            return req.cookies.token;
        }

        return null;
    }

    // Vérifier le JWT localement
    async verifyJWT(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return decoded;
        } catch (error) {
            logger.warn('JWT verification failed:', error.message);
            return null;
        }
    }

    // Valider avec le service d'authentification
    async validateWithAuthService(token) {
        try {
            const response = await axios.get(`${this.authServiceUrl}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            if (response.data && response.data.success) {
                return response.data.user;
            }

            return null;

        } catch (error) {
            if (error.response?.status === 401) {
                logger.warn('Token validation failed with auth service');
                return null;
            }
            
            // En cas d'erreur de service, on fait confiance au JWT local
            logger.warn('Auth service unavailable, relying on local JWT validation:', error.message);
            return this.verifyJWT(token);
        }
    }

    // Middleware optionnel pour les routes publiques
    optionalAuth() {
        return async (req, res, next) => {
            try {
                const token = this.extractToken(req);
                
                if (token) {
                    const decoded = await this.verifyJWT(token);
                    if (decoded) {
                        const userInfo = await this.validateWithAuthService(token);
                        if (userInfo) {
                            req.user = {
                                id: userInfo.id || decoded.userId,
                                email: userInfo.email || decoded.email,
                                role: userInfo.role || decoded.role,
                                permissions: userInfo.permissions || decoded.permissions || [],
                                token: token
                            };
                        }
                    }
                }

                next();

            } catch (error) {
                // En cas d'erreur, on continue sans authentification
                logger.debug('Optional auth failed:', error.message);
                next();
            }
        };
    }
}

const authMiddleware = new AuthMiddleware();

module.exports = authMiddleware;
