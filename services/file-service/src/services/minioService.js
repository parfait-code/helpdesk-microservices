const Minio = require('minio');
const config = require('../config');
const logger = require('../utils/logger');

class MinioService {
    constructor() {
        this.client = null;
        this.bucketName = config.minio.bucketName;
        this.isConnected = false;
    }

    async initialize() {
        try {
            // Créer le client MinIO
            this.client = new Minio.Client({
                endPoint: config.minio.endpoint,
                port: config.minio.port,
                useSSL: config.minio.useSSL,
                accessKey: config.minio.accessKey,
                secretKey: config.minio.secretKey,
            });

            // Vérifier la connexion
            await this.client.listBuckets();
            this.isConnected = true;
            logger.info('✅ MinIO connection established');

            // Créer le bucket s'il n'existe pas
            await this.ensureBucket();

        } catch (error) {
            logger.error('❌ MinIO connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async ensureBucket() {
        try {
            const bucketExists = await this.client.bucketExists(this.bucketName);
            
            if (!bucketExists) {
                await this.client.makeBucket(this.bucketName, 'us-east-1');
                logger.info(`✅ Bucket '${this.bucketName}' created successfully`);

                // Définir la politique du bucket pour permettre l'accès en lecture aux fichiers publics
                const policy = {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: { AWS: ['*'] },
                            Action: ['s3:GetObject'],
                            Resource: [`arn:aws:s3:::${this.bucketName}/public/*`]
                        }
                    ]
                };

                await this.client.setBucketPolicy(this.bucketName, JSON.stringify(policy));
                logger.info(`✅ Bucket policy set for '${this.bucketName}'`);
            } else {
                logger.info(`✅ Bucket '${this.bucketName}' already exists`);
            }
        } catch (error) {
            logger.error(`❌ Error ensuring bucket '${this.bucketName}':`, error);
            throw error;
        }
    }

    async uploadFile(fileBuffer, objectName, contentType, metadata = {}) {
        try {
            if (!this.isConnected) {
                throw new Error('MinIO service not connected');
            }

            const uploadMetadata = {
                'Content-Type': contentType,
                'uploaded-at': new Date().toISOString(),
                ...metadata
            };

            const result = await this.client.putObject(
                this.bucketName,
                objectName,
                fileBuffer,
                fileBuffer.length,
                uploadMetadata
            );

            logger.info('File uploaded to MinIO:', {
                objectName,
                size: fileBuffer.length,
                contentType
            });

            return {
                success: true,
                objectName,
                size: fileBuffer.length,
                etag: result.etag
            };

        } catch (error) {
            logger.error('Error uploading file to MinIO:', error);
            throw error;
        }
    }

    async downloadFile(objectName) {
        try {
            if (!this.isConnected) {
                throw new Error('MinIO service not connected');
            }

            const dataStream = await this.client.getObject(this.bucketName, objectName);
            
            return new Promise((resolve, reject) => {
                const chunks = [];
                
                dataStream.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                
                dataStream.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer);
                });
                
                dataStream.on('error', (error) => {
                    reject(error);
                });
            });

        } catch (error) {
            logger.error('Error downloading file from MinIO:', error);
            throw error;
        }
    }

    async deleteFile(objectName) {
        try {
            if (!this.isConnected) {
                throw new Error('MinIO service not connected');
            }

            await this.client.removeObject(this.bucketName, objectName);
            
            logger.info('File deleted from MinIO:', { objectName });
            return { success: true };

        } catch (error) {
            logger.error('Error deleting file from MinIO:', error);
            throw error;
        }
    }

    async getFileStats(objectName) {
        try {
            if (!this.isConnected) {
                throw new Error('MinIO service not connected');
            }

            const stats = await this.client.statObject(this.bucketName, objectName);
            return stats;

        } catch (error) {
            if (error.code === 'NotFound') {
                return null;
            }
            logger.error('Error getting file stats from MinIO:', error);
            throw error;
        }
    }

    async generatePresignedUrl(objectName, expires = 7 * 24 * 60 * 60) { // 7 jours par défaut
        try {
            if (!this.isConnected) {
                throw new Error('MinIO service not connected');
            }

            const url = await this.client.presignedGetObject(
                this.bucketName,
                objectName,
                expires
            );

            return url;

        } catch (error) {
            logger.error('Error generating presigned URL:', error);
            throw error;
        }
    }

    async generateUploadUrl(objectName, expires = 60 * 60) { // 1 heure par défaut
        try {
            if (!this.isConnected) {
                throw new Error('MinIO service not connected');
            }

            const url = await this.client.presignedPutObject(
                this.bucketName,
                objectName,
                expires
            );

            return url;

        } catch (error) {
            logger.error('Error generating upload URL:', error);
            throw error;
        }
    }

    async listFiles(prefix = '', recursive = false, maxKeys = 1000) {
        try {
            if (!this.isConnected) {
                throw new Error('MinIO service not connected');
            }

            const objectsStream = this.client.listObjects(this.bucketName, prefix, recursive);
            const objects = [];

            return new Promise((resolve, reject) => {
                objectsStream.on('data', (obj) => {
                    objects.push(obj);
                    if (objects.length >= maxKeys) {
                        objectsStream.destroy();
                        resolve(objects);
                    }
                });

                objectsStream.on('end', () => {
                    resolve(objects);
                });

                objectsStream.on('error', (error) => {
                    reject(error);
                });
            });

        } catch (error) {
            logger.error('Error listing files from MinIO:', error);
            throw error;
        }
    }

    async healthCheck() {
        try {
            if (!this.client) {
                return {
                    status: 'unhealthy',
                    connected: false,
                    error: 'MinIO client not initialized'
                };
            }

            // Test simple : lister les buckets
            await this.client.listBuckets();
            
            return {
                status: 'healthy',
                connected: this.isConnected,
                bucket: this.bucketName,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    getPublicUrl(objectName) {
        if (this.isConnected && config.minio.useSSL === false) {
            return `http://${config.minio.endpoint}:${config.minio.port}/${this.bucketName}/${objectName}`;
        } else if (this.isConnected) {
            return `https://${config.minio.endpoint}/${this.bucketName}/${objectName}`;
        }
        return null;
    }

    // Générer un chemin d'objet organisé par date et type
    generateObjectPath(filename, ticketId, isPublic = false) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        const visibility = isPublic ? 'public' : 'private';
        return `${visibility}/${year}/${month}/${day}/tickets/${ticketId}/${filename}`;
    }
}

const minioService = new MinioService();

module.exports = minioService;
