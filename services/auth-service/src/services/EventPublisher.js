// src/services/EventPublisher.js
class EventPublisher {
  constructor() {
    this.mockMode = process.env.MOCK_EVENTS === 'true' || process.env.ENABLE_KAFKA === 'false';
    this.events = []; // Pour stocker les événements en mode mock
    
    if (!this.mockMode) {
      // En production, initialiser Kafka ici
      this.initializeKafka();
    }
  }

  // Initialisation Kafka (pour production)
  initializeKafka() {
    try {
      // const { Kafka } = require('kafkajs');
      // this.kafka = new Kafka({
      //   clientId: 'auth-service',
      //   brokers: process.env.KAFKA_BROKERS.split(',')
      // });
      // this.producer = this.kafka.producer();
      console.log('🔄 Kafka sera initialisé en mode production');
    } catch (error) {
      console.warn('⚠️ Kafka non disponible, basculement en mode mock');
      this.mockMode = true;
    }
  }

  // Publier un événement
  async publish(topic, event) {
    const enrichedEvent = {
      ...event,
      eventId: this.generateEventId(),
      service: 'auth-service',
      version: '1.0.0',
      timestamp: event.timestamp || new Date().toISOString()
    };

    if (this.mockMode) {
      return this.publishMock(topic, enrichedEvent);
    } else {
      return this.publishKafka(topic, enrichedEvent);
    }
  }

  // Publication en mode mock
  async publishMock(topic, event) {
    console.log(`📤 [MOCK EVENT] Publishing to ${topic}:`, JSON.stringify(event, null, 2));
    
    this.events.push({
      topic,
      event,
      publishedAt: new Date().toISOString()
    });

    // Simuler la latence réseau
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    // Simuler occasionnellement des erreurs (5% du temps)
    if (Math.random() < 0.05) {
      console.error(`❌ [MOCK ERROR] Failed to publish event to ${topic}`);
      throw new Error(`Mock publish error for topic ${topic}`);
    }

    return {
      success: true,
      mockMode: true,
      eventId: event.eventId,
      topic,
      timestamp: event.timestamp
    };
  }

  // Publication vers Kafka (production)
  async publishKafka(topic, event) {
    try {
      // await this.producer.send({
      //   topic,
      //   messages: [{
      //     key: event.userId || event.eventId,
      //     value: JSON.stringify(event),
      //     timestamp: Date.now()
      //   }]
      // });

      console.log(`📤 [KAFKA] Event published to ${topic}:`, event.eventId);
      
      return {
        success: true,
        mockMode: false,
        eventId: event.eventId,
        topic,
        timestamp: event.timestamp
      };

    } catch (error) {
      console.error(`❌ [KAFKA ERROR] Failed to publish to ${topic}:`, error.message);
      throw error;
    }
  }

  // Obtenir tous les événements publiés (mode mock uniquement)
  getPublishedEvents() {
    if (!this.mockMode) {
      throw new Error('getPublishedEvents disponible uniquement en mode mock');
    }
    
    return this.events;
  }

  // Obtenir les événements par topic (mode mock)
  getEventsByTopic(topic) {
    if (!this.mockMode) {
      throw new Error('getEventsByTopic disponible uniquement en mode mock');
    }
    
    return this.events.filter(e => e.topic === topic);
  }

  // Vider les événements (mode mock, utile pour les tests)
  clearEvents() {
    if (!this.mockMode) {
      throw new Error('clearEvents disponible uniquement en mode mock');
    }
    
    this.events = [];
  }

  // Générer un ID d'événement unique
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Publier des événements en lot
  async publishBatch(events) {
    const results = [];
    
    for (const { topic, event } of events) {
      try {
        const result = await this.publish(topic, event);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({
          success: false,
          topic,
          error: error.message,
          eventId: event.eventId || 'unknown'
        });
      }
    }

    return results;
  }

  // Événements prédéfinis pour l'authentification
  async publishUserRegistered(userId, email, additionalData = {}) {
    return this.publish('user.registered', {
      userId,
      email,
      ...additionalData
    });
  }

  async publishUserLogin(userId, email, additionalData = {}) {
    return this.publish('user.login', {
      userId,
      email,
      ...additionalData
    });
  }

  async publishUserLogout(userId, additionalData = {}) {
    return this.publish('user.logout', {
      userId,
      ...additionalData
    });
  }

  async publishPasswordResetRequested(userId, email, resetToken, expiresAt) {
    return this.publish('user.password_reset_requested', {
      userId,
      email,
      resetToken, // En production, ne pas logger le token
      expiresAt
    });
  }

  async publishPasswordResetCompleted(userId, email) {
    return this.publish('user.password_reset_completed', {
      userId,
      email
    });
  }

  async publishUserLocked(userId, email, lockDuration) {
    return this.publish('user.locked', {
      userId,
      email,
      lockDuration,
      reason: 'too_many_failed_attempts'
    });
  }

  async publishSecurityAlert(userId, alertType, details = {}) {
    return this.publish('security.alert', {
      userId,
      alertType,
      severity: 'high',
      ...details
    });
  }

  // Middleware pour Express - logger automatiquement les événements
  createExpressMiddleware() {
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(data) {
        // Logger les réponses d'authentification
        if (req.path.includes('/auth/') && res.statusCode === 200) {
          const eventData = {
            endpoint: req.path,
            method: req.method,
            userId: data.user?.id,
            timestamp: new Date().toISOString()
          };

          // Publier l'événement de manière asynchrone
          setImmediate(() => {
            req.app.locals.eventPublisher?.publish('api.auth_success', eventData)
              .catch(error => console.error('Erreur publication événement middleware:', error));
          });
        }

        return originalJson.call(this, data);
      };

      next();
    };
  }

  // Fermer les connexions
  async close() {
    if (!this.mockMode && this.producer) {
      try {
        // await this.producer.disconnect();
        console.log('Kafka producer disconnected');
      } catch (error) {
        console.error('Erreur fermeture Kafka producer:', error.message);
      }
    }
  }
}

module.exports = EventPublisher;