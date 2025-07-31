// src/models/UserProfile.js
const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class UserProfile {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id || data.userId;
    this.email = data.email;
    this.firstName = data.first_name || data.firstName;
    this.lastName = data.last_name || data.lastName;
    this.phone = data.phone;
    this.department = data.department;
    this.jobTitle = data.job_title || data.jobTitle;
    this.avatarUrl = data.avatar_url || data.avatarUrl;
    this.avatarFileId = data.avatar_file_id || data.avatarFileId;
    this.preferences = data.preferences || {};
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  static async findByUserId(userId) {
    try {
      const query = `
        SELECT * FROM user_profiles 
        WHERE user_id = $1
      `;
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new UserProfile(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find profile: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const query = `
        SELECT * FROM user_profiles 
        WHERE email = $1
      `;
      const result = await database.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new UserProfile(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to find profile by email: ${error.message}`);
    }
  }

  static async create(profileData) {
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO user_profiles (
          id, user_id, email, first_name, last_name, 
          phone, department, job_title, preferences
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        id,
        profileData.userId,
        profileData.email,
        profileData.firstName || null,
        profileData.lastName || null,
        profileData.phone || null,
        profileData.department || null,
        profileData.jobTitle || null,
        JSON.stringify(profileData.preferences || {})
      ];
      
      const result = await database.query(query, values);
      return new UserProfile(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // unique violation
        throw new Error('Profile already exists for this user');
      }
      throw new Error(`Failed to create profile: ${error.message}`);
    }
  }

  async update(updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Build dynamic update query
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          switch (key) {
            case 'firstName':
              fields.push(`first_name = $${paramCount}`);
              break;
            case 'lastName':
              fields.push(`last_name = $${paramCount}`);
              break;
            case 'jobTitle':
              fields.push(`job_title = $${paramCount}`);
              break;
            case 'avatarUrl':
              fields.push(`avatar_url = $${paramCount}`);
              break;
            case 'avatarFileId':
              fields.push(`avatar_file_id = $${paramCount}`);
              break;
            case 'preferences':
              fields.push(`preferences = $${paramCount}`);
              values.push(JSON.stringify(updateData[key]));
              paramCount++;
              return;
            default:
              fields.push(`${key} = $${paramCount}`);
          }
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        return this;
      }

      values.push(this.userId);
      const query = `
        UPDATE user_profiles 
        SET ${fields.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING *
      `;

      const result = await database.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Profile not found');
      }

      Object.assign(this, new UserProfile(result.rows[0]));
      return this;
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  async delete() {
    try {
      const query = `
        DELETE FROM user_profiles 
        WHERE user_id = $1
        RETURNING *
      `;
      const result = await database.query(query, [this.userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Profile not found');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Failed to delete profile: ${error.message}`);
    }
  }

  static async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        department,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 1;

      // Search functionality
      if (search) {
        whereConditions.push(`(
          first_name ILIKE $${paramCount} OR 
          last_name ILIKE $${paramCount} OR 
          email ILIKE $${paramCount} OR
          department ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
        paramCount++;
      }

      if (department) {
        whereConditions.push(`department = $${paramCount}`);
        queryParams.push(department);
        paramCount++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Validate sort fields
      const validSortFields = {
        'created_at': 'created_at',
        'updated_at': 'updated_at',
        'email': 'email',
        'firstName': 'first_name',
        'lastName': 'last_name',
        'department': 'department'
      };

      const sortField = validSortFields[sortBy] || 'created_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM user_profiles 
        ${whereClause}
      `;
      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Data query
      const dataQuery = `
        SELECT * FROM user_profiles 
        ${whereClause}
        ORDER BY ${sortField} ${order}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      queryParams.push(limit, offset);

      const result = await database.query(dataQuery, queryParams);
      const profiles = result.rows.map(row => new UserProfile(row));

      return {
        profiles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to find profiles: ${error.message}`);
    }
  }

  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
          COUNT(DISTINCT department) as departments_count,
          (
            SELECT json_object_agg(department, count)
            FROM (
              SELECT department, COUNT(*) as count
              FROM user_profiles
              WHERE department IS NOT NULL
              GROUP BY department
              ORDER BY count DESC
              LIMIT 10
            ) dept_stats
          ) as departments_breakdown
        FROM user_profiles
      `;
      
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      department: this.department,
      jobTitle: this.jobTitle,
      avatarUrl: this.avatarUrl,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = UserProfile;