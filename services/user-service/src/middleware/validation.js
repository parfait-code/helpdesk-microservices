// src/middleware/validation.js
const { validate, validateQuery, schemas } = require('../utils/validation');

module.exports = {
  validateUpdateProfile: validate(schemas.updateProfile),
  validateAdminUpdateUser: validate(schemas.adminUpdateUser),
  validateChangeRole: validate(schemas.changeRole),
  validateUserQuery: validateQuery(schemas.userQuery)
};

