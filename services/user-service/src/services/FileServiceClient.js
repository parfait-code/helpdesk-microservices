// src/services/FileServiceClient.js
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');
const logger = require('../utils/logger');

class FileServiceClient {
  constructor() {
    this.baseUrl = config.services.file.url;
    this.timeout = config.services.file.timeout;
    this.enabled = config.services.file.enabled;
    this.mock = config.services.file.mock;

    if (this.enabled && !this.mock) {
      this.client = axios.create({
        baseURL: this.baseUrl,
        timeout: this.timeout
      });
    }
  }

  async uploadAvatar(file, userId, token) {
    if (this.mock) {
      // Mock implementation for development
      return {
        success: true,
        file: {
          id: `mock-avatar-${userId}`,
          url: `https://via.placeholder.com/300x300.png?text=Avatar`,
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        }
      };
    }

    if (!this.enabled) {
      throw new Error('File service is disabled');
    }

    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
      formData.append('userId', userId);
      formData.append('type', 'avatar');

      const response = await this.client.post('/files/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}`
        }
      });

      return {
        success: true,
        file: response.data.file
      };
    } catch (error) {
      logger.error('Avatar upload failed:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Upload failed'
      };
    }
  }

  async deleteFile(fileId, token) {
    if (this.mock) {
      return { success: true };
    }

    if (!this.enabled) {
      return { success: true };
    }

    try {
      await this.client.delete(`/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return { success: true };
    } catch (error) {
      logger.error('File deletion failed:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Deletion failed'
      };
    }
  }
}

module.exports = new FileServiceClient();

