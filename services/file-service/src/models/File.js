const database = require('../database');
const logger = require('../utils/logger');

class FileModel {
    constructor() {
        this.tableName = 'files';
        this.logTableName = 'file_logs';
    }

    // Créer un nouveau fichier
    async create(fileData) {
        try {
            const query = `
                INSERT INTO ${this.tableName} (
                    original_name, filename, mime_type, size, bucket, object_key,
                    ticket_id, user_id, uploaded_by, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const values = [
                fileData.original_name,
                fileData.filename,
                fileData.mime_type,
                fileData.size,
                fileData.bucket,
                fileData.object_key,
                fileData.ticket_id,
                fileData.user_id,
                fileData.uploaded_by,
                JSON.stringify(fileData.metadata || {})
            ];

            const result = await database.query(query, values);
            
            // Logger l'action
            await this.logAction(result.rows[0].id, 'UPLOAD', fileData.uploaded_by, {
                original_name: fileData.original_name,
                size: fileData.size,
                mime_type: fileData.mime_type
            });

            return result.rows[0];

        } catch (error) {
            logger.error('Error creating file record:', error);
            throw error;
        }
    }

    // Obtenir un fichier par ID
    async findById(id, includeDeleted = false) {
        try {
            let query = `
                SELECT f.*, 
                       (f.metadata->>'is_public')::boolean as is_public,
                       (f.metadata->>'description') as description
                FROM ${this.tableName} f
                WHERE f.id = $1
            `;

            if (!includeDeleted) {
                query += ' AND f.is_deleted = FALSE';
            }

            const result = await database.query(query, [id]);
            return result.rows[0] || null;

        } catch (error) {
            logger.error('Error finding file by ID:', error);
            throw error;
        }
    }

    // Obtenir les fichiers d'un ticket
    async findByTicketId(ticketId, options = {}) {
        try {
            const {
                includeDeleted = false,
                limit = 50,
                offset = 0,
                orderBy = 'upload_date',
                orderDirection = 'DESC'
            } = options;

            let query = `
                SELECT f.*,
                       (f.metadata->>'is_public')::boolean as is_public,
                       (f.metadata->>'description') as description
                FROM ${this.tableName} f
                WHERE f.ticket_id = $1
            `;

            const values = [ticketId];

            if (!includeDeleted) {
                query += ' AND f.is_deleted = FALSE';
            }

            query += ` ORDER BY f.${orderBy} ${orderDirection}`;
            query += ' LIMIT $2 OFFSET $3';
            values.push(limit, offset);

            const result = await database.query(query, values);
            return result.rows;

        } catch (error) {
            logger.error('Error finding files by ticket ID:', error);
            throw error;
        }
    }

    // Obtenir les fichiers d'un utilisateur
    async findByUserId(userId, options = {}) {
        try {
            const {
                includeDeleted = false,
                limit = 50,
                offset = 0,
                orderBy = 'upload_date',
                orderDirection = 'DESC'
            } = options;

            let query = `
                SELECT f.*,
                       (f.metadata->>'is_public')::boolean as is_public,
                       (f.metadata->>'description') as description
                FROM ${this.tableName} f
                WHERE f.user_id = $1
            `;

            const values = [userId];

            if (!includeDeleted) {
                query += ' AND f.is_deleted = FALSE';
            }

            query += ` ORDER BY f.${orderBy} ${orderDirection}`;
            query += ' LIMIT $2 OFFSET $3';
            values.push(limit, offset);

            const result = await database.query(query, values);
            return result.rows;

        } catch (error) {
            logger.error('Error finding files by user ID:', error);
            throw error;
        }
    }

    // Rechercher des fichiers
    async search(criteria = {}) {
        try {
            const {
                ticket_id,
                user_id,
                mime_type,
                start_date,
                end_date,
                is_public,
                search_text,
                page = 1,
                limit = 20
            } = criteria;

            let query = `
                SELECT f.*,
                       (f.metadata->>'is_public')::boolean as is_public,
                       (f.metadata->>'description') as description,
                       COUNT(*) OVER() as total_count
                FROM ${this.tableName} f
                WHERE f.is_deleted = FALSE
            `;

            const values = [];
            let paramIndex = 1;

            // Filtres
            if (ticket_id) {
                query += ` AND f.ticket_id = $${paramIndex++}`;
                values.push(ticket_id);
            }

            if (user_id) {
                query += ` AND f.user_id = $${paramIndex++}`;
                values.push(user_id);
            }

            if (mime_type) {
                query += ` AND f.mime_type LIKE $${paramIndex++}`;
                values.push(`${mime_type}%`);
            }

            if (start_date) {
                query += ` AND f.upload_date >= $${paramIndex++}`;
                values.push(start_date);
            }

            if (end_date) {
                query += ` AND f.upload_date <= $${paramIndex++}`;
                values.push(end_date);
            }

            if (typeof is_public === 'boolean') {
                query += ` AND (f.metadata->>'is_public')::boolean = $${paramIndex++}`;
                values.push(is_public);
            }

            if (search_text) {
                query += ` AND (f.original_name ILIKE $${paramIndex++} OR f.metadata->>'description' ILIKE $${paramIndex++})`;
                values.push(`%${search_text}%`, `%${search_text}%`);
                paramIndex++; // Pour le deuxième paramètre
            }

            // Pagination
            const offset = (page - 1) * limit;
            query += ` ORDER BY f.upload_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
            values.push(limit, offset);

            const result = await database.query(query, values);
            
            return {
                files: result.rows,
                totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
                page,
                limit,
                totalPages: result.rows.length > 0 ? Math.ceil(parseInt(result.rows[0].total_count) / limit) : 0
            };

        } catch (error) {
            logger.error('Error searching files:', error);
            throw error;
        }
    }

    // Mettre à jour un fichier
    async update(id, updateData, userId) {
        try {
            const currentFile = await this.findById(id);
            if (!currentFile) {
                throw new Error('File not found');
            }

            const allowedFields = ['original_name', 'metadata'];
            const setClause = [];
            const values = [];
            let paramIndex = 1;

            // Construire la clause SET dynamiquement
            for (const [field, value] of Object.entries(updateData)) {
                if (allowedFields.includes(field)) {
                    if (field === 'metadata') {
                        // Fusionner avec les métadonnées existantes
                        const currentMetadata = currentFile.metadata || {};
                        const newMetadata = { ...currentMetadata, ...value };
                        setClause.push(`${field} = $${paramIndex++}`);
                        values.push(JSON.stringify(newMetadata));
                    } else {
                        setClause.push(`${field} = $${paramIndex++}`);
                        values.push(value);
                    }
                }
            }

            if (setClause.length === 0) {
                return currentFile; // Aucune modification
            }

            const query = `
                UPDATE ${this.tableName} 
                SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex++} AND is_deleted = FALSE
                RETURNING *
            `;

            values.push(id);

            const result = await database.query(query, values);
            
            if (result.rows.length > 0) {
                // Logger l'action
                await this.logAction(id, 'UPDATE', userId, { 
                    updated_fields: Object.keys(updateData) 
                });
                
                return result.rows[0];
            }

            return null;

        } catch (error) {
            logger.error('Error updating file:', error);
            throw error;
        }
    }

    // Supprimer un fichier (soft delete)
    async delete(id, userId) {
        try {
            const query = `
                UPDATE ${this.tableName}
                SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_deleted = FALSE
                RETURNING *
            `;

            const result = await database.query(query, [id]);
            
            if (result.rows.length > 0) {
                // Logger l'action
                await this.logAction(id, 'DELETE', userId);
                return result.rows[0];
            }

            return null;

        } catch (error) {
            logger.error('Error deleting file:', error);
            throw error;
        }
    }

    // Supprimer définitivement un fichier
    async hardDelete(id, userId) {
        try {
            // D'abord supprimer les logs associés
            await database.query(`DELETE FROM ${this.logTableName} WHERE file_id = $1`, [id]);
            
            // Ensuite supprimer le fichier
            const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
            const result = await database.query(query, [id]);

            if (result.rows.length > 0) {
                logger.warn('File permanently deleted:', {
                    fileId: id,
                    deletedBy: userId,
                    fileName: result.rows[0].original_name
                });
                
                return result.rows[0];
            }

            return null;

        } catch (error) {
            logger.error('Error hard deleting file:', error);
            throw error;
        }
    }

    // Compter les fichiers d'un ticket
    async countByTicketId(ticketId) {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM ${this.tableName}
                WHERE ticket_id = $1 AND is_deleted = FALSE
            `;

            const result = await database.query(query, [ticketId]);
            return parseInt(result.rows[0].count);

        } catch (error) {
            logger.error('Error counting files by ticket ID:', error);
            throw error;
        }
    }

    // Obtenir les statistiques des fichiers
    async getStats(userId = null, ticketId = null) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_files,
                    SUM(size) as total_size,
                    COUNT(DISTINCT ticket_id) as unique_tickets,
                    AVG(size) as average_size,
                    COUNT(CASE WHEN mime_type LIKE 'image/%' THEN 1 END) as image_count,
                    COUNT(CASE WHEN mime_type = 'application/pdf' THEN 1 END) as pdf_count,
                    COUNT(CASE WHEN mime_type LIKE 'text/%' THEN 1 END) as text_count
                FROM ${this.tableName}
                WHERE is_deleted = FALSE
            `;

            const values = [];
            let paramIndex = 1;

            if (userId) {
                query += ` AND user_id = $${paramIndex++}`;
                values.push(userId);
            }

            if (ticketId) {
                query += ` AND ticket_id = $${paramIndex++}`;
                values.push(ticketId);
            }

            const result = await database.query(query, values);
            return result.rows[0];

        } catch (error) {
            logger.error('Error getting file stats:', error);
            throw error;
        }
    }

    // Logger une action sur un fichier
    async logAction(fileId, action, userId, details = {}, req = null) {
        try {
            const query = `
                INSERT INTO ${this.logTableName} (file_id, action, user_id, ip_address, user_agent, details)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;

            const values = [
                fileId,
                action,
                userId,
                req?.ip || null,
                req?.get('User-Agent')?.substring(0, 255) || null,
                JSON.stringify(details)
            ];

            await database.query(query, values);

        } catch (error) {
            logger.error('Error logging file action:', error);
            // Ne pas faire échouer l'opération principale si le logging échoue
        }
    }

    // Obtenir l'historique d'un fichier
    async getHistory(fileId, limit = 50) {
        try {
            const query = `
                SELECT * FROM ${this.logTableName}
                WHERE file_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `;

            const result = await database.query(query, [fileId, limit]);
            return result.rows;

        } catch (error) {
            logger.error('Error getting file history:', error);
            throw error;
        }
    }
}

const fileModel = new FileModel();

module.exports = fileModel;
