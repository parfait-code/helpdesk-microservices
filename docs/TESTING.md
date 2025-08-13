# 🧪 Guide de Tests - Helpdesk Microservices

Ce guide explique comment exécuter et créer des tests pour le système helpdesk microservices.

## 📋 Table des Matières

-   [Types de Tests](#-types-de-tests)
-   [Configuration des Tests](#-configuration-des-tests)
-   [Tests Automatisés](#-tests-automatisés)
-   [Tests Unitaires](#-tests-unitaires)
-   [Tests d'Intégration](#-tests-dintégration)
-   [Tests de Performance](#-tests-de-performance)
-   [Tests de Sécurité](#-tests-de-sécurité)
-   [CI/CD Pipeline](#-cicd-pipeline)
-   [Rapports de Tests](#-rapports-de-tests)

## 🔍 Types de Tests

### 1. Tests Unitaires

-   Test des fonctions individuelles
-   Mocking des dépendances
-   Coverage > 80%

### 2. Tests d'Intégration

-   Test des interactions entre services
-   Test des APIs REST
-   Test de la base de données

### 3. Tests End-to-End (E2E)

-   Scénarios utilisateur complets
-   Test de l'interface utilisateur
-   Test des workflows métier

### 4. Tests de Performance

-   Tests de charge
-   Tests de stress
-   Tests de scalabilité

### 5. Tests de Sécurité

-   Tests de vulnérabilités
-   Tests d'authentification
-   Tests d'autorisation

## ⚙️ Configuration des Tests

### Structure des Tests

```
services/
├── auth-service/
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── integration/
│   │   │   ├── auth.test.js
│   │   │   └── database.test.js
│   │   ├── mocks/
│   │   └── setup.js
│   └── jest.config.js
```

### Configuration Jest

```javascript
// jest.config.js
module.exports = {
    testEnvironment: "node",
    coverageDirectory: "coverage",
    collectCoverageFrom: [
        "src/**/*.js",
        "!src/config/**",
        "!src/migrations/**",
    ],
    coverageReporters: ["text", "lcov", "html"],
    setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
    testMatch: ["<rootDir>/tests/**/*.test.js"],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};
```

### Configuration de Base

```javascript
// tests/setup.js
const { Pool } = require("pg");
const Redis = require("ioredis");

// Configuration de la base de données de test
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";
process.env.REDIS_URL = "redis://localhost:6379/15";

// Nettoyage avant chaque test
beforeEach(async () => {
    // Nettoyer la base de données
    await cleanupDatabase();

    // Nettoyer Redis
    await cleanupRedis();
});

afterAll(async () => {
    // Fermer les connexions
    await closeConnections();
});

async function cleanupDatabase() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    await pool.query("TRUNCATE TABLE users CASCADE");
    await pool.query("TRUNCATE TABLE refresh_tokens CASCADE");
    await pool.end();
}

async function cleanupRedis() {
    const redis = new Redis(process.env.REDIS_URL);
    await redis.flushdb();
    await redis.disconnect();
}
```

## 🤖 Tests Automatisés

### Script de Test Principal

```powershell
# test-services.ps1
param(
    [string]$Service = "all",
    [string]$Environment = "test"
)

Write-Host "🧪 Running Helpdesk Microservices Tests" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Configuration
$Services = @("auth-service", "user-service", "ticket-service", "file-service")
$TestResults = @{}

# Démarrer les services de test
function Start-TestServices {
    Write-Host "`n🚀 Starting test services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.test.yml up -d --wait
    Start-Sleep -Seconds 10
}

# Arrêter les services de test
function Stop-TestServices {
    Write-Host "`n🛑 Stopping test services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.test.yml down -v
}

# Exécuter les tests pour un service
function Test-Service {
    param([string]$ServiceName)

    Write-Host "`n🧪 Testing $ServiceName..." -ForegroundColor Cyan

    try {
        $Result = docker-compose -f docker-compose.test.yml exec $ServiceName npm test
        $TestResults[$ServiceName] = @{
            Status = "PASSED"
            Output = $Result
        }
        Write-Host "✅ $ServiceName tests passed" -ForegroundColor Green
    }
    catch {
        $TestResults[$ServiceName] = @{
            Status = "FAILED"
            Output = $_.Exception.Message
        }
        Write-Host "❌ $ServiceName tests failed" -ForegroundColor Red
    }
}

# Exécuter les tests d'intégration
function Test-Integration {
    Write-Host "`n🔗 Running integration tests..." -ForegroundColor Cyan

    # Test de santé des services
    $HealthChecks = @(
        @{ Service = "Auth"; URL = "http://localhost:3001/api/v1/health" },
        @{ Service = "User"; URL = "http://localhost:3002/api/v1/health" },
        @{ Service = "Ticket"; URL = "http://localhost:3003/api/v1/health" }
    )

    foreach ($Check in $HealthChecks) {
        try {
            $Response = Invoke-RestMethod -Uri $Check.URL -TimeoutSec 5
            if ($Response.success) {
                Write-Host "✅ $($Check.Service) Service Health Check" -ForegroundColor Green
            } else {
                throw "Health check failed"
            }
        }
        catch {
            Write-Host "❌ $($Check.Service) Service Health Check" -ForegroundColor Red
        }
    }

    # Test du workflow complet
    Test-CompleteWorkflow
}

# Test du workflow complet
function Test-CompleteWorkflow {
    Write-Host "`n📋 Testing complete workflow..." -ForegroundColor Cyan

    try {
        # 1. Inscription
        $RegisterBody = @{
            email = "test@example.com"
            password = "TestPassword123!"
            firstName = "Test"
            lastName = "User"
        } | ConvertTo-Json

        $RegisterResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/register" `
            -Method POST -ContentType "application/json" -Body $RegisterBody

        if (-not $RegisterResponse.success) {
            throw "Registration failed"
        }

        $Token = $RegisterResponse.data.tokens.accessToken
        Write-Host "✅ User Registration" -ForegroundColor Green

        # 2. Création d'un ticket
        $TicketBody = @{
            title = "Test Ticket"
            description = "This is a test ticket"
            priority = "medium"
            category = "support"
        } | ConvertTo-Json

        $TicketResponse = Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tickets" `
            -Method POST -ContentType "application/json" -Body $TicketBody `
            -Headers @{ Authorization = "Bearer $Token" }

        if (-not $TicketResponse.success) {
            throw "Ticket creation failed"
        }

        Write-Host "✅ Ticket Creation" -ForegroundColor Green

        # 3. Récupération des tickets
        $TicketsResponse = Invoke-RestMethod -Uri "http://localhost:3003/api/v1/tickets" `
            -Method GET -Headers @{ Authorization = "Bearer $Token" }

        if (-not $TicketsResponse.success -or $TicketsResponse.data.tickets.Count -eq 0) {
            throw "Tickets retrieval failed"
        }

        Write-Host "✅ Tickets Retrieval" -ForegroundColor Green

    }
    catch {
        Write-Host "❌ Workflow test failed: $_" -ForegroundColor Red
    }
}

# Génération du rapport
function Generate-TestReport {
    Write-Host "`n📊 Test Report" -ForegroundColor Yellow
    Write-Host "===============" -ForegroundColor Yellow

    foreach ($Service in $TestResults.Keys) {
        $Status = $TestResults[$Service].Status
        $Color = if ($Status -eq "PASSED") { "Green" } else { "Red" }
        Write-Host "  $Service : $Status" -ForegroundColor $Color
    }
}

# Exécution principale
try {
    Start-TestServices

    if ($Service -eq "all") {
        foreach ($ServiceName in $Services) {
            Test-Service -ServiceName $ServiceName
        }
        Test-Integration
    } else {
        Test-Service -ServiceName $Service
    }

    Generate-TestReport
}
finally {
    Stop-TestServices
}
```

## 🧪 Tests Unitaires

### Exemple : Test du Contrôleur Auth

```javascript
// tests/unit/controllers/authController.test.js
const AuthController = require("../../../src/controllers/authController");
const AuthService = require("../../../src/services/authService");
const { mockRequest, mockResponse } = require("jest-mock-req-res");

jest.mock("../../../src/services/authService");

describe("AuthController", () => {
    let authController;
    let mockAuthService;
    let req, res;

    beforeEach(() => {
        mockAuthService = new AuthService();
        authController = new AuthController();
        req = mockRequest();
        res = mockResponse();

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe("register", () => {
        it("should register a new user successfully", async () => {
            // Arrange
            const userData = {
                email: "test@example.com",
                password: "Password123!",
                firstName: "Test",
                lastName: "User",
            };

            const expectedResult = {
                user: { id: "user-id", ...userData },
                tokens: { accessToken: "token", refreshToken: "refresh" },
            };

            req.body = userData;
            mockAuthService.register.mockResolvedValue(expectedResult);

            // Act
            await authController.register(req, res);

            // Assert
            expect(mockAuthService.register).toHaveBeenCalledWith(userData);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "User registered successfully",
                data: expectedResult,
            });
        });

        it("should handle registration errors", async () => {
            // Arrange
            req.body = { email: "invalid-email" };
            const error = new Error("Email already exists");
            mockAuthService.register.mockRejectedValue(error);

            // Act
            await authController.register(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Registration failed",
                error: error.message,
            });
        });
    });

    describe("login", () => {
        it("should login user with valid credentials", async () => {
            // Arrange
            const loginData = {
                email: "test@example.com",
                password: "Password123!",
            };

            const expectedResult = {
                user: { id: "user-id", email: loginData.email },
                tokens: { accessToken: "token", refreshToken: "refresh" },
            };

            req.body = loginData;
            mockAuthService.login.mockResolvedValue(expectedResult);

            // Act
            await authController.login(req, res);

            // Assert
            expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Login successful",
                data: expectedResult,
            });
        });
    });
});
```

### Exemple : Test du Service Auth

```javascript
// tests/unit/services/authService.test.js
const AuthService = require("../../../src/services/authService");
const User = require("../../../src/models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

jest.mock("../../../src/models/User");
jest.mock("bcrypt");
jest.mock("jsonwebtoken");

describe("AuthService", () => {
    let authService;
    let mockUserModel;

    beforeEach(() => {
        authService = new AuthService();
        mockUserModel = new User();
        jest.clearAllMocks();
    });

    describe("register", () => {
        it("should register a new user", async () => {
            // Arrange
            const userData = {
                email: "test@example.com",
                password: "Password123!",
                firstName: "Test",
                lastName: "User",
            };

            const hashedPassword = "hashed-password";
            const savedUser = {
                id: "user-id",
                ...userData,
                password: hashedPassword,
            };

            mockUserModel.findByEmail.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue(hashedPassword);
            mockUserModel.create.mockResolvedValue(savedUser);
            jwt.sign.mockReturnValue("access-token");

            // Act
            const result = await authService.register(userData);

            // Assert
            expect(mockUserModel.findByEmail).toHaveBeenCalledWith(
                userData.email
            );
            expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
            expect(mockUserModel.create).toHaveBeenCalledWith({
                ...userData,
                password: hashedPassword,
            });
            expect(result).toHaveProperty("user");
            expect(result).toHaveProperty("tokens");
        });

        it("should throw error if email already exists", async () => {
            // Arrange
            const userData = { email: "existing@example.com" };
            mockUserModel.findByEmail.mockResolvedValue({
                id: "existing-user",
            });

            // Act & Assert
            await expect(authService.register(userData)).rejects.toThrow(
                "Email already exists"
            );
        });
    });
});
```

## 🔗 Tests d'Intégration

### Configuration de l'Environnement de Test

```javascript
// tests/integration/setup.js
const { Pool } = require("pg");
const Redis = require("ioredis");
const app = require("../../src/app");

let testPool;
let testRedis;
let server;

beforeAll(async () => {
    // Démarrer le serveur de test
    server = app.listen(0); // Port aléatoire

    // Initialiser la base de données de test
    testPool = new Pool({
        connectionString: process.env.TEST_DATABASE_URL,
    });

    // Initialiser Redis de test
    testRedis = new Redis(process.env.TEST_REDIS_URL);

    // Migrer la base de données
    await runMigrations(testPool);
});

afterAll(async () => {
    await server.close();
    await testPool.end();
    await testRedis.disconnect();
});

beforeEach(async () => {
    // Nettoyer les données de test
    await cleanupTestData();
});

async function runMigrations(pool) {
    // Exécuter les migrations de test
    const migrations = [
        `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR UNIQUE NOT NULL,
      password VARCHAR NOT NULL,
      first_name VARCHAR NOT NULL,
      last_name VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    ];

    for (const migration of migrations) {
        await pool.query(migration);
    }
}

async function cleanupTestData() {
    await testPool.query("DELETE FROM users WHERE email LIKE '%test%'");
    await testRedis.flushdb();
}

module.exports = { testPool, testRedis };
```

### Test d'API Complète

```javascript
// tests/integration/auth.test.js
const request = require("supertest");
const app = require("../../src/app");
const { testPool } = require("./setup");

describe("Auth API Integration Tests", () => {
    describe("POST /api/v1/auth/register", () => {
        it("should register a new user", async () => {
            const userData = {
                email: "integration.test@example.com",
                password: "TestPassword123!",
                firstName: "Integration",
                lastName: "Test",
            };

            const response = await request(app)
                .post("/api/v1/auth/register")
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.tokens).toHaveProperty("accessToken");
            expect(response.body.data.tokens).toHaveProperty("refreshToken");

            // Vérifier que l'utilisateur est bien en base
            const result = await testPool.query(
                "SELECT * FROM users WHERE email = $1",
                [userData.email]
            );
            expect(result.rows).toHaveLength(1);
        });

        it("should return 409 for duplicate email", async () => {
            const userData = {
                email: "duplicate@example.com",
                password: "TestPassword123!",
                firstName: "Duplicate",
                lastName: "Test",
            };

            // Premier enregistrement
            await request(app)
                .post("/api/v1/auth/register")
                .send(userData)
                .expect(201);

            // Deuxième enregistrement (doit échouer)
            const response = await request(app)
                .post("/api/v1/auth/register")
                .send(userData)
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Email already exists");
        });
    });

    describe("POST /api/v1/auth/login", () => {
        it("should login with valid credentials", async () => {
            // Créer un utilisateur d'abord
            const userData = {
                email: "login.test@example.com",
                password: "TestPassword123!",
                firstName: "Login",
                lastName: "Test",
            };

            await request(app)
                .post("/api/v1/auth/register")
                .send(userData)
                .expect(201);

            // Tester la connexion
            const loginResponse = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    email: userData.email,
                    password: userData.password,
                })
                .expect(200);

            expect(loginResponse.body.success).toBe(true);
            expect(loginResponse.body.data.tokens).toHaveProperty(
                "accessToken"
            );
        });

        it("should return 401 for invalid credentials", async () => {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    email: "nonexistent@example.com",
                    password: "wrongpassword",
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});
```

## ⚡ Tests de Performance

### Configuration des Tests de Charge

```javascript
// tests/performance/load.test.js
const autocannon = require("autocannon");

describe("Performance Tests", () => {
    test("Auth service load test", async () => {
        const result = await autocannon({
            url: "http://localhost:3001/api/v1/health",
            connections: 10,
            pipelining: 1,
            duration: 30,
        });

        console.log("Load test results:", result);

        // Assertions sur les performances
        expect(result.requests.average).toBeGreaterThan(100); // 100 req/s minimum
        expect(result.latency.p99).toBeLessThan(1000); // 99th percentile < 1s
    });

    test("Registration endpoint stress test", async () => {
        // Test de stress sur l'inscription
        const results = [];

        for (let i = 0; i < 5; i++) {
            const result = await autocannon({
                url: "http://localhost:3001/api/v1/auth/register",
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    email: `stress${i}@example.com`,
                    password: "StressTest123!",
                    firstName: "Stress",
                    lastName: "Test",
                }),
                connections: 5,
                duration: 10,
            });

            results.push(result);
        }

        // Analyser les résultats
        const avgLatency =
            results.reduce((sum, r) => sum + r.latency.average, 0) /
            results.length;
        expect(avgLatency).toBeLessThan(500); // Latence moyenne < 500ms
    });
});
```

### Monitoring des Performances

```javascript
// tests/performance/monitor.js
const { performance } = require("perf_hooks");

function measurePerformance(fn, name) {
    return async (...args) => {
        const start = performance.now();
        const result = await fn.apply(this, args);
        const end = performance.now();

        console.log(`${name} took ${end - start} milliseconds`);

        // Envoyer les métriques à un système de monitoring
        if (process.env.MONITORING_ENABLED) {
            sendMetrics(name, end - start);
        }

        return result;
    };
}

function sendMetrics(operation, duration) {
    // Intégration avec Prometheus, DataDog, etc.
    console.log(`METRIC: ${operation}_duration_ms ${duration}`);
}

module.exports = { measurePerformance };
```

## 🔒 Tests de Sécurité

### Tests d'Authentification

```javascript
// tests/security/auth.test.js
const request = require("supertest");
const app = require("../../src/app");

describe("Security Tests", () => {
    describe("JWT Token Security", () => {
        it("should reject requests without token", async () => {
            await request(app).get("/api/v1/users/profile").expect(401);
        });

        it("should reject requests with invalid token", async () => {
            await request(app)
                .get("/api/v1/users/profile")
                .set("Authorization", "Bearer invalid-token")
                .expect(401);
        });

        it("should reject requests with expired token", async () => {
            // Créer un token expiré
            const expiredToken = "expired.jwt.token";

            await request(app)
                .get("/api/v1/users/profile")
                .set("Authorization", `Bearer ${expiredToken}`)
                .expect(401);
        });
    });

    describe("Input Validation", () => {
        it("should prevent SQL injection", async () => {
            const maliciousInput = {
                email: "'; DROP TABLE users; --",
                password: "password",
            };

            const response = await request(app)
                .post("/api/v1/auth/login")
                .send(maliciousInput)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it("should prevent XSS attacks", async () => {
            const xssPayload = {
                firstName: '<script>alert("xss")</script>',
                lastName: "Test",
            };

            const response = await request(app)
                .post("/api/v1/auth/register")
                .send({
                    email: "xss@example.com",
                    password: "Password123!",
                    ...xssPayload,
                });

            // Le nom ne doit pas contenir de scripts
            expect(response.body.data?.user?.firstName).not.toContain(
                "<script>"
            );
        });
    });

    describe("Rate Limiting", () => {
        it("should enforce rate limits", async () => {
            const promises = [];

            // Envoyer plus de requêtes que la limite
            for (let i = 0; i < 110; i++) {
                promises.push(request(app).get("/api/v1/health"));
            }

            const results = await Promise.all(promises);
            const rateLimitedRequests = results.filter((r) => r.status === 429);

            expect(rateLimitedRequests.length).toBeGreaterThan(0);
        });
    });
});
```

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/tests.yml
name: Tests

on:
    push:
        branches: [main, develop]
    pull_request:
        branches: [main]

jobs:
    unit-tests:
        runs-on: ubuntu-latest

        strategy:
            matrix:
                service: [auth-service, user-service, ticket-service]

        steps:
            - uses: actions/checkout@v3

            - name: Setup Node.js
              uses: actions/setup-node@v3
              with:
                  node-version: "18"
                  cache: "npm"
                  cache-dependency-path: services/${{ matrix.service }}/package-lock.json

            - name: Install dependencies
              run: |
                  cd services/${{ matrix.service }}
                  npm ci

            - name: Run unit tests
              run: |
                  cd services/${{ matrix.service }}
                  npm run test:unit

            - name: Upload coverage
              uses: codecov/codecov-action@v3
              with:
                  file: services/${{ matrix.service }}/coverage/lcov.info
                  flags: ${{ matrix.service }}

    integration-tests:
        runs-on: ubuntu-latest
        needs: unit-tests

        services:
            postgres:
                image: postgres:15
                env:
                    POSTGRES_PASSWORD: postgres
                options: >-
                    --health-cmd pg_isready
                    --health-interval 10s
                    --health-timeout 5s
                    --health-retries 5

            redis:
                image: redis:7
                options: >-
                    --health-cmd "redis-cli ping"
                    --health-interval 10s
                    --health-timeout 5s
                    --health-retries 5

        steps:
            - uses: actions/checkout@v3

            - name: Setup Docker Buildx
              uses: docker/setup-buildx-action@v2

            - name: Build and run services
              run: |
                  docker-compose -f docker-compose.test.yml up -d --build
                  sleep 30

            - name: Run integration tests
              run: |
                  ./test-services.sh

            - name: Cleanup
              if: always()
              run: |
                  docker-compose -f docker-compose.test.yml down -v

    security-scan:
        runs-on: ubuntu-latest

        steps:
            - uses: actions/checkout@v3

            - name: Run security audit
              run: |
                  npm audit --audit-level high --production

            - name: Run SAST scan
              uses: securecodewarrior/github-action-add-sarif@v1
              with:
                  sarif-file: "security-scan.sarif"
```

## 📊 Rapports de Tests

### Configuration des Rapports

```javascript
// jest.config.js
module.exports = {
    // ... autres configurations

    reporters: [
        "default",
        [
            "jest-html-reporters",
            {
                publicPath: "./test-reports",
                filename: "test-report.html",
                expand: true,
                hideIcon: false,
            },
        ],
        [
            "jest-junit",
            {
                outputDirectory: "./test-reports",
                outputName: "junit.xml",
            },
        ],
    ],

    collectCoverage: true,
    coverageReporters: ["text", "lcov", "html", "json-summary"],

    coverageDirectory: "coverage",
};
```

### Script de Génération de Rapport

```bash
#!/bin/bash
# generate-test-report.sh

echo "📊 Generating comprehensive test report..."

# Créer le dossier de rapports
mkdir -p reports/{coverage,performance,security}

# Exécuter les tests avec coverage
npm run test:coverage

# Générer le rapport de performance
npm run test:performance > reports/performance/results.txt

# Générer le rapport de sécurité
npm audit --json > reports/security/audit.json

# Combiner tous les rapports
node scripts/combine-reports.js

echo "✅ Test reports generated in ./reports/"
```

### Dashboard de Tests

```html
<!-- reports/dashboard.html -->
<!DOCTYPE html>
<html>
    <head>
        <title>Helpdesk Microservices - Test Dashboard</title>
        <style>
            .metric {
                display: inline-block;
                margin: 20px;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 5px;
            }
            .passed {
                border-color: green;
            }
            .failed {
                border-color: red;
            }
        </style>
    </head>
    <body>
        <h1>Test Dashboard</h1>

        <div class="metrics">
            <div class="metric passed">
                <h3>Unit Tests</h3>
                <p>Passed: <span id="unit-passed">0</span></p>
                <p>Failed: <span id="unit-failed">0</span></p>
            </div>

            <div class="metric passed">
                <h3>Integration Tests</h3>
                <p>Passed: <span id="integration-passed">0</span></p>
                <p>Failed: <span id="integration-failed">0</span></p>
            </div>

            <div class="metric">
                <h3>Code Coverage</h3>
                <p>Lines: <span id="coverage-lines">0%</span></p>
                <p>Functions: <span id="coverage-functions">0%</span></p>
            </div>
        </div>

        <script>
            // Charger les données des tests
            fetch("test-results.json")
                .then((response) => response.json())
                .then((data) => {
                    updateMetrics(data);
                });
        </script>
    </body>
</html>
```

---

Ce guide de tests complet vous permet de mettre en place une stratégie de tests robuste pour votre système helpdesk microservices, assurant la qualité, la sécurité et les performances de votre application.
