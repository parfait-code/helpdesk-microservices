// src/controllers/ticketController.js
const Ticket = require('../models/Ticket');
const { validationResult } = require('express-validator');

class TicketController {
  constructor() {
    this.ticketModel = new Ticket();
  }

  // Créer un nouveau ticket
  async createTicket(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const ticketData = {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority || 'medium',
        category: req.body.category,
        userId: req.body.userId || req.user?.id, // depuis le middleware auth
        assigneeId: req.body.assigneeId || null
      };

      const ticket = await this.ticketModel.create(ticketData);

      res.status(201).json({
        success: true,
        message: 'Ticket created successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Récupérer tous les tickets
  async getAllTickets(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        category: req.query.category,
        userId: req.query.userId,
        assigneeId: req.query.assigneeId
      };

      // Nettoyer les filtres vides
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });

      const result = await this.ticketModel.findAll(page, limit, filters);

      res.json({
        success: true,
        message: 'Tickets retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Récupérer un ticket par ID
  async getTicketById(req, res) {
    try {
      const { id } = req.params;
      const ticket = await this.ticketModel.findById(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      res.json({
        success: true,
        message: 'Ticket retrieved successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Mettre à jour un ticket
  async updateTicket(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      const ticket = await this.ticketModel.update(id, updateData);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      res.json({
        success: true,
        message: 'Ticket updated successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Supprimer un ticket
  async deleteTicket(req, res) {
    try {
      const { id } = req.params;
      const ticket = await this.ticketModel.delete(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      res.json({
        success: true,
        message: 'Ticket deleted successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Récupérer les tickets d'un utilisateur
  async getUserTickets(req, res) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await this.ticketModel.findByUserId(userId, page, limit);

      res.json({
        success: true,
        message: 'User tickets retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Récupérer les tickets assignés à un utilisateur
  async getAssignedTickets(req, res) {
    try {
      const { assigneeId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await this.ticketModel.findByAssigneeId(assigneeId, page, limit);

      res.json({
        success: true,
        message: 'Assigned tickets retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error fetching assigned tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Statistiques des tickets
  async getTicketStats(req, res) {
    try {
      const stats = await this.ticketModel.getStats();

      res.json({
        success: true,
        message: 'Ticket statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Endpoint pour les fichiers (prêt pour intégration avec file-service)
  async getTicketFiles(req, res) {
    try {
      const { ticketId } = req.params;

      // Vérifier que le ticket existe
      const ticket = await this.ticketModel.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      // Pour l'instant, retourner une réponse de placeholder
      // À intégrer avec le file-service quand il sera prêt
      res.json({
        success: true,
        message: 'File integration endpoint ready',
        ticketId: ticketId,
        files: [],
        status: 'pending-file-service-integration',
        note: 'This endpoint will be connected to file-service when available'
      });
    } catch (error) {
      console.error('Error fetching ticket files:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = TicketController;
