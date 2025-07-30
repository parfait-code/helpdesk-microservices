// src/utils/validateEnv.js
function validateEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'REFRESH_TOKEN_EXPIRES_IN',
    'BCRYPT_ROUNDS'
  ];

  const optionalEnvVars = {
    'PORT': '3001',
    'NODE_ENV': 'development',
    'CORS_ORIGIN': 'http://localhost:3000',
    'MAX_LOGIN_ATTEMPTS': '5',
    'LOCK_TIME': '15',
    'RATE_LIMIT_WINDOW_MS': '900000',
    'RATE_LIMIT_MAX_REQUESTS': '100',
    'MOCK_EVENTS': 'true',
    'ENABLE_KAFKA': 'false'
  };

  const missing = [];
  const warnings = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Set defaults for optional variables
  for (const [envVar, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[envVar]) {
      process.env[envVar] = defaultValue;
      warnings.push(`${envVar} not set, using default: ${defaultValue}`);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`  - ${envVar}`));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Validate specific formats
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (process.env.BCRYPT_ROUNDS && (parseInt(process.env.BCRYPT_ROUNDS) < 10 || parseInt(process.env.BCRYPT_ROUNDS) > 15)) {
    throw new Error('BCRYPT_ROUNDS must be between 10 and 15');
  }

  console.log('✅ Environment validation passed');
}

module.exports = validateEnvironment;