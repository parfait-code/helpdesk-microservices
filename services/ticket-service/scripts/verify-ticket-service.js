// scripts/verify-ticket-service.js
const http = require('http');

const config = {
  port: process.env.PORT || 3003,
  host: 'localhost'
};

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: parsed
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: data
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

    req.end();
  });
}

async function verifyService() {
  console.log('🔍 Verification du Ticket Service...\n');
  
  try {
    // Test 1: Service Info
    console.log('1. Test du endpoint racine...');
    const rootResponse = await makeRequest('/');
    if (rootResponse.statusCode === 200) {
      console.log('   ✅ Service accessible');
      console.log(`   📝 Service: ${rootResponse.data.service}`);
      console.log(`   📝 Version: ${rootResponse.data.version}`);
      console.log(`   📝 Port: ${rootResponse.data.port}`);
    } else {
      console.log(`   ❌ Erreur HTTP ${rootResponse.statusCode}`);
    }

    // Test 2: Health Check
    console.log('\n2. Test du health check...');
    const healthResponse = await makeRequest('/api/v1/health');
    if (healthResponse.statusCode === 200) {
      console.log('   ✅ Health check OK');
      console.log(`   📝 Status: ${healthResponse.data.status}`);
      if (healthResponse.data.dependencies) {
        console.log('   📝 Dependencies:');
        Object.entries(healthResponse.data.dependencies).forEach(([key, value]) => {
          const icon = value === 'ready' ? '✅' : value === 'failed' ? '❌' : '⏳';
          console.log(`      ${icon} ${key}: ${value}`);
        });
      }
    } else {
      console.log(`   ❌ Health check failed (HTTP ${healthResponse.statusCode})`);
      if (healthResponse.data.error) {
        console.log(`   📝 Error: ${healthResponse.data.error}`);
      }
    }

    // Test 3: File Service Integration Endpoint
    console.log('\n3. Test du endpoint file service integration...');
    const fileResponse = await makeRequest('/api/v1/tickets/files/test-ticket-id');
    if (fileResponse.statusCode === 200) {
      console.log('   ✅ File service endpoint accessible');
      console.log(`   📝 Status: ${fileResponse.data.status}`);
    } else {
      console.log(`   ❌ Erreur HTTP ${fileResponse.statusCode}`);
    }

    console.log('\n🎯 Verification terminée!');

  } catch (error) {
    console.log(`\n❌ Erreur lors de la vérification: ${error.message}`);
    console.log('📝 Le service n\'est probablement pas démarré ou n\'est pas accessible sur le port', config.port);
    process.exit(1);
  }
}

// Exécuter la vérification
verifyService();
