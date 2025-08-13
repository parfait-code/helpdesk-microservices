#!/bin/bash

# Script de test automatisé pour les microservices Helpdesk
# Usage: ./test-services.sh

echo "🚀 Testing Helpdesk Microservices"
echo "=================================="

# Configuration
AUTH_URL="http://localhost:3001"
USER_URL="http://localhost:3002"
TICKET_URL="http://localhost:3003"

# Variables globales
ACCESS_TOKEN=""
USER_ID=""
TICKET_ID=""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Fonction pour extraire JSON
extract_json() {
    echo "$1" | grep -o '"'$2'":"[^"]*"' | cut -d'"' -f4
}

echo -e "\n${YELLOW}1. Testing Health Checks${NC}"
echo "========================"

# Test Auth Service Health
response=$(curl -s -o /dev/null -w "%{http_code}" "$AUTH_URL/api/v1/health")
print_result $([[ "$response" == "200" ]] && echo 0 || echo 1) "Auth Service Health Check"

# Test User Service Health  
response=$(curl -s -o /dev/null -w "%{http_code}" "$USER_URL/api/v1/health")
print_result $([[ "$response" == "200" ]] && echo 0 || echo 1) "User Service Health Check"

# Test Ticket Service Health
response=$(curl -s -o /dev/null -w "%{http_code}" "$TICKET_URL/api/v1/health")
print_result $([[ "$response" == "200" ]] && echo 0 || echo 1) "Ticket Service Health Check"

echo -e "\n${YELLOW}2. Testing Authentication${NC}"
echo "========================="

# Register User
echo "Registering new user..."
register_response=$(curl -s -X POST "$AUTH_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "email": "test'$(date +%s)'@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "user"
  }')

if [[ $register_response == *"accessToken"* ]]; then
    ACCESS_TOKEN=$(echo "$register_response" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
    USER_ID=$(echo "$register_response" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
    print_result 0 "User Registration"
    echo "  User ID: $USER_ID"
else
    print_result 1 "User Registration"
    echo "  Error: $register_response"
    exit 1
fi

# Verify Token
verify_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$AUTH_URL/api/v1/auth/verify" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
print_result $([[ "$verify_response" == "200" ]] && echo 0 || echo 1) "Token Verification"

echo -e "\n${YELLOW}3. Testing User Service${NC}"
echo "======================="

# Get Profile
profile_response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$USER_URL/api/v1/users/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
print_result $([[ "$profile_response" == "200" ]] && echo 0 || echo 1) "Get User Profile"

# Update Profile
update_response=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$USER_URL/api/v1/users/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name", 
    "phone": "+1234567890"
  }')
print_result $([[ "$update_response" == "200" ]] && echo 0 || echo 1) "Update User Profile"

echo -e "\n${YELLOW}4. Testing Ticket Service${NC}"
echo "========================="

# Create Ticket
echo "Creating test ticket..."
ticket_response=$(curl -s -X POST "$TICKET_URL/api/v1/tickets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Bug Report - Automated Test",
    "description": "This is an automated test ticket created by the test script. It simulates a bug report with detailed reproduction steps.",
    "priority": "high",
    "category": "bug",
    "userId": "'$USER_ID'"
  }')

if [[ $ticket_response == *'"id":'* ]]; then
    TICKET_ID=$(echo "$ticket_response" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
    print_result 0 "Create Ticket"
    echo "  Ticket ID: $TICKET_ID"
else
    print_result 1 "Create Ticket"
    echo "  Error: $ticket_response"
fi

# Get All Tickets
tickets_response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$TICKET_URL/api/v1/tickets?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
print_result $([[ "$tickets_response" == "200" ]] && echo 0 || echo 1) "Get All Tickets"

# Get Ticket by ID
if [ ! -z "$TICKET_ID" ]; then
    ticket_detail_response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$TICKET_URL/api/v1/tickets/$TICKET_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN")
    print_result $([[ "$ticket_detail_response" == "200" ]] && echo 0 || echo 1) "Get Ticket by ID"
    
    # Update Ticket
    update_ticket_response=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$TICKET_URL/api/v1/tickets/$TICKET_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "status": "in_progress",
        "priority": "urgent",
        "description": "Updated description - Ticket now in progress"
      }')
    print_result $([[ "$update_ticket_response" == "200" ]] && echo 0 || echo 1) "Update Ticket"
fi

# Get User Tickets
user_tickets_response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$TICKET_URL/api/v1/tickets/user/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
print_result $([[ "$user_tickets_response" == "200" ]] && echo 0 || echo 1) "Get User Tickets"

# Get Ticket Stats
stats_response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$TICKET_URL/api/v1/tickets/stats" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
print_result $([[ "$stats_response" == "200" ]] && echo 0 || echo 1) "Get Ticket Statistics"

echo -e "\n${YELLOW}5. Testing Error Handling${NC}"
echo "========================="

# Test Invalid Token
invalid_token_response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$TICKET_URL/api/v1/tickets" \
  -H "Authorization: Bearer invalid_token")
print_result $([[ "$invalid_token_response" == "401" ]] && echo 0 || echo 1) "Invalid Token Handling"

# Test Invalid Data
invalid_data_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$TICKET_URL/api/v1/tickets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Ti"}')
print_result $([[ "$invalid_data_response" == "400" ]] && echo 0 || echo 1) "Invalid Data Validation"

# Test Invalid UUID
invalid_uuid_response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$TICKET_URL/api/v1/tickets/invalid-uuid" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
print_result $([[ "$invalid_uuid_response" == "400" ]] && echo 0 || echo 1) "Invalid UUID Handling"

echo -e "\n${YELLOW}6. Cleanup${NC}"
echo "=========="

# Delete Test Ticket (if created)
if [ ! -z "$TICKET_ID" ]; then
    delete_response=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$TICKET_URL/api/v1/tickets/$TICKET_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN")
    print_result $([[ "$delete_response" == "200" ]] && echo 0 || echo 1) "Delete Test Ticket"
fi

echo -e "\n${GREEN}🎉 Test Suite Completed!${NC}"
echo "========================"
echo "Review the results above to ensure all services are working correctly."
echo ""
echo "Next steps:"
echo "1. Import the test-collection.json file into Postman/Insomnia"  
echo "2. Set up environment variables as described in TESTING_GUIDE.md"
echo "3. Run manual tests for more detailed validation"
