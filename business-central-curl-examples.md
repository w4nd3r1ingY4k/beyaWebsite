# Business Central API - Curl Examples

## Configuration
```bash
TENANT_ID="67051142-4b70-4ae9-8992-01d17e991da9"
CLIENT_ID="29cda312-4374-4b29-aefd-406dd53060a3"
CLIENT_SECRET="YOUR_ACTUAL_SECRET_VALUE"  # Get this from Azure Portal
COMPANY_ID="2b5bb75b-b5d4-ef11-8eec-00224842ddca"
```

## Step 1: Get Access Token

### Method 1: Basic curl command
```bash
curl -X POST "https://login.microsoftonline.com/67051142-4b70-4ae9-8992-01d17e991da9/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=29cda312-4374-4b29-aefd-406dd53060a3&client_secret=YOUR_SECRET&scope=https://api.businesscentral.dynamics.com/.default"
```

### Method 2: Separate parameters (easier to debug)
```bash
curl -X POST "https://login.microsoftonline.com/67051142-4b70-4ae9-8992-01d17e991da9/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=29cda312-4374-4b29-aefd-406dd53060a3" \
  -d "client_secret=YOUR_SECRET" \
  -d "scope=https://api.businesscentral.dynamics.com/.default"
```

### Method 3: Using variables
```bash
TENANT_ID="67051142-4b70-4ae9-8992-01d17e991da9"
CLIENT_ID="29cda312-4374-4b29-aefd-406dd53060a3"
CLIENT_SECRET="YOUR_SECRET"

curl -X POST "https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "scope=https://api.businesscentral.dynamics.com/.default"
```

## Step 2: Extract Access Token

### Using jq (recommended)
```bash
ACCESS_TOKEN=$(curl -s -X POST "..." | jq -r '.access_token')
```

### Using grep/sed (if jq not available)
```bash
ACCESS_TOKEN=$(curl -s -X POST "..." | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
```

## Step 3: Call Business Central API

### Get Shopify Customers
```bash
curl -X GET "https://api.businesscentral.dynamics.com/v2.0/67051142-4b70-4ae9-8992-01d17e991da9/Production/api/safiyaaPublisher/safiyaGroup/v1.0/companies(2b5bb75b-b5d4-ef11-8eec-00224842ddca)/ShopifyCustomers" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json"
```

### Test API connection
```bash
curl -X GET "https://api.businesscentral.dynamics.com/v2.0/67051142-4b70-4ae9-8992-01d17e991da9/Production/api/v2.0/companies" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Accept: application/json"
```

## Troubleshooting

### Check token validity
```bash
# Decode JWT token to check expiration (requires base64 and jq)
echo $ACCESS_TOKEN | cut -d'.' -f2 | base64 -d | jq
```

### Test with verbose output
```bash
curl -v -X POST "https://login.microsoftonline.com/..." 
```

### Common issues:
1. **Invalid client secret** - Make sure you have the secret VALUE, not ID
2. **Expired secret** - Check expiration date in Azure Portal
3. **Wrong scope** - Use exactly: `https://api.businesscentral.dynamics.com/.default`
4. **Missing permissions** - Ensure app has Dynamics 365 Business Central permissions

## Next Steps

1. **Get the correct client secret from Azure Portal:**
   - Go to Azure Active Directory
   - App registrations → Your app
   - Certificates & secrets
   - Copy the "Value" (not "Secret ID")

2. **Test the token endpoint first:**
   ```bash
   curl -X POST "https://login.microsoftonline.com/67051142-4b70-4ae9-8992-01d17e991da9/oauth2/v2.0/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials" \
     -d "client_id=29cda312-4374-4b29-aefd-406dd53060a3" \
     -d "client_secret=CORRECT_SECRET_HERE" \
     -d "scope=https://api.businesscentral.dynamics.com/.default"
   ```

3. **Once you get a valid token, call the API:**
   ```bash
   curl -X GET "https://api.businesscentral.dynamics.com/v2.0/67051142-4b70-4ae9-8992-01d17e991da9/Production/api/safiyaaPublisher/safiyaGroup/v1.0/companies(2b5bb75b-b5d4-ef11-8eec-00224842ddca)/ShopifyCustomers" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Accept: application/json"
   ``` 