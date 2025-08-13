#!/usr/bin/env node

// scripts/test-integration.js
// Script pour tester l'intégration entre auth-service et user-service

const axios = require('axios');
const colors = require('colors');

class IntegrationTester {
  constructor() {
    this.authBaseUrl = 'http://localhost:3001';
    this.userBaseUrl = 'http://localhost:3002';
    this.testUser = {
      email: 'test@integration.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    };
    this.authToken = null;
    this.userId = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    switch (type) {
      case 'success':
        console.log(`[${timestamp}] ✅ ${message}`.green);
        break;
      case 'error':
        console.log(`[${timestamp}] ❌ ${message}`.red);
        break;
      case 'warning':
        console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
        break;
      default:
        console.log(`[${timestamp}] ℹ️  ${message}`.blue);
    }
  }

  async testServiceHealth() {
    this.log('🏥 Test de santé des services...');

    try {
      // Test Auth Service
      const authHealth = await axios.get(`${this.authBaseUrl}/health`);
      if (authHealth.status === 200) {
        this.log('Auth Service est en ligne', 'success');
      }

      // Test User Service
      const userHealth = await axios.get(`${this.userBaseUrl}/health`);
      if (userHealth.status === 200) {
        this.log('User Service est en ligne', 'success');
      }
    } catch (error) {
      this.log(`Erreur health check: ${error.message}`, 'error');
      return false;
    }

    return true;
  }

  async testUserRegistration() {
    this.log('👤 Test d\'inscription utilisateur...');

    try {
      const response = await axios.post(`${this.authBaseUrl}/api/auth/register`, this.testUser);
      
      if (response.status === 201 && response.data.success) {
        this.log('Inscription réussie', 'success');
        this.authToken = response.data.data.accessToken;
        this.userId = response.data.data.user.userId;
        return true;
      }
    } catch (error) {
      if (error.response?.status === 409) {
        this.log('Utilisateur existe déjà, test de connexion...', 'warning');
        return await this.testUserLogin();
      }
      this.log(`Erreur inscription: ${error.response?.data?.message || error.message}`, 'error');
      return false;
    }
  }

  async testUserLogin() {
    this.log('🔑 Test de connexion utilisateur...');

    try {
      const response = await axios.post(`${this.authBaseUrl}/api/auth/login`, {
        email: this.testUser.email,
        password: this.testUser.password
      });

      if (response.status === 200 && response.data.success) {
        this.log('Connexion réussie', 'success');
        this.authToken = response.data.data.accessToken;
        this.userId = response.data.data.user.userId;
        return true;
      }
    } catch (error) {
      this.log(`Erreur connexion: ${error.response?.data?.message || error.message}`, 'error');
      return false;
    }
  }

  async testTokenVerification() {
    this.log('🔍 Test de vérification de token...');

    try {
      const response = await axios.get(`${this.authBaseUrl}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      if (response.status === 200 && response.data.success) {
        this.log('Vérification de token réussie', 'success');
        return true;
      }
    } catch (error) {
      this.log(`Erreur vérification token: ${error.response?.data?.message || error.message}`, 'error');
      return false;
    }
  }

  async testUserServiceAuthMiddleware() {
    this.log('🛡️  Test du middleware d\'authentification User Service...');

    try {
      const response = await axios.get(`${this.userBaseUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      if (response.status === 200) {
        this.log('Middleware d\'authentification fonctionne', 'success');
        return true;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        this.log('Profil non trouvé (normal pour un nouveau utilisateur)', 'warning');
        return true;
      }
      this.log(`Erreur middleware auth: ${error.response?.data?.message || error.message}`, 'error');
      return false;
    }
  }

  async testInterServiceCommunication() {
    this.log('📞 Test de communication inter-services...');

    try {
      // Le user-service doit pouvoir récupérer les infos utilisateur depuis auth-service
      const response = await axios.get(`${this.userBaseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      if (response.status === 200 || response.status === 403) {
        this.log('Communication inter-services fonctionne', 'success');
        return true;
      }
    } catch (error) {
      this.log(`Erreur communication: ${error.response?.data?.message || error.message}`, 'error');
      return false;
    }
  }

  async runAllTests() {
    this.log('🚀 Démarrage des tests d\'intégration...\n');

    const tests = [
      { name: 'Health Check', method: this.testServiceHealth },
      { name: 'User Registration', method: this.testUserRegistration },
      { name: 'Token Verification', method: this.testTokenVerification },
      { name: 'User Service Auth Middleware', method: this.testUserServiceAuthMiddleware },
      { name: 'Inter-Service Communication', method: this.testInterServiceCommunication }
    ];

    let passedTests = 0;
    const totalTests = tests.length;

    for (const test of tests) {
      this.log(`\n--- Test: ${test.name} ---`);
      try {
        const result = await test.method.bind(this)();
        if (result) {
          passedTests++;
          this.log(`${test.name} - PASSÉ`, 'success');
        } else {
          this.log(`${test.name} - ÉCHOUÉ`, 'error');
        }
      } catch (error) {
        this.log(`${test.name} - ERREUR: ${error.message}`, 'error');
      }
      
      // Petite pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.log(`\n📊 Résultats des tests: ${passedTests}/${totalTests} tests passés`);
    
    if (passedTests === totalTests) {
      this.log('🎉 Tous les tests d\'intégration sont passés!', 'success');
      return true;
    } else {
      this.log('⚠️  Certains tests ont échoué. Vérifiez la configuration.', 'warning');
      return false;
    }
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erreur lors des tests:', error.message);
      process.exit(1);
    });
}

module.exports = IntegrationTester;
