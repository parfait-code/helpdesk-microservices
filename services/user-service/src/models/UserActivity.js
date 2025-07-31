// src/models/UserActivity.js
const database = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class UserActivity {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id || data.userId;
    this.activityType = data.activity_type || data.activityType;
    this.activityData = data.activity_data || data.activityData || {};
    this.ipAddress = data.ip_address || data.ipAddress;
    this.userAgent = data.user_agent || data.userAgent;
    this.createdAt = data.created_at || data.createdAt;
  }

  static async create(activityData) {
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO user_activities (
          id, user_id, activity_type, activity_data, 
          ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        id,
        activityData.userId,
        activityData.activityType,
        JSON.stringify(activityData.activityData || {}),
        activityData.ipAddress || null,
        activityData.userAgent || null
      ];
      
      const result = await database.query(query, values);
      return new UserActivity(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create activity: ${error.message}`);
    }
  }

  static async findByUserId(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        activityType,
        startDate,
        endDate
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = ['user_id = $1'];
      let queryParams = [userId];
      let paramCount = 2;

      if (activityType) {
        whereConditions.push(`activity_type = $${paramCount}`);
        queryParams.push(activityType);
        paramCount++;
      }

      if (startDate) {
        whereConditions.push(`created_at >= $${paramCount}`);
        queryParams.push(startDate);
        paramCount++;
      }

      if (endDate) {
        whereConditions.push(`created_at <= $${paramCount}`);
        queryParams.push(endDate);
        paramCount++;
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM user_activities 
        ${whereClause}
      `;
      const countResult = await database.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Data query
      const dataQuery = `
        SELECT * FROM user_activities 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      queryParams.push(limit, offset);

      const result = await database.query(dataQuery, queryParams);
      const activities = result.rows.map(row => new UserActivity(row));

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to find activities: ${error.message}`);
    }
  }

  static async getActivityTypes() {
    try {
      const query = `
        SELECT DISTINCT activity_type, COUNT(*) as count
        FROM user_activities
        GROUP BY activity_type
        ORDER BY count DESC
      `;
      
      const result = await database.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get activity types: ${error.message}`);
    }
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      activityType: this.activityType,
      activityData: this.activityData,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      createdAt: this.createdAt
    };
  }
}

module.exports = UserActivity;