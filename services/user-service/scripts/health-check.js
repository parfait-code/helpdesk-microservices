// scripts/health-check.js
const axios = require('axios');
const config = require('../src/config');

async function healthCheck() {
  try {
    const response = await axios.get(`http://localhost:${config.port}/api/v1/health`, {
      timeout: 5000
    });
    
    console.log('✅ Service is healthy');
    console.log(JSON.stringify(response.data, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Service is unhealthy');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  healthCheck();
}

module.exports = healthCheck;