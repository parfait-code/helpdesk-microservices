# Script PowerShell pour gérer l'API Gateway et les microservices
# Utilisation: .\manage-services.ps1 [start|stop|restart|status|logs]

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "health")]
    [string]$Action = "status"
)

# Couleurs pour l'affichage
function Write-ColorText {
    param(
        [string]$Text,
        [ConsoleColor]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

function Write-Success { param([string]$Text) Write-ColorText $Text "Green" }
function Write-Warning { param([string]$Text) Write-ColorText $Text "Yellow" }
function Write-Error { param([string]$Text) Write-ColorText $Text "Red" }
function Write-Info { param([string]$Text) Write-ColorText $Text "Cyan" }

# Configuration
$ComposeFile = "docker-compose.services.yml"
$ProjectName = "helpdesk-microservices"

Write-Info "=== Gestionnaire des Services Helpdesk ==="
Write-Info "Action: $Action"
Write-Host ""

switch ($Action) {
    "start" {
        Write-Info "🚀 Démarrage de tous les services..."
        
        try {
            # Construire les images si nécessaire
            Write-Info "Construction des images Docker..."
            docker-compose -f $ComposeFile build --no-cache
            
            # Démarrer tous les services
            Write-Info "Démarrage des services..."
            docker-compose -f $ComposeFile up -d
            
            # Attendre que les services soient prêts
            Write-Info "Attente du démarrage des services..."
            Start-Sleep 10
            
            # Vérifier l'état des services
            Write-Success "✅ Services démarrés !"
            Write-Info "État des services:"
            docker-compose -f $ComposeFile ps
            
            Write-Host ""
            Write-Success "🌐 API Gateway disponible sur: http://localhost:8080"
            Write-Info "📖 Documentation: http://localhost:8080/"
            Write-Info "🏥 Health Check: http://localhost:8080/health"
            
        } catch {
            Write-Error "❌ Erreur lors du démarrage: $($_.Exception.Message)"
            exit 1
        }
    }
    
    "stop" {
        Write-Warning "⏹️ Arrêt de tous les services..."
        
        try {
            docker-compose -f $ComposeFile down
            Write-Success "✅ Tous les services ont été arrêtés"
        } catch {
            Write-Error "❌ Erreur lors de l'arrêt: $($_.Exception.Message)"
            exit 1
        }
    }
    
    "restart" {
        Write-Warning "🔄 Redémarrage de tous les services..."
        
        try {
            docker-compose -f $ComposeFile down
            Start-Sleep 2
            docker-compose -f $ComposeFile up -d
            Start-Sleep 10
            
            Write-Success "✅ Services redémarrés !"
            docker-compose -f $ComposeFile ps
        } catch {
            Write-Error "❌ Erreur lors du redémarrage: $($_.Exception.Message)"
            exit 1
        }
    }
    
    "status" {
        Write-Info "📊 État des services:"
        
        try {
            docker-compose -f $ComposeFile ps
            
            Write-Host ""
            Write-Info "🔍 Vérification de l'accessibilité des services..."
            
            # Tester l'API Gateway
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:8080/health" -TimeoutSec 5
                Write-Success "✅ API Gateway: ACCESSIBLE"
            } catch {
                Write-Error "❌ API Gateway: INACCESSIBLE"
            }
            
            # Tester chaque service via le gateway
            $services = @(
                @{Name="Auth Service"; Url="http://localhost:8080/api/auth/health"},
                @{Name="User Service"; Url="http://localhost:8080/api/users/health"}, 
                @{Name="Ticket Service"; Url="http://localhost:8080/api/tickets/health"},
                @{Name="File Service"; Url="http://localhost:8080/api/files/health"}
            )
            
            foreach ($service in $services) {
                try {
                    $response = Invoke-RestMethod -Uri $service.Url -TimeoutSec 5
                    Write-Success "✅ $($service.Name): ACCESSIBLE"
                } catch {
                    Write-Error "❌ $($service.Name): INACCESSIBLE"
                }
            }
            
        } catch {
            Write-Error "❌ Erreur lors de la vérification: $($_.Exception.Message)"
        }
    }
    
    "logs" {
        Write-Info "📄 Affichage des logs..."
        Write-Info "Appuyez sur Ctrl+C pour arrêter l'affichage"
        Write-Host ""
        
        try {
            docker-compose -f $ComposeFile logs -f
        } catch {
            Write-Warning "Affichage des logs interrompu"
        }
    }
    
    "health" {
        Write-Info "🏥 Test de santé complet des services..."
        Write-Host ""
        
        # Tests de santé détaillés
        $healthChecks = @(
            @{Name="API Gateway"; Url="http://localhost:8080/health"; Expected="healthy"},
            @{Name="API Info"; Url="http://localhost:8080/"; Expected="Helpdesk API Gateway"},
            @{Name="Auth Service"; Url="http://localhost:8080/api/auth/health"; Expected="OK"},
            @{Name="User Service"; Url="http://localhost:8080/api/users/health"; Expected="OK"},
            @{Name="Ticket Service"; Url="http://localhost:8080/api/tickets/health"; Expected="OK"},
            @{Name="File Service"; Url="http://localhost:8080/api/files/health"; Expected="OK"}
        )
        
        $successCount = 0
        foreach ($check in $healthChecks) {
            try {
                $response = Invoke-RestMethod -Uri $check.Url -TimeoutSec 10
                $responseText = if ($response -is [string]) { $response } else { $response | ConvertTo-Json }
                
                if ($responseText -like "*$($check.Expected)*") {
                    Write-Success "✅ $($check.Name): OK"
                    $successCount++
                } else {
                    Write-Warning "⚠️ $($check.Name): Réponse inattendue"
                }
            } catch {
                Write-Error "❌ $($check.Name): ERREUR - $($_.Exception.Message)"
            }
        }
        
        Write-Host ""
        Write-Info "Résultat: $successCount/$($healthChecks.Count) services opérationnels"
        
        if ($successCount -eq $healthChecks.Count) {
            Write-Success "🎉 Tous les services sont opérationnels !"
        } else {
            Write-Warning "⚠️ Certains services présentent des problèmes"
        }
    }
}

Write-Host ""
Write-Info "=== Commandes disponibles ==="
Write-Host ".\manage-services.ps1 start    - Démarrer tous les services" -ForegroundColor Gray
Write-Host ".\manage-services.ps1 stop     - Arrêter tous les services" -ForegroundColor Gray  
Write-Host ".\manage-services.ps1 restart  - Redémarrer tous les services" -ForegroundColor Gray
Write-Host ".\manage-services.ps1 status   - Voir l'état des services" -ForegroundColor Gray
Write-Host ".\manage-services.ps1 logs     - Voir les logs en temps réel" -ForegroundColor Gray
Write-Host ".\manage-services.ps1 health   - Test de sante complet" -ForegroundColor Gray
