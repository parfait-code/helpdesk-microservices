// src/controllers/ProfileController.js
const profileService = require('../services/ProfileService');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class ProfileController {
  // GET /users/profile - Obtenir son profil
  async getProfile(req, res, next) {
    try {
      const profile = await profileService.getProfile(req.user.userId);
      
      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /users/profile - Mettre à jour son profil
  async updateProfile(req, res, next) {
    try {
      const requestInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };

      const profile = await profileService.updateProfile(
        req.user.userId, 
        req.validatedData,
        requestInfo
      );
      
      res.json({
        success: true,
        data: profile,
        message: 'Profil mis à jour avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /users/avatar - Upload avatar
  async uploadAvatar(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      const requestInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        token: req.token
      };

      const result = await profileService.uploadAvatar(
        req.user.userId,
        req.file,
        requestInfo
      );
      
      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /users/avatar - Supprimer avatar
  async deleteAvatar(req, res, next) {
    try {
      const requestInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        token: req.token
      };

      const result = await profileService.deleteAvatar(
        req.user.userId,
        requestInfo
      );
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /users/activities - Obtenir ses activités
  async getActivities(req, res, next) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        activityType: req.query.type,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const result = await profileService.getActivities(req.user.userId, options);
      
      res.json({
        success: true,
        data: result.activities,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProfileController();

