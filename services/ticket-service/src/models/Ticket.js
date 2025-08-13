// src/models/Ticket.js
const { Pool } = require('pg');
const config = require('../config');

class Ticket {
  constructor() {
    this.pool = new Pool(config.database);
  }

  // Créer un nouveau ticket
  async create(ticketData) {
    const {
      title,
      description,
      priority = 'medium',
      category,
      userId,
      assigneeId = null,
      status = 'open'
    } = ticketData;

    const query = `
      INSERT INTO tickets (
        title, description, priority, category, user_id, assignee_id, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const values = [title, description, priority, category, userId, assigneeId, status];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // Récupérer un ticket par ID
  async findById(id) {
    const query = `
      SELECT t.*, 
             u.email as user_email, 
             a.email as assignee_email
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assignee_id = a.id
      WHERE t.id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer tous les tickets avec pagination
  async findAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    // Filtres dynamiques
    if (filters.status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.priority) {
      whereClause += ` AND priority = $${paramIndex}`;
      values.push(filters.priority);
      paramIndex++;
    }

    if (filters.category) {
      whereClause += ` AND category = $${paramIndex}`;
      values.push(filters.category);
      paramIndex++;
    }

    if (filters.userId) {
      whereClause += ` AND user_id = $${paramIndex}`;
      values.push(filters.userId);
      paramIndex++;
    }

    if (filters.assigneeId) {
      whereClause += ` AND assignee_id = $${paramIndex}`;
      values.push(filters.assigneeId);
      paramIndex++;
    }

    const query = `
      SELECT t.*, 
             u.email as user_email, 
             a.email as assignee_email,
             COUNT(*) OVER() as total_count
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assignee_id = a.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const result = await this.pool.query(query, values);
    
    return {
      tickets: result.rows,
      totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
      page,
      limit,
      totalPages: result.rows.length > 0 ? Math.ceil(result.rows[0].total_count / limit) : 0
    };
  }

  // Mettre à jour un ticket
  async update(id, updateData) {
    const allowedFields = ['title', 'description', 'priority', 'category', 'status', 'assignee_id'];
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updateData[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE tickets 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // Supprimer un ticket
  async delete(id) {
    const query = 'DELETE FROM tickets WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer les tickets par utilisateur
  async findByUserId(userId, page = 1, limit = 10) {
    return this.findAll(page, limit, { userId });
  }

  // Récupérer les tickets assignés à un utilisateur
  async findByAssigneeId(assigneeId, page = 1, limit = 10) {
    return this.findAll(page, limit, { assigneeId });
  }

  // Statistiques des tickets
  async getStats() {
    const query = `
      SELECT 
        status,
        priority,
        COUNT(*) as count
      FROM tickets
      GROUP BY status, priority
      ORDER BY status, priority
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}

module.exports = Ticket;
