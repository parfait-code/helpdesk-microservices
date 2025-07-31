// src/utils/validation.js
const Joi = require('joi');

const schemas = {
  updateProfile: Joi.object({
    firstName: Joi.string().trim().min(2).max(100).optional(),
    lastName: Joi.string().trim().min(2).max(100).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
    department: Joi.string().trim().max(100).optional().allow(''),
    jobTitle: Joi.string().trim().max(100).optional().allow(''),
    preferences: Joi.object({
      language: Joi.string().valid('fr', 'en', 'es').optional(),
      theme: Joi.string().valid('light', 'dark', 'auto').optional(),
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        browser: Joi.boolean().optional(),
        sms: Joi.boolean().optional()
      }).optional(),
      timezone: Joi.string().optional()
    }).optional()
  }),

  adminUpdateUser: Joi.object({
    firstName: Joi.string().trim().min(2).max(100).optional(),
    lastName: Joi.string().trim().min(2).max(100).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
    department: Joi.string().trim().max(100).optional().allow(''),
    jobTitle: Joi.string().trim().max(100).optional().allow(''),
    preferences: Joi.object().optional()
  }),

  changeRole: Joi.object({
    role: Joi.string().valid('user', 'admin', 'manager').required()
  }),

  userQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().optional(),
    department: Joi.string().trim().optional(),
    role: Joi.string().valid('user', 'admin', 'manager').optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'email', 'firstName', 'lastName').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const ValidationError = require('./errors').ValidationError;
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new ValidationError(message));
    }
    
    req.validatedData = value;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const ValidationError = require('./errors').ValidationError;
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new ValidationError(message));
    }
    
    req.validatedQuery = value;
    next();
  };
};

module.exports = {
  schemas,
  validate,
  validateQuery
};