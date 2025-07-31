// src/controllers/AdminController.js
const adminService = require('../services/AdminService');
const { ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

class AdminController {
  // GET /users - Liste des utilisateurs (admin)
  async getUsers(req, res, next) {
    try {
      const result = await adminService.getUsers(req.validatedQuery);
      
      res.json({
        success: true,
        data: result.profiles,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /users/:id - Détails utilisateur (admin)
  async getUser(req, res, next) {
    try {
      const user = await adminService.getUser(req.params.id, req.user.userId);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /users/:id - Modifier utilisateur (admin)
  async updateUser(req, res, next) {
    try {
      const requestInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        token: req.token
      };

      const user = await adminService.updateUser(
        req.params.id,
        req.validatedData,
        req.user.userId,
        requestInfo
      );
      
      res.json({
        success: true,
        data: user,
        message: 'Utilisateur mis à jour avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /users/:id - Supprimer utilisateur (admin)
  async deleteUser(req, res, next) {
    try {
      const requestInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        token: req.token
      };

      const result = await adminService.deleteUser(
        req.params.id,
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

  // PUT /users/:id/role - Changer rôle (admin)
  async changeUserRole(req, res, next) {
    try {
      const requestInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        token: req.token
      };

      const result = await adminService.changeUserRole(
        req.params.id,
        req.validatedData.role,
        req.user.userId,
        requestInfo
      );
      
      res.json({
        success: true,
        data: { role: result.newRole },
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /users/stats - Statistiques (admin)
  async getStats(req, res, next) {
    try {
      const stats = await adminService.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();