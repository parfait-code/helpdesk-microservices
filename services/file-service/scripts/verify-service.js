#!/usr/bin/env node

const axios = require('axios');
const config = require('../src/config');
const logger = require('../src/utils/logger');

class FileServiceVerifier {
    constructor() {
        this.baseUrl = `http://localhost:${config.server.port}`;
        this.apiUrl = `${this.baseUrl}/api/v1`;
    }

    async verify() {
        console.log('🔍 Vérification du File Service...\n');

        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };

        try {
            // Test 1: Health Check
            await this.testHealthCheck(results);
            
            // Test 2: Service Info
            await this.testServiceInfo(results);
            
            // Test 3: API Routes
            await this.testApiRoutes(results);
            
            // Test 4: Database Connection
            await this.testDatabaseConnection(results);
            
            // Test 5: MinIO Connection
            await this.testMinioConnection(results);

            // Résumé
            this.printSummary(results);

        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error.message);
            process.exit(1);
        }
    }

    async testHealthCheck(results) {
        try {
            const response = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
            
            if (response.status === 200 && response.data.status === 'healthy') {
                this.addTest(results, '✅ Health Check', 'PASSED', response.data);
            } else {
                this.addTest(results, '❌ Health Check', 'FAILED', 'Service not healthy');
            }
        } catch (error) {
            this.addTest(results, '❌ Health Check', 'FAILED', error.message);
        }
    }

    async testServiceInfo(results) {
        try {
            const response = await axios.get(`${this.apiUrl}/info`, { timeout: 5000 });
            
            if (response.status === 200 && response.data.service === 'file-service') {
                this.addTest(results, '✅ Service Info', 'PASSED', response.data);
            } else {
                this.addTest(results, '❌ Service Info', 'FAILED', 'Invalid service info');
            }
        } catch (error) {
            this.addTest(results, '❌ Service Info', 'FAILED', error.message);
        }
    }

    async testApiRoutes(results) {
        const routes = [
            { path: '/', method: 'GET', expectedStatus: 200 },
            { path: '/files', method: 'GET', expectedStatus: 401 }, // Sans auth devrait retourner 401
        ];

        for (const route of routes) {
            try {
                const response = await axios({
                    method: route.method,
                    url: `${this.apiUrl}${route.path}`,
                    timeout: 5000,
                    validateStatus: () => true // Accepter tous les status
                });

                if (response.status === route.expectedStatus) {
                    this.addTest(results, `✅ Route ${route.method} ${route.path}`, 'PASSED');
                } else {
                    this.addTest(results, `❌ Route ${route.method} ${route.path}`, 'FAILED', 
                        `Expected ${route.expectedStatus}, got ${response.status}`);
                }
            } catch (error) {
                this.addTest(results, `❌ Route ${route.method} ${route.path}`, 'FAILED', error.message);
            }
        }
    }

    async testDatabaseConnection(results) {
        try {
            const response = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
            
            if (response.data.checks?.database?.status === 'healthy') {
                this.addTest(results, '✅ Database Connection', 'PASSED');
            } else {
                this.addTest(results, '❌ Database Connection', 'FAILED', 
                    response.data.checks?.database?.error || 'Database unhealthy');
            }
        } catch (error) {
            this.addTest(results, '❌ Database Connection', 'FAILED', error.message);
        }
    }

    async testMinioConnection(results) {
        try {
            const response = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
            
            if (response.data.checks?.minio?.status === 'healthy') {
                this.addTest(results, '✅ MinIO Connection', 'PASSED');
            } else {
                this.addTest(results, '❌ MinIO Connection', 'FAILED', 
                    response.data.checks?.minio?.error || 'MinIO unhealthy');
            }
        } catch (error) {
            this.addTest(results, '❌ MinIO Connection', 'FAILED', error.message);
        }
    }

    addTest(results, name, status, details = null) {
        results.tests.push({ name, status, details });
        
        if (status === 'PASSED') {
            results.passed++;
            console.log(name);
        } else {
            results.failed++;
            console.log(`${name} - ${details || 'Unknown error'}`);
        }
    }

    printSummary(results) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RÉSUMÉ DE LA VÉRIFICATION');
        console.log('='.repeat(60));
        console.log(`✅ Tests réussis: ${results.passed}`);
        console.log(`❌ Tests échoués: ${results.failed}`);
        console.log(`📋 Total: ${results.tests.length}`);
        
        const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
        console.log(`📈 Taux de réussite: ${successRate}%`);
        
        if (results.failed === 0) {
            console.log('\n🎉 Tous les tests sont passés ! Le File Service est prêt.');
        } else {
            console.log('\n⚠️  Certains tests ont échoué. Vérifiez la configuration.');
            process.exit(1);
        }
    }

    async waitForService(maxAttempts = 30, interval = 2000) {
        console.log('⏳ Attente du démarrage du service...');
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await axios.get(`${this.apiUrl}/health`, { timeout: 2000 });
                console.log('✅ Service démarré !');
                return true;
            } catch (error) {
                if (attempt === maxAttempts) {
                    console.error(`❌ Service non disponible après ${maxAttempts} tentatives`);
                    return false;
                }
                process.stdout.write('.');
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
        return false;
    }
}

// Exécution si appelé directement
if (require.main === module) {
    const verifier = new FileServiceVerifier();
    
    // Attendre le service puis vérifier
    verifier.waitForService().then(async (isReady) => {
        if (isReady) {
            await verifier.verify();
        } else {
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    });
}

module.exports = FileServiceVerifier;
