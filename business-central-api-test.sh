#!/bin/bash

# Business Central API OAuth 2.0 Test Script
# Replace CLIENT_SECRET with the actual secret value

# Configuration
TENANT_ID="67051142-4b70-4ae9-8992-01d17e991da9"
CLIENT_ID="29cda312-4374-4b29-aefd-406dd53060a3"
CLIENT_SECRET="Uur8Q~pHGV6-x2ixqxww45dszxf2gY--5wSl~c.Q4"
SCOPE="https://api.businesscentral.dynamics.com/.default"
COMPANY_ID="2b5bb75b-b5d4-ef11-8eec-00224842ddca"

# URLs
TOKEN_URL="https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token"
API_URL="https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/Production/api/safiyaaPublisher/safiyaGroup/v1.0/companies(${COMPANY_ID})/ShopifyCustomers"

echo "Step 1: Getting access token..."

# Get access token
TOKEN_RESPONSE=$(curl -s -X POST "$TOKEN_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "scope=$SCOPE")

echo "Token response: $TOKEN_RESPONSE"

# Extract access token using jq (if available) or basic parsing
if command -v jq &> /dev/null; then
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
else
    # Basic parsing without jq
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    echo "❌ Failed to get access token. Response:"
    echo "$TOKEN_RESPONSE"
    exit 1
fi

echo "✅ Access token obtained successfully!"
echo "Token (first 50 chars): ${ACCESS_TOKEN:0:50}..."

echo ""
echo "Step 2: Calling Business Central API..."

# Call Business Central API
API_RESPONSE=$(curl -s -X GET "$API_URL" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json")

echo "API Response:"
echo "$API_RESPONSE"

# Pretty print if jq is available
if command -v jq &> /dev/null; then
    echo ""
    echo "Formatted response:"
    echo "$API_RESPONSE" | jq .
fi 