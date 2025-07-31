// src/services/AdminService.js
const UserProfile = require('../models/UserProfile');
const UserActivity = require('../models/UserActivity');
const authServiceClient = require('./AuthServiceClient');
const redisClient = require('../config/redis');
const kafkaService = require('./KafkaService');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config');

class AdminService {
  // Obtenir la liste des utilisateurs avec pagination
  async getUsers(options = {}) {
    try {
      // Vérifier le cache pour les listes courtes
      const cacheKey = `users:list:${JSON.stringify(options)}`;
      let result = await redisClient.get(cacheKey);
      
      if (result && options.page === 1 && options.limit <= 20) {
        logger.debug('Users list retrieved from cache');
        return result;
      }

      result = await UserProfile.findAll(options);

      // Mettre en cache seulement pour les premières pages
      if (options.page === 1 && options.limit <= 20) {
        await redisClient.set(cacheKey, result, config.redis.ttl.userList);
      }

      logger.info('Users list retrieved', { 
        page: options.page, 
        count: result.profiles.length,
        total: result.pagination.total 
      });

      return result;
    } catch (error) {
      logger.error('Error getting users', { error: error.message });
      throw error;
    }
  }

  // Obtenir un utilisateur spécifique
  async getUser(userId, requestingUserId) {
    try {
      const profile = await UserProfile.findByUserId(userId);
      
      if (!profile) {
        throw new NotFoundError('Utilisateur');
      }

      // Enregistrer l'activité de consultation
      await this.logAdminActivity(requestingUserId, 'user_viewed', {
        targetUserId: userId,
        targetEmail: profile.email
      });

      logger.info('User details retrieved', { 
        userId, 
        requestingUserId 
      });

      return profile.toJSON();
    } catch (error) {
      logger.error('Error getting user', { userId, error: error.message });
      throw error;
    }
  }

  // Mettre à jour un utilisateur
  async updateUser(userId, updateData, requestingUserId, requestInfo = {}) {
    try {
      const profile = await UserProfile.findByUserId(userId);
      
      if (!profile) {
        throw new NotFoundError('Utilisateur');
      }

      const oldData = profile.toJSON();
      await profile.update(updateData);

      // Invalider les caches
      await redisClient.del(`profile:${userId}`);
      await this.invalidateUserListCache();

      // Publier l'événement
      await kafkaService.publishEvent('user.admin_updated', {
        userId,
        updatedBy: requestingUserId,
        oldData,
        newData: profile.toJSON(),
        updatedAt: profile.updatedAt
      });

      // Enregistrer les activités
      await this.logAdminActivity(requestingUserId, 'user_updated', {
        targetUserId: userId,
        targetEmail: profile.email,
        changes: updateData
      }, requestInfo);

      await UserActivity.create({
        userId,
        activityType: 'profile_updated_by_admin',
        activityData: {
          updatedBy: requestingUserId,
          changes: updateData
        },
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.userAgent
      });

      logger.info('User updated by admin', { 
        userId, 
        updatedBy: requestingUserId,
        changes: Object.keys(updateData)
      });

      return profile.toJSON();
    } catch (error) {
      logger.error('Error updating user', { 
        userId, 
        requestingUserId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Supprimer un utilisateur
  async deleteUser(userId, requestingUserId, requestInfo = {}) {
    try {
      const profile = await UserProfile.findByUserId(userId);
      
      if (!profile) {
        throw new NotFoundError('Utilisateur');
      }

      // Empêcher la suppression de son propre compte
      if (userId === requestingUserId) {
        throw new ForbiddenError('Impossible de supprimer votre propre compte');
      }

      const userData = profile.toJSON();
      await profile.delete();

      // Invalider les caches
      await redisClient.del(`profile:${userId}`);
      await this.invalidateUserListCache();

      // Publier l'événement
      await kafkaService.publishEvent('user.deleted', {
        userId,
        deletedBy: requestingUserId,
        userData,
        deletedAt: new Date().toISOString()
      });

      // Enregistrer l'activité
      await this.logAdminActivity(requestingUserId, 'user_deleted', {
        targetUserId: userId,
        targetEmail: userData.email
      }, requestInfo);

      logger.warn('User deleted by admin', { 
        userId, 
        deletedBy: requestingUserId,
        email: userData.email
      });

      return { message: 'Utilisateur supprimé avec succès' };
    } catch (error) {
      logger.error('Error deleting user', { 
        userId, 
        requestingUserId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Changer le rôle d'un utilisateur
  async changeUserRole(userId, newRole, requestingUserId, requestInfo = {}) {
    try {
      const profile = await UserProfile.findByUserId(userId);
      
      if (!profile) {
        throw new NotFoundError('Utilisateur');
      }

      // Empêcher de modifier son propre rôle
      if (userId === requestingUserId) {
        throw new ForbiddenError('Impossible de modifier votre propre rôle');
      }

      // Cette opération nécessite une communication avec l'Auth Service
      // Car les rôles sont gérés là-bas
      const roleChangeResult = await authServiceClient.changeUserRole(
        userId, 
        newRole, 
        requestInfo.token
      );

      if (!roleChangeResult.success) {
        throw new Error(roleChangeResult.error || 'Erreur lors du changement de rôle');
      }

      // Publier l'événement
      await kafkaService.publishEvent('user.role_changed', {
        userId,
        newRole,
        changedBy: requestingUserId,
        changedAt: new Date().toISOString()
      });

      // Enregistrer les activités
      await this.logAdminActivity(requestingUserId, 'role_changed', {
        targetUserId: userId,
        targetEmail: profile.email,
        newRole
      }, requestInfo);

      await UserActivity.create({
        userId,
        activityType: 'role_changed',
        activityData: {
          newRole,
          changedBy: requestingUserId
        },
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.userAgent
      });

      logger.warn('User role changed', { 
        userId, 
        newRole, 
        changedBy: requestingUserId 
      });

      return { 
        message: 'Rôle utilisateur modifié avec succès',
        newRole 
      };
    } catch (error) {
      logger.error('Error changing user role', { 
        userId, 
        newRole, 
        requestingUserId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Obtenir les statistiques
  async getStats() {
    try {
      const cacheKey = 'admin:stats';
      let stats = await redisClient.get(cacheKey);
      
      if (stats) {
        return stats;
      }

      stats = await UserProfile.getStats();
      
      // Ajouter les statistiques d'activité
      const activityStats = await UserActivity.getActivityTypes();
      stats.activityTypes = activityStats;

      // Mettre en cache pour 5 minutes
      await redisClient.set(cacheKey, stats, 300);

      logger.info('Stats retrieved', { totalUsers: stats.total_users });

      return stats;
    } catch (error) {
      logger.error('Error getting stats', { error: error.message });
      throw error;
    }
  }

  // Enregistrer une activité admin
  async logAdminActivity(adminUserId, activityType, activityData = {}, requestInfo = {}) {
    try {
      await UserActivity.create({
        userId: adminUserId,
        activityType: `admin_${activityType}`,
        activityData,
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.userAgent
      });
    } catch (error) {
      logger.error('Error logging admin activity', { 
        adminUserId, 
        activityType, 
        error: error.message 
      });
    }
  }

  // Invalider le cache des listes d'utilisateurs
  async invalidateUserListCache() {
    try {
      // Invalider tous les caches de liste d'utilisateurs
      const keys = await redisClient.getClient().keys(`${config.redis.keyPrefix}users:list:*`);
      if (keys.length > 0) {
        await redisClient.getClient().del(keys);
      }
    } catch (error) {
      logger.error('Error invalidating cache', { error: error.message });
    }
  }
}

module.exports = new AdminService();