// src/routes/admin.js
const express = require('express');
const AdminController = require('../controllers/AdminController');
const AuthMiddleware = require('../middleware/auth');
const { 
  validateAdminUpdateUser, 
  validateChangeRole, 
  validateUserQuery 
} = require('../middleware/validation');
const { adminRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

// Toutes les routes admin nécessitent une authentification et le rôle admin
router.use(AuthMiddleware.authenticate());
router.use(AuthMiddleware.authorize(['admin']));
router.use(adminRateLimit);

// GET /users - Liste des utilisateurs
router.get('/', 
  validateUserQuery,
  AdminController.getUsers
);

// GET /users/stats - Statistiques
router.get('/stats', AdminController.getStats);

// GET /users/:id - Détails utilisateur
router.get('/:id', AdminController.getUser);

// PUT /users/:id - Modifier utilisateur
router.put('/:id', 
  validateAdminUpdateUser,
  AdminController.updateUser
);

// DELETE /users/:id - Supprimer utilisateur
router.delete('/:id', AdminController.deleteUser);

// PUT /users/:id/role - Changer rôle
router.put('/:id/role', 
  validateChangeRole,
  AdminController.changeUserRole
);

module.exports = router;

