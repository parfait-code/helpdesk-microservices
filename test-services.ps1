# Script de test automatisé pour les microservices Helpdesk (PowerShell)
# Usage: .\test-services.ps1

Write-Host "🚀 Testing Helpdesk Microservices" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Configuration
$AUTH_URL = "http://localhost:3001"
$USER_URL = "http://localhost:3002"
$TICKET_URL = "http://localhost:3003"

# Variables globales
$ACCESS_TOKEN = ""
$USER_ID = ""
$TICKET_ID = ""

# Fonction pour afficher les résultats
function Print-Result {
    param($Success, $Message)
    if ($Success) {
        Write-Host "✅ $Message" -ForegroundColor Green
    } else {
        Write-Host "❌ $Message" -ForegroundColor Red
    }
}

# Fonction pour faire des requêtes HTTP
function Invoke-SafeWebRequest {
    param($Uri, $Method = "GET", $Headers = @{}, $Body = $null, $ContentType = "application/json")
    
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = $ContentType
        }
        
        return Invoke-WebRequest @params
    } catch {
        return $_.Exception.Response
    }
}

Write-Host "`n1. Testing Health Checks" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

# Test Auth Service Health
try {
    $response = Invoke-SafeWebRequest -Uri "$AUTH_URL/health"
    Print-Result ($response.StatusCode -eq 200) "Auth Service Health Check"
} catch {
    Print-Result $false "Auth Service Health Check"
}

# Test User Service Health  
try {
    $response = Invoke-SafeWebRequest -Uri "$USER_URL/health"
    Print-Result ($response.StatusCode -eq 200) "User Service Health Check"
} catch {
    Print-Result $false "User Service Health Check"
}

# Test Ticket Service Health
try {
    $response = Invoke-SafeWebRequest -Uri "$TICKET_URL/health"
    Print-Result ($response.StatusCode -eq 200) "Ticket Service Health Check"
} catch {
    Print-Result $false "Ticket Service Health Check"
}

Write-Host "`n2. Testing Authentication" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

# Register User
Write-Host "Registering new user..." -ForegroundColor Gray

$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$registerBody = @{
    username = "testuser_$timestamp"
    email = "test$timestamp@example.com"
    password = "SecurePass123!"
    confirmPassword = "SecurePass123!"
    firstName = "Test"
    lastName = "User"
    role = "user"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-SafeWebRequest -Uri "$AUTH_URL/api/auth/register" -Method "POST" -Body $registerBody
    
    if ($registerResponse.StatusCode -eq 201) {
        $responseData = $registerResponse.Content | ConvertFrom-Json
        $ACCESS_TOKEN = $responseData.data.accessToken
        $USER_ID = $responseData.data.user.id
        Print-Result $true "User Registration"
        Write-Host "  User ID: $USER_ID" -ForegroundColor Gray
    } else {
        Print-Result $false "User Registration"
        Write-Host "  Status Code: $($registerResponse.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Print-Result $false "User Registration"
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verify Token
try {
    $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
    $verifyResponse = Invoke-SafeWebRequest -Uri "$AUTH_URL/api/auth/verify" -Method "POST" -Headers $headers
    Print-Result ($verifyResponse.StatusCode -eq 200) "Token Verification"
} catch {
    Print-Result $false "Token Verification"
}

Write-Host "`n3. Testing User Service" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

# Get Profile
try {
    $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
    $profileResponse = Invoke-SafeWebRequest -Uri "$USER_URL/api/v1/users/profile" -Headers $headers
    Print-Result ($profileResponse.StatusCode -eq 200) "Get User Profile"
} catch {
    Print-Result $false "Get User Profile"
}

# Update Profile
try {
    $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
    $updateBody = @{
        firstName = "Updated"
        lastName = "Name"
        phone = "+1234567890"
    } | ConvertTo-Json
    
    $updateResponse = Invoke-SafeWebRequest -Uri "$USER_URL/api/v1/users/profile" -Method "PUT" -Headers $headers -Body $updateBody
    Print-Result ($updateResponse.StatusCode -eq 200) "Update User Profile"
} catch {
    Print-Result $false "Update User Profile"
}

Write-Host "`n4. Testing Ticket Service" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

# Create Ticket
Write-Host "Creating test ticket..." -ForegroundColor Gray
try {
    $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
    $ticketBody = @{
        title = "Test Bug Report - Automated Test"
        description = "This is an automated test ticket created by the PowerShell test script. It simulates a bug report with detailed reproduction steps."
        priority = "high"
        category = "bug"
        userId = $USER_ID
    } | ConvertTo-Json
    
        $ticketResponse = Invoke-SafeWebRequest -Uri "$TICKET_URL/api/v1/tickets" -Method "POST" -Headers $headers -Body $ticketBody    if ($ticketResponse.StatusCode -eq 201) {
        $ticketData = $ticketResponse.Content | ConvertFrom-Json
        $TICKET_ID = $ticketData.data.id
        Print-Result $true "Create Ticket"
        Write-Host "  Ticket ID: $TICKET_ID" -ForegroundColor Gray
    } else {
        Print-Result $false "Create Ticket"
        Write-Host "  Status Code: $($ticketResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Print-Result $false "Create Ticket"
}

# Get All Tickets
try {
    $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
    $ticketsResponse = Invoke-SafeWebRequest -Uri "$TICKET_URL/api/v1/tickets?page=1&limit=10" -Headers $headers
    Print-Result ($ticketsResponse.StatusCode -eq 200) "Get All Tickets"
} catch {
    Print-Result $false "Get All Tickets"
}

# Get Ticket by ID
if ($TICKET_ID) {
    try {
        $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
        $ticketDetailResponse = Invoke-SafeWebRequest -Uri "$TICKET_URL/api/v1/tickets/$TICKET_ID" -Headers $headers
        Print-Result ($ticketDetailResponse.StatusCode -eq 200) "Get Ticket by ID"
        
        # Update Ticket
        $updateTicketBody = @{
            status = "in_progress"
            priority = "urgent"
            description = "Updated description - Ticket now in progress"
        } | ConvertTo-Json
        
        $updateTicketResponse = Invoke-SafeWebRequest -Uri "$TICKET_URL/api/v1/tickets/$TICKET_ID" -Method "PUT" -Headers $headers -Body $updateTicketBody
        Print-Result ($updateTicketResponse.StatusCode -eq 200) "Update Ticket"
    } catch {
        Print-Result $false "Get Ticket by ID / Update Ticket"
    }
}

# Get User Tickets
try {
    $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
    $userTicketsResponse = Invoke-SafeWebRequest -Uri "$TICKET_URL/api/v1/tickets/user/$USER_ID" -Headers $headers
    Print-Result ($userTicketsResponse.StatusCode -eq 200) "Get User Tickets"
} catch {
    Print-Result $false "Get User Tickets"
}

# Get Ticket Stats
try {
    $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
    $statsResponse = Invoke-SafeWebRequest -Uri "$TICKET_URL/api/v1/tickets/stats" -Headers $headers
    Print-Result ($statsResponse.StatusCode -eq 200) "Get Ticket Statistics"
} catch {
    Print-Result $false "Get Ticket Statistics"
}

Write-Host "`n5. Testing Error Handling" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

# Test Invalid Token
try {
    $invalidHeaders = @{ "Authorization" = "Bearer invalid_token" }
    $invalidTokenResponse = Invoke-SafeWebRequest -Uri "$TICKET_URL/api/v1/tickets" -Headers $invalidHeaders
    Print-Result ($invalidTokenResponse.StatusCode -eq 401) "Invalid Token Handling"
} catch {
    Print-Result $true "Invalid Token Handling"  # Exception expected
}

# Test Invalid Data
try {
    $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
    $invalidBody = @{ title = "Ti" } | ConvertTo-Json
    $invalidDataResponse = Invoke-SafeWebRequest -Uri "$TICKET_URL/api/v1/tickets" -Method "POST" -Headers $headers -Body $invalidBody
    Print-Result ($invalidDataResponse.StatusCode -eq 400) "Invalid Data Validation"
} catch {
    Print-Result $true "Invalid Data Validation"  # Exception expected
}

# Test Invalid UUID
try {
    $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
    $invalidUuidResponse = Invoke-SafeWebRequest -Uri "$TICKET_URL/api/v1/tickets/invalid-uuid" -Headers $headers
    Print-Result ($invalidUuidResponse.StatusCode -eq 400) "Invalid UUID Handling"
} catch {
    Print-Result $true "Invalid UUID Handling"  # Exception expected
}

Write-Host "`n6. Cleanup" -ForegroundColor Yellow
Write-Host "==========" -ForegroundColor Yellow

# Delete Test Ticket (if created)
if ($TICKET_ID) {
    try {
        $headers = @{ "Authorization" = "Bearer $ACCESS_TOKEN" }
        $deleteResponse = Invoke-SafeWebRequest -Uri "$TICKET_URL/api/v1/tickets/$TICKET_ID" -Method "DELETE" -Headers $headers
        Print-Result ($deleteResponse.StatusCode -eq 200) "Delete Test Ticket"
    } catch {
        Print-Result $false "Delete Test Ticket"
    }
}

Write-Host "`n🎉 Test Suite Completed!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host "Review the results above to ensure all services are working correctly." -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Import the test-collection.json file into Postman/Insomnia" -ForegroundColor White
Write-Host "2. Set up environment variables as described in TESTING_GUIDE.md" -ForegroundColor White
Write-Host "3. Run manual tests for more detailed validation" -ForegroundColor White
