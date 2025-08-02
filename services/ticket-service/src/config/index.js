// src/config/index.js
require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://ticket:ticketpass@localhost:5403/ticket_db',
    ssl: process.env.NODE_ENV === 'production',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 2000
    }
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6303',
    keyPrefix: 'ticket-service:',
    ttl: {
      ticket: parseInt(process.env.REDIS_TICKET_TTL, 10) || 1800, // 30 minutes
      ticketList: parseInt(process.env.REDIS_TICKET_LIST_TTL, 10) || 300, // 5 minutes
      userInfo: parseInt(process.env.REDIS_USER_INFO_TTL, 10) || 3600 // 1 hour
    }
  },

  // External Services
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT, 10) || 5000
    },
    user: {
      url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.USER_SERVICE_TIMEOUT, 10) || 5000
    },
    file: {
      url: process.env.FILE_SERVICE_URL || 'http://localhost:3004',
      timeout: parseInt(process.env.FILE_SERVICE_TIMEOUT, 10) || 10000,
      enabled: process.env.ENABLE_FILE_SERVICE === 'true',
      mock: process.env.MOCK_FILE_SERVICE === 'true'
    },
    notification: {
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
      timeout: parseInt(process.env.NOTIFICATION_SERVICE_TIMEOUT, 10) || 5000,
      enabled: process.env.ENABLE_NOTIFICATION_SERVICE === 'true',
      mock: process.env.MOCK_NOTIFICATION_SERVICE === 'true'
    }
  },

  // Kafka Configuration
  kafka: {
    enabled: process.env.ENABLE_KAFKA === 'true',
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    clientId: 'ticket-service',
    groupId: 'ticket-service-group',
    topics: {
      ticketCreated: 'ticket.created',
      ticketUpdated: 'ticket.updated',
      ticketAssigned: 'ticket.assigned',
      ticketStatusChanged: 'ticket.status_changed',
      ticketClosed: 'ticket.closed',
      commentAdded: 'ticket.comment_added'
    }
  },

  // Ticket Configuration
  ticket: {
    autoCloseAfterResolved: parseInt(process.env.AUTO_CLOSE_HOURS, 10) || 24, // Fermeture auto après 24h
    maxReopenDays: parseInt(process.env.MAX_REOPEN_DAYS, 10) || 7, // Réouverture possible pendant 7 jours
    defaultCategory: process.env.DEFAULT_CATEGORY || 'Demande',
    numberPrefix: process.env.TICKET_NUMBER_PREFIX || '',
    
    // Limites
    maxTitleLength: 255,
    maxDescriptionLength: 10000,
    maxCommentLength: 5000,
    maxTagsPerTicket: 10,
    
    // Assignation automatique
    autoAssignEnabled: process.env.AUTO_ASSIGN_ENABLED === 'true',
    autoAssignStrategy: process.env.AUTO_ASSIGN_STRATEGY || 'round_robin' // round_robin, least_assigned, skill_based
  },

  // SLA Configuration (en millisecondes)
  sla: {
    priorities: {
      URGENT: {
        responseTime: 30 * 60 * 1000,      // 30 minutes
        resolutionTime: 2 * 60 * 60 * 1000 // 2 heures
      },
      HIGH: {
        responseTime: 2 * 60 * 60 * 1000,  // 2 heures
        resolutionTime: 4 * 60 * 60 * 1000 // 4 heures
      },
      MEDIUM: {
        responseTime: 4 * 60 * 60 * 1000,   // 4 heures
        resolutionTime: 24 * 60 * 60 * 1000 // 24 heures
      },
      LOW: {
        responseTime: 24 * 60 * 60 * 1000,   // 24 heures
        resolutionTime: 72 * 60 * 60 * 1000  // 72 heures
      }
    },
    
    // Heures ouvrables (pour calcul SLA)
    businessHours: {
      enabled: process.env.SLA_BUSINESS_HOURS_ONLY === 'true',
      startHour: parseInt(process.env.SLA_START_HOUR, 10) || 9,  // 9h
      endHour: parseInt(process.env.SLA_END_HOUR, 10) || 18,     // 18h
      workingDays: [1, 2, 3, 4, 5], // Lundi à Vendredi
      timezone: process.env.SLA_TIMEZONE || 'Europe/Paris'
    }
  },

  // Security Configuration
  security: {
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
    },
    ticketAccess: {
      ownerCanEdit: true,
      ownerCanDelete: true, // Seulement si status = OPEN
      ownerCanReopen: true  // Dans les X jours après fermeture
    }
  },

  // Notification Configuration
  notifications: {
    email: {
      enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
      from: process.env.EMAIL_FROM || 'support@helpdesk.com',
      templates: {
        ticketCreated: 'ticket_created',
        ticketAssigned: 'ticket_assigned',
        ticketUpdated: 'ticket_updated',
        ticketResolved: 'ticket_resolved',
        commentAdded: 'comment_added'
      }
    },
    
    // Notifications internes
    internal: {
      slaWarning: true, // Alerte à 80% du SLA
      overdueTickets: true,
      assignmentNotification: true
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  }
};

module.exports = config;

// src/config/sla.js
const moment = require('moment-timezone');
const config = require('./index');

class SLACalculator {
  constructor() {
    this.businessHours = config.sla.businessHours;
    this.priorities = config.sla.priorities;
  }

  /**
   * Calculer la date d'échéance d'un ticket
   */
  calculateDueDate(priority, createdAt = new Date(), category = null) {
    const slaConfig = this.priorities[priority];
    if (!slaConfig) {
      throw new Error(`Unknown priority: ${priority}`);
    }

    let dueDate;
    if (this.businessHours.enabled) {
      dueDate = this.addBusinessTime(createdAt, slaConfig.resolutionTime);
    } else {
      dueDate = new Date(createdAt.getTime() + slaConfig.resolutionTime);
    }

    return dueDate;
  }

  /**
   * Calculer la date de première réponse attendue
   */
  calculateResponseDueDate(priority, createdAt = new Date()) {
    const slaConfig = this.priorities[priority];
    if (!slaConfig) {
      throw new Error(`Unknown priority: ${priority}`);
    }

    let responseDue;
    if (this.businessHours.enabled) {
      responseDue = this.addBusinessTime(createdAt, slaConfig.responseTime);
    } else {
      responseDue = new Date(createdAt.getTime() + slaConfig.responseTime);
    }

    return responseDue;
  }

  /**
   * Vérifier si un ticket est en retard
   */
  isOverdue(ticket) {
    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      return false;
    }
    return new Date() > new Date(ticket.due_date);
  }

  /**
   * Obtenir le temps restant avant échéance
   */
  getTimeRemaining(ticket) {
    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      return null;
    }
    
    const now = new Date();
    const dueDate = new Date(ticket.due_date);
    const remaining = dueDate - now;
    
    return Math.max(0, remaining);
  }

  /**
   * Calculer le pourcentage SLA utilisé
   */
  getSLAPercentage(ticket) {
    const createdAt = new Date(ticket.created_at);
    const dueDate = new Date(ticket.due_date);
    const now = new Date();
    
    const totalTime = dueDate - createdAt;
    const elapsedTime = now - createdAt;
    
    return Math.min(100, (elapsedTime / totalTime) * 100);
  }

  /**
   * Vérifier si le SLA nécessite une alerte (80% du temps écoulé)
   */
  needsSLAWarning(ticket, threshold = 80) {
    const percentage = this.getSLAPercentage(ticket);
    return percentage >= threshold && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED';
  }

  /**
   * Ajouter du temps en excluant les heures non ouvrables
   */
  addBusinessTime(startDate, milliseconds) {
    if (!this.businessHours.enabled) {
      return new Date(startDate.getTime() + milliseconds);
    }

    const startMoment = moment.tz(startDate, this.businessHours.timezone);
    let currentMoment = startMoment.clone();
    let remainingMs = milliseconds;

    while (remainingMs > 0) {
      // Si on est en dehors des heures ouvrables, aller au prochain jour ouvrable
      if (!this.isBusinessTime(currentMoment)) {
        currentMoment = this.getNextBusinessTime(currentMoment);
        continue;
      }

      // Calculer combien de temps on peut ajouter aujourd'hui
      const endOfDay = currentMoment.clone()
        .hour(this.businessHours.endHour)
        .minute(0)
        .second(0)
        .millisecond(0);

      const availableToday = endOfDay.valueOf() - currentMoment.valueOf();
      
      if (remainingMs <= availableToday) {
        // On peut terminer aujourd'hui
        currentMoment.add(remainingMs, 'milliseconds');
        remainingMs = 0;
      } else {
        // On doit continuer demain
        remainingMs -= availableToday;
        currentMoment = this.getNextBusinessTime(endOfDay);
      }
    }

    return currentMoment.toDate();
  }

  /**
   * Vérifier si un moment donné est pendant les heures ouvrables
   */
  isBusinessTime(moment) {
    const dayOfWeek = moment.day();
    const hour = moment.hour();
    
    return this.businessHours.workingDays.includes(dayOfWeek) &&
           hour >= this.businessHours.startHour &&
           hour < this.businessHours.endHour;
  }

  /**
   * Obtenir le prochain moment ouvrable
   */
  getNextBusinessTime(moment) {
    let nextMoment = moment.clone();
    
    // Aller au prochain jour ouvrable
    do {
      nextMoment.add(1, 'day');
    } while (!this.businessHours.workingDays.includes(nextMoment.day()));
    
    // Définir l'heure de début
    nextMoment.hour(this.businessHours.startHour)
              .minute(0)
              .second(0)
              .millisecond(0);
    
    return nextMoment;
  }

  /**
   * Obtenir les statistiques SLA globales
   */
  getSLAStats(tickets) {
    const stats = {
      total: tickets.length,
      onTime: 0,
      overdue: 0,
      atRisk: 0, // Entre 80% et 100% du SLA
      byPriority: {}
    };

    tickets.forEach(ticket => {
      const percentage = this.getSLAPercentage(ticket);
      
      if (this.isOverdue(ticket)) {
        stats.overdue++;
      } else if (percentage >= 80) {
        stats.atRisk++;
      } else {
        stats.onTime++;
      }

      // Stats par priorité
      if (!stats.byPriority[ticket.priority]) {
        stats.byPriority[ticket.priority] = {
          total: 0,
          onTime: 0,
          overdue: 0,
          atRisk: 0
        };
      }
      stats.byPriority[ticket.priority].total++;
      
      if (this.isOverdue(ticket)) {
        stats.byPriority[ticket.priority].overdue++;
      } else if (percentage >= 80) {
        stats.byPriority[ticket.priority].atRisk++;
      } else {
        stats.byPriority[ticket.priority].onTime++;
      }
    });

    return stats;
  }
}

module.exports = SLACalculator;