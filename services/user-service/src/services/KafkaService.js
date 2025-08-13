// src/services/KafkaService.js
const { Kafka } = require('kafkajs');
const config = require('../config');
const logger = require('../utils/logger');

class KafkaService {
  constructor() {
    this.kafka = null;
    this.producer = null;
    this.consumer = null;
    this.isConnected = false;
  }

  async connect() {
    if (!config.kafka.enabled) {
      logger.info('📨 Kafka disabled, running in mock mode');
      return;
    }

    try {
      this.kafka = new Kafka({
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
        retry: {
          initialRetryTime: 1000,
          retries: 5
        }
      });

      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true
      });

      this.consumer = this.kafka.consumer({
        groupId: config.kafka.groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000
      });

      await this.producer.connect();
      await this.consumer.connect();

      this.isConnected = true;
      logger.info('📨 Kafka connected successfully');

      // S'abonner aux topics nécessaires
      await this.subscribeToTopics();
      
    } catch (error) {
      logger.error('❌ Kafka connection failed:', error);
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.producer) {
      await this.producer.disconnect();
    }
    if (this.consumer) {
      await this.consumer.disconnect();
    }
    this.isConnected = false;
    logger.info('📨 Kafka disconnected');
  }

  async subscribeToTopics() {
    if (!this.isConnected) return;

    try {
      // S'abonner aux événements de l'auth-service
      await this.consumer.subscribe({ 
        topics: ['user.registered'], 
        fromBeginning: false 
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const data = JSON.parse(message.value.toString());
            await this.handleMessage(topic, data);
          } catch (error) {
            logger.error('Error processing Kafka message:', {
              topic,
              partition,
              offset: message.offset,
              error: error.message
            });
          }
        }
      });

      logger.info('📨 Subscribed to Kafka topics');
    } catch (error) {
      logger.error('Error subscribing to topics:', error);
    }
  }

  async handleMessage(topic, data) {
    switch (topic) {
      case 'user.registered':
        await this.handleUserRegistered(data);
        break;
      default:
        logger.warn('Unknown topic received:', topic);
    }
  }

  async handleUserRegistered(userData) {
    try {
      logger.info('Processing user registration event', { userId: userData.userId });
      
      // Éviter la référence circulaire en important dynamiquement
      const profileService = require('./ProfileService');
      
      // Créer automatiquement le profil utilisateur
      await profileService.createProfile({
        userId: userData.userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      });

      logger.info('User profile created from registration event', { 
        userId: userData.userId 
      });
    } catch (error) {
      logger.error('Error handling user registration:', {
        userId: userData.userId,
        error: error.message
      });
    }
  }

  async publishEvent(topic, data) {
    if (!config.kafka.enabled || !this.isConnected) {
      logger.debug('Kafka event (mock):', { topic, data });
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [{
          key: data.userId || data.id,
          value: JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
            service: 'user-service'
          })
        }]
      });

      logger.debug('Kafka event published:', { topic, userId: data.userId });
    } catch (error) {
      logger.error('Error publishing Kafka event:', {
        topic,
        error: error.message
      });
    }
  }
}

module.exports = new KafkaService();

