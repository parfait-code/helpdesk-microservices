// src/services/AuthServiceClient.js
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class AuthServiceClient {
  constructor() {
    this.baseUrl = config.services.auth.url;
    this.timeout = config.services.auth.timeout;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async verifyToken(token) {
    try {
      const response = await this.client.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });

      return {
        success: true,
        user: response.data.data.user
      };
    } catch (error) {
      logger.error('Auth verification failed:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Auth Service unavailable');
      }

      return {
        success: false,
        error: error.response?.data?.message || 'Token verification failed'
      };
    }
  }

  async getUserById(userId, token) {
    try {
      const response = await this.client.get(`/api/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return {
        success: true,
        user: response.data.data
      };
    } catch (error) {
      logger.error('Get user by ID failed:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'User not found'
      };
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new AuthServiceClient();

