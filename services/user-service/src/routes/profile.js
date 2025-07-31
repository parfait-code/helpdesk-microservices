// src/routes/profile.js
const express = require('express');
const ProfileController = require('../controllers/ProfileController');
const AuthMiddleware = require('../middleware/auth');
const { validateUpdateProfile } = require('../middleware/validation');
const { uploadAvatar, processAvatar, handleUploadError } = require('../middleware/upload');
const { uploadRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

// Toutes les routes de profil nécessitent une authentification
router.use(AuthMiddleware.authenticate());

// GET /users/profile - Obtenir son profil
router.get('/profile', ProfileController.getProfile);

// PUT /users/profile - Mettre à jour son profil
router.put('/profile', 
  validateUpdateProfile,
  ProfileController.updateProfile
);

// POST /users/avatar - Upload avatar
router.post('/avatar',
  uploadRateLimit,
  uploadAvatar,
  handleUploadError,
  processAvatar,
  ProfileController.uploadAvatar
);

// DELETE /users/avatar - Supprimer avatar
router.delete('/avatar', ProfileController.deleteAvatar);

// GET /users/activities - Obtenir ses activités
router.get('/activities', ProfileController.getActivities);

module.exports = router;

