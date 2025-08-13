// src/routes/index.js
const express = require('express');
const ticketRoutes = require('./ticketRoutes');

const router = express.Router();

// Version de l'API
router.use('/v1/tickets', ticketRoutes);

// Route de test de l'API
router.get('/v1/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Ticket Service API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
