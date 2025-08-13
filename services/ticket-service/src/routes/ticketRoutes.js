// src/routes/ticketRoutes.js
const express = require('express');
const { body, param, query } = require('express-validator');
const TicketController = require('../controllers/ticketController');

const router = express.Router();
const ticketController = new TicketController();

// Validations
const createTicketValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('assigneeId')
    .optional()
    .isUUID()
    .withMessage('Assignee ID must be a valid UUID')
];

const updateTicketValidation = [
  param('id').isUUID().withMessage('Ticket ID must be a valid UUID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('status')
    .optional()
    .isIn(['open', 'in_progress', 'pending', 'resolved', 'closed'])
    .withMessage('Status must be open, in_progress, pending, resolved, or closed'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('assigneeId')
    .optional()
    .isUUID()
    .withMessage('Assignee ID must be a valid UUID')
];

const idValidation = [
  param('id').isUUID().withMessage('ID must be a valid UUID')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes principales des tickets
router.post('/', createTicketValidation, ticketController.createTicket.bind(ticketController));
router.get('/', paginationValidation, ticketController.getAllTickets.bind(ticketController));
router.get('/stats', ticketController.getTicketStats.bind(ticketController));
router.get('/:id', idValidation, ticketController.getTicketById.bind(ticketController));
router.put('/:id', updateTicketValidation, ticketController.updateTicket.bind(ticketController));
router.delete('/:id', idValidation, ticketController.deleteTicket.bind(ticketController));

// Routes pour les utilisateurs
router.get('/user/:userId', 
  [param('userId').isUUID().withMessage('User ID must be a valid UUID'), ...paginationValidation],
  ticketController.getUserTickets.bind(ticketController)
);

router.get('/assigned/:assigneeId', 
  [param('assigneeId').isUUID().withMessage('Assignee ID must be a valid UUID'), ...paginationValidation],
  ticketController.getAssignedTickets.bind(ticketController)
);

// Route pour les fichiers (intégration future avec file-service)
router.get('/:ticketId/files', 
  [param('ticketId').isUUID().withMessage('Ticket ID must be a valid UUID')],
  ticketController.getTicketFiles.bind(ticketController)
);

module.exports = router;
