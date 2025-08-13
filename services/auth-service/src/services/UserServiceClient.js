// src/services/UserServiceClient.js
const http = require('http');
const https = require('https');
const { URL } = require('url');
const logger = require('../utils/logger');

class UserServiceClient {
  constructor() {
    this.baseUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
    this.timeout = parseInt(process.env.USER_SERVICE_TIMEOUT) || 5000;
  }

  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(path, this.baseUrl);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          timeout: this.timeout
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          const jsonData = JSON.stringify(data);
          options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        const req = httpModule.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });

          res.on('end', () => {
            try {
              const responseData = body ? JSON.parse(body) : {};
              resolve({
                status: res.statusCode,
                data: responseData,
                headers: res.headers
              });
            } catch (error) {
              resolve({
                status: res.statusCode,
                data: { message: body },
                headers: res.headers
              });
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          req.write(JSON.stringify(data));
        }

        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async createUserProfile(userData, authToken) {
    try {
      const response = await this.makeRequest('POST', '/api/v1/users/profiles', userData, {
        Authorization: `Bearer ${authToken}`
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info('User profile created successfully', { 
          userId: userData.userId,
          email: userData.email 
        });

        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Failed to create user profile:', {
        userId: userData.userId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async notifyUserRegistration(userData) {
    try {
      const response = await this.makeRequest('POST', '/api/v1/internal/user-registered', userData);

      if (response.status >= 200 && response.status < 300) {
        logger.info('User registration notification sent', { 
          userId: userData.userId 
        });

        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.warn('Failed to notify user registration:', {
        userId: userData.userId,
        error: error.message
      });

      // Ne pas faire échouer l'inscription si la notification échoue
      return {
        success: false,
        error: error.message
      };
    }
  }

  async healthCheck() {
    try {
      const response = await this.makeRequest('GET', '/api/v1/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new UserServiceClient();