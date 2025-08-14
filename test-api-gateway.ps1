# Script de test complet pour l'API Gateway
# Ce script teste tous les endpoints disponibles

Write-Host "🧪 Test complet de l'API Gateway Helpdesk" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

$BaseUrl = "http://localhost:8080"
$script:TestResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    Write-Host "🔍 Testing: $Name" -ForegroundColor Yellow
    Write-Host "   URL: $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json
            $params.ContentType = "application/json"
        }
        
        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }
        
        $response = Invoke-RestMethod @params
        
        Write-Host "   ✅ SUCCÈS" -ForegroundColor Green
        
        # Afficher quelques détails de la réponse
        if ($response.service) {
            Write-Host "   📝 Service: $($response.service)" -ForegroundColor Gray
        }
        if ($response.status) {
            Write-Host "   📝 Status: $($response.status)" -ForegroundColor Gray
        }
        if ($response.message) {
            Write-Host "   📝 Message: $($response.message)" -ForegroundColor Gray
        }
        if ($response.version) {
            Write-Host "   📝 Version: $($response.version)" -ForegroundColor Gray
        }
        
        $script:TestResults += @{
            Name = $Name
            Status = "SUCCÈS"
            Response = $response
        }
        
    } catch {
        $errorMessage = $_.Exception.Message
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "   ❌ ÉCHEC (HTTP $statusCode)" -ForegroundColor Red
        } else {
            Write-Host "   ❌ ÉCHEC" -ForegroundColor Red
        }
        Write-Host "   📝 Erreur: $errorMessage" -ForegroundColor Red
        
        $script:TestResults += @{
            Name = $Name
            Status = "ÉCHEC"
            Error = $errorMessage
        }
    }
    
    Write-Host ""
}

# Test 1: API Gateway lui-même
Write-Host "1️⃣ TESTS DE L'API GATEWAY" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta

Test-Endpoint -Name "API Gateway - Page d'accueil" -Url "$BaseUrl/"
Test-Endpoint -Name "API Gateway - Health Check" -Url "$BaseUrl/health"

# Test 2: Service d'authentification
Write-Host "2️⃣ TESTS DU SERVICE D'AUTHENTIFICATION" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Magenta

Test-Endpoint -Name "Auth Service - Health Check" -Url "$BaseUrl/api/auth/health"
Test-Endpoint -Name "Auth Service - Documentation API" -Url "$BaseUrl/api/auth/api-docs"

# Test 3: Service utilisateur
Write-Host "3️⃣ TESTS DU SERVICE UTILISATEUR" -ForegroundColor Magenta
Write-Host "==============================" -ForegroundColor Magenta

Test-Endpoint -Name "User Service - Health Check" -Url "$BaseUrl/api/users/health"

# Test 4: Service de tickets
Write-Host "4️⃣ TESTS DU SERVICE DE TICKETS" -ForegroundColor Magenta
Write-Host "=============================" -ForegroundColor Magenta

Test-Endpoint -Name "Ticket Service - Health Check" -Url "$BaseUrl/api/tickets/health"

# Test 5: Service de fichiers
Write-Host "5️⃣ TESTS DU SERVICE DE FICHIERS" -ForegroundColor Magenta
Write-Host "==============================" -ForegroundColor Magenta

Test-Endpoint -Name "File Service - Health Check" -Url "$BaseUrl/api/files/health"
Test-Endpoint -Name "File Service - Info" -Url "$BaseUrl/api/files/"

# Test 6: Endpoints qui devraient retourner des erreurs (pour tester la gestion d'erreurs)
Write-Host "6️⃣ TESTS DE GESTION D'ERREURS" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

Test-Endpoint -Name "Endpoint inexistant" -Url "$BaseUrl/api/nonexistent"

# Résumé des résultats
Write-Host "📊 RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

$successCount = ($script:TestResults | Where-Object { $_.Status -eq "SUCCÈS" }).Count
$failureCount = ($script:TestResults | Where-Object { $_.Status -eq "ÉCHEC" }).Count
$totalCount = $script:TestResults.Count

Write-Host ""
Write-Host "📈 Statistiques:" -ForegroundColor Yellow
Write-Host "   Total des tests: $totalCount" -ForegroundColor Gray
Write-Host "   Succès: $successCount" -ForegroundColor Green
Write-Host "   Échecs: $failureCount" -ForegroundColor Red
Write-Host "   Taux de succès: $([math]::Round(($successCount / $totalCount) * 100, 2))%" -ForegroundColor Cyan

Write-Host ""
if ($failureCount -eq 0) {
    Write-Host "🎉 TOUS LES TESTS SONT PASSÉS ! L'API Gateway fonctionne parfaitement !" -ForegroundColor Green
} else {
    Write-Host "⚠️  Il y a quelques échecs à examiner" -ForegroundColor Yellow
}

# Détails des échecs
$failures = $script:TestResults | Where-Object { $_.Status -eq "ÉCHEC" }
if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ DÉTAILS DES ÉCHECS:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "   • $($failure.Name): $($failure.Error)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🔗 URLs IMPORTANTES:" -ForegroundColor Yellow
Write-Host "   API Gateway: http://localhost:8080" -ForegroundColor Gray
Write-Host "   Health Check: http://localhost:8080/health" -ForegroundColor Gray
Write-Host "   Interface de test: file:///$(Get-Location)/test-api-gateway.html" -ForegroundColor Gray

Write-Host ""
Write-Host "📝 COMMANDES UTILES:" -ForegroundColor Yellow
Write-Host "   Logs nginx:        docker logs helpdesk-nginx-gateway" -ForegroundColor Gray
Write-Host "   Statut services:   docker-compose -f docker-compose.services.yml ps" -ForegroundColor Gray
Write-Host "   Redémarrer nginx:  docker restart helpdesk-nginx-gateway" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ Test terminé !" -ForegroundColor Green
