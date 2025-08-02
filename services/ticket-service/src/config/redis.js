// src/config/redis.js
const Redis = require('redis');
const config = require('./index');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = Redis.createClient({
        url: config.redis.url,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      });

      this.client.on('error', (error) => {
        logger.error('❌ Redis error:', error);
      });

      this.client.on('connect', () => {
        logger.info('🔄 Redis connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('💾 Redis connected successfully');
      });

      this.client.on('end', () => {
        this.isConnected = false;
        logger.info('💾 Redis disconnected');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
  }

  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.client;
  }

  async get(key) {
    try {
      const prefixedKey = `${config.redis.keyPrefix}${key}`;
      const value = await this.client.get(prefixedKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = config.redis.ttl.profile) {
    try {
      const prefixedKey = `${config.redis.keyPrefix}${key}`;
      await this.client.setEx(prefixedKey, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      const prefixedKey = `${config.redis.keyPrefix}${key}`;
      await this.client.del(prefixedKey);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const prefixedKey = `${config.redis.keyPrefix}${key}`;
      return await this.client.exists(prefixedKey);
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }
}

module.exports = new RedisClient();