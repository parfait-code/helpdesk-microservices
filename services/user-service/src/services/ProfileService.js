// src/services/ProfileService.js
const UserProfile = require('../models/UserProfile');
const UserActivity = require('../models/UserActivity');
const redisClient = require('../config/redis');
const fileServiceClient = require('./FileServiceClient');
const kafkaService = require('./KafkaService');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config');

class ProfileService {
  // Obtenir le profil d'un utilisateur
  async getProfile(userId) {
    try {
      // Vérifier le cache Redis
      const cacheKey = `profile:${userId}`;
      let profile = await redisClient.get(cacheKey);
      
      if (profile) {
        logger.debug('Profile retrieved from cache', { userId });
        return profile;
      }

      // Récupérer depuis la base de données
      profile = await UserProfile.findByUserId(userId);
      
      if (!profile) {
        throw new NotFoundError('Profil utilisateur');
      }

      // Mettre en cache
      await redisClient.set(cacheKey, profile.toJSON(), config.redis.ttl.profile);
      
      return profile.toJSON();
    } catch (error) {
      logger.error('Error getting profile', { userId, error: error.message });
      throw error;
    }
  }

  // Créer un profil utilisateur (appelé après inscription)
  async createProfile(userData) {
    try {
      const existingProfile = await UserProfile.findByUserId(userData.userId);
      
      if (existingProfile) {
        throw new ConflictError('Un profil existe déjà pour cet utilisateur');
      }

      const profile = await UserProfile.create({
        userId: userData.userId,
        email: userData.email,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        preferences: {
          language: 'fr',
          theme: 'light',
          notifications: {
            email: true,
            browser: true,
            sms: false
          },
          timezone: 'Europe/Paris'
        }
      });

      // Publier l'événement
      await kafkaService.publishEvent('profile.created', {
        userId: profile.userId,
        email: profile.email,
        createdAt: profile.createdAt
      });

      // Enregistrer l'activité
      await this.logActivity(profile.userId, 'profile_created', {
        email: profile.email
      });

      logger.info('Profile created', { 
        userId: profile.userId, 
        email: profile.email 
      });

      return profile.toJSON();
    } catch (error) {
      logger.error('Error creating profile', { 
        userId: userData.userId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Mettre à jour le profil
  async updateProfile(userId, updateData, requestInfo = {}) {
    try {
      const profile = await UserProfile.findByUserId(userId);
      
      if (!profile) {
        throw new NotFoundError('Profil utilisateur');
      }

      // Sauvegarder l'ancien profil pour l'audit
      const oldData = profile.toJSON();

      // Mettre à jour le profil
      await profile.update(updateData);

      // Invalider le cache
      const cacheKey = `profile:${userId}`;
      await redisClient.del(cacheKey);

      // Publier l'événement
      await kafkaService.publishEvent('profile.updated', {
        userId: profile.userId,
        oldData,
        newData: profile.toJSON(),
        updatedAt: profile.updatedAt
      });

      // Enregistrer l'activité
      await this.logActivity(userId, 'profile_updated', {
        changes: updateData,
        oldData: this.sanitizeForLog(oldData)
      }, requestInfo);

      logger.info('Profile updated', { 
        userId, 
        changes: Object.keys(updateData) 
      });

      return profile.toJSON();
    } catch (error) {
      logger.error('Error updating profile', { userId, error: error.message });
      throw error;
    }
  }

  // Upload d'avatar
  async uploadAvatar(userId, file, requestInfo = {}) {
    try {
      const profile = await UserProfile.findByUserId(userId);
      
      if (!profile) {
        throw new NotFoundError('Profil utilisateur');
      }

      // Supprimer l'ancien avatar si existant
      if (profile.avatarFileId) {
        await fileServiceClient.deleteFile(profile.avatarFileId, requestInfo.token);
      }

      // Uploader le nouveau fichier
      const uploadResult = await fileServiceClient.uploadAvatar(
        file, 
        userId, 
        requestInfo.token
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Erreur lors de l\'upload');
      }

      // Mettre à jour le profil avec la nouvelle URL d'avatar
      await profile.update({
        avatarUrl: uploadResult.file.url,
        avatarFileId: uploadResult.file.id
      });

      // Invalider le cache
      const cacheKey = `profile:${userId}`;
      await redisClient.del(cacheKey);

      // Publier l'événement
      await kafkaService.publishEvent('avatar.updated', {
        userId,
        avatarUrl: uploadResult.file.url,
        fileId: uploadResult.file.id
      });

      // Enregistrer l'activité
      await this.logActivity(userId, 'avatar_uploaded', {
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype
      }, requestInfo);

      logger.info('Avatar uploaded', { 
        userId, 
        fileName: file.originalname,
        fileSize: file.size 
      });

      return {
        avatarUrl: uploadResult.file.url,
        message: 'Avatar mis à jour avec succès'
      };
    } catch (error) {
      logger.error('Error uploading avatar', { userId, error: error.message });
      throw error;
    }
  }

  // Supprimer l'avatar
  async deleteAvatar(userId, requestInfo = {}) {
    try {
      const profile = await UserProfile.findByUserId(userId);
      
      if (!profile) {
        throw new NotFoundError('Profil utilisateur');
      }

      if (!profile.avatarFileId) {
        return { message: 'Aucun avatar à supprimer' };
      }

      // Supprimer le fichier
      await fileServiceClient.deleteFile(profile.avatarFileId, requestInfo.token);

      // Mettre à jour le profil
      await profile.update({
        avatarUrl: null,
        avatarFileId: null
      });

      // Invalider le cache
      const cacheKey = `profile:${userId}`;
      await redisClient.del(cacheKey);

      // Publier l'événement
      await kafkaService.publishEvent('avatar.deleted', {
        userId,
        deletedFileId: profile.avatarFileId
      });

      // Enregistrer l'activité
      await this.logActivity(userId, 'avatar_deleted', {}, requestInfo);

      logger.info('Avatar deleted', { userId });

      return { message: 'Avatar supprimé avec succès' };
    } catch (error) {
      logger.error('Error deleting avatar', { userId, error: error.message });
      throw error;
    }
  }

  // Obtenir l'historique des activités
  async getActivities(userId, options = {}) {
    try {
      const result = await UserActivity.findByUserId(userId, options);
      
      logger.debug('Activities retrieved', { 
        userId, 
        count: result.activities.length 
      });

      return result;
    } catch (error) {
      logger.error('Error getting activities', { userId, error: error.message });
      throw error;
    }
  }

  // Enregistrer une activité utilisateur
  async logActivity(userId, activityType, activityData = {}, requestInfo = {}) {
    try {
      await UserActivity.create({
        userId,
        activityType,
        activityData,
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.userAgent
      });
    } catch (error) {
      // Les erreurs de log d'activité ne doivent pas faire échouer l'opération principale
      logger.error('Error logging activity', { 
        userId, 
        activityType, 
        error: error.message 
      });
    }
  }

  // Nettoyer les données sensibles pour les logs
  sanitizeForLog(data) {
    const sanitized = { ...data };
    delete sanitized.id;
    delete sanitized.userId;
    return sanitized;
  }
}

module.exports = new ProfileService();

