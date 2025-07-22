import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Business Central credentials - these can be overridden via environment variables
const BC_CREDENTIALS = {
  tenantId: process.env.BC_TENANT_ID || '67051142-4b70-4ae9-8992-01d17e991da9',
  clientId: process.env.BC_CLIENT_ID || '29cda312-4374-4b29-aefd-406dd53060a3',
  clientSecret: process.env.BC_CLIENT_SECRET || 'Uur8Q~pHGV6-x2ixqxww45dszxf2gY--5wSl~c.Q',
  companyId: process.env.BC_COMPANY_ID || '2b5bb75b-b5d4-ef11-8eec-00224842ddca'
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    service: "beya-business-central-sandbox",
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Get Business Central access token
async function getBCAccessToken() {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${BC_CREDENTIALS.tenantId}/oauth2/v2.0/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: BC_CREDENTIALS.clientId,
        client_secret: BC_CREDENTIALS.clientSecret,
        scope: 'https://api.businesscentral.dynamics.com/.default'
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const tokenData = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error("Failed to get BC access token:", error);
    throw error;
  }
}

// Business Central Token endpoint
app.post("/api/business-central/token", async (req, res) => {
  try {
    const accessToken = await getBCAccessToken();
    res.json({ access_token: accessToken });
  } catch (error) {
    console.error("Business Central token error:", error);
    res.status(500).json({ 
      error: "Failed to get Business Central token",
      details: error.message
    });
  }
});

// Business Central Companies endpoint
app.get("/api/business-central/companies", async (req, res) => {
  try {
    const accessToken = await getBCAccessToken();
    const companiesUrl = `https://api.businesscentral.dynamics.com/v2.0/${BC_CREDENTIALS.tenantId}/Production/api/v2.0/companies`;
    
    const response = await fetch(companiesUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Business Central API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Return formatted company data
    const companies = data.value?.map(company => ({
      id: company.id,
      name: company.name,
      displayName: company.displayName
    })) || [];

    res.json({ companies });

  } catch (error) {
    console.error("Business Central companies error:", error);
    res.status(500).json({ 
      error: "Failed to fetch Business Central companies",
      details: error.message
    });
  }
});

// Business Central Chart of Accounts endpoint
app.get("/api/business-central/accounts", async (req, res) => {
  try {
    const accessToken = await getBCAccessToken();
    const companyId = req.query.companyId || BC_CREDENTIALS.companyId;
    const accountsUrl = `https://api.businesscentral.dynamics.com/v2.0/${BC_CREDENTIALS.tenantId}/Production/api/v2.0/companies(${companyId})/accounts`;
    
    console.log("📊 Fetching Chart of Accounts...");
    
    const response = await fetch(accountsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Business Central API failed: ${response.status}`);
    }

    const data = await response.json();
    const allAccounts = data.value || [];
    
    console.log(`📋 Found ${allAccounts.length} accounts in Chart of Accounts`);
    
    // Categorize accounts by type for better understanding
    const accountsByCategory = {};
    const accountsByNumber = {};
    
    allAccounts.forEach(account => {
      const category = account.category || account.accountCategory || 'Uncategorized';
      const accountNumber = account.number || account.accountNumber || 'No Number';
      const balance = account.balance || account.currentBalance || 0;
      
      // Group by category
      if (!accountsByCategory[category]) {
        accountsByCategory[category] = [];
      }
      accountsByCategory[category].push(account);
      
      // Group by number range for analysis
      const numberRange = getAccountNumberRange(accountNumber);
      if (!accountsByNumber[numberRange]) {
        accountsByNumber[numberRange] = [];
      }
      accountsByNumber[numberRange].push(account);
    });
    
    // Format accounts with enhanced information
    const formattedAccounts = allAccounts.map(account => ({
      number: account.number || account.accountNumber,
      name: account.name || account.displayName,
      category: account.category || account.accountCategory,
      subCategory: account.subCategory || account.accountSubCategory,
      accountType: account.accountType,
      balance: account.balance || account.currentBalance || 0,
      blocked: account.blocked || false,
      directPosting: account.directPosting,
      lastModifiedDateTime: account.lastModifiedDateTime,
      // Add business context
      numberRange: getAccountNumberRange(account.number || account.accountNumber),
      isRevenueAccount: isRevenueAccount(account),
      isExpenseAccount: isExpenseAccount(account),
      isAssetAccount: isAssetAccount(account),
      isLiabilityAccount: isLiabilityAccount(account)
    }));

    // Create summary statistics
    const summary = {
      totalAccounts: allAccounts.length,
      accountsByCategory: Object.keys(accountsByCategory).map(category => ({
        category,
        count: accountsByCategory[category].length,
        totalBalance: accountsByCategory[category].reduce((sum, acc) => 
          sum + Math.abs(acc.balance || acc.currentBalance || 0), 0
        )
      })),
      accountsByNumberRange: Object.keys(accountsByNumber).map(range => ({
        range,
        count: accountsByNumber[range].length,
        description: getAccountRangeDescription(range)
      })),
      revenueAccounts: formattedAccounts.filter(acc => acc.isRevenueAccount).length,
      expenseAccounts: formattedAccounts.filter(acc => acc.isExpenseAccount).length,
      assetAccounts: formattedAccounts.filter(acc => acc.isAssetAccount).length,
      liabilityAccounts: formattedAccounts.filter(acc => acc.isLiabilityAccount).length
    };

    console.log("📈 Chart of Accounts Summary:", summary);

    res.json({ 
      accounts: formattedAccounts,
      summary: summary,
      explanation: {
        whatIsThis: "Chart of Accounts - The complete list of all financial accounts used to organize business transactions",
        accountTypes: {
          "1000-1999": "Assets (Cash, Inventory, Equipment, etc.)",
          "2000-2999": "Liabilities (Loans, Accounts Payable, etc.)",
          "3000-3999": "Equity (Owner's Capital, Retained Earnings, etc.)",
          "4000-4999": "Revenue/Income (Sales, Service Revenue, etc.)",
          "5000-5999": "Cost of Goods Sold",
          "6000-6999": "Operating Expenses (Rent, Utilities, Salaries, etc.)",
          "7000-7999": "Other Income/Expenses",
          "8000-8999": "Non-Operating Items",
          "9000-9999": "Statistical/Memo Accounts"
        },
        keyFields: {
          "number": "Account number (used for sorting and identification)",
          "name": "Account description/title",
          "category": "High-level grouping (Assets, Liabilities, Income, etc.)",
          "balance": "Current account balance",
          "directPosting": "Whether transactions can be posted directly to this account"
        }
      }
    });

  } catch (error) {
    console.error("❌ Business Central accounts error:", error);
    res.status(500).json({ 
      error: "Failed to fetch Business Central accounts",
      details: error.message
    });
  }
});

// Helper functions for account analysis
function getAccountNumberRange(accountNumber) {
  if (!accountNumber) return 'Unknown';
  const num = accountNumber.toString();
  const firstDigit = num.charAt(0);
  return `${firstDigit}000-${firstDigit}999`;
}

function getAccountRangeDescription(range) {
  const descriptions = {
    '1000-1999': 'Assets',
    '2000-2999': 'Liabilities', 
    '3000-3999': 'Equity',
    '4000-4999': 'Revenue/Income',
    '5000-5999': 'Cost of Goods Sold',
    '6000-6999': 'Operating Expenses',
    '7000-7999': 'Other Income/Expenses',
    '8000-8999': 'Non-Operating',
    '9000-9999': 'Statistical/Memo'
  };
  return descriptions[range] || 'Other';
}

function isRevenueAccount(account) {
  const accountNumber = account.number || account.accountNumber || '';
  const category = (account.category || account.accountCategory || '').toLowerCase();
  const subCategory = (account.subCategory || account.accountSubCategory || '').toLowerCase();
  const accountType = (account.accountType || '').toLowerCase();
  const displayName = (account.displayName || account.name || '').toLowerCase();
  
  return (
    category.includes('revenue') ||
    category.includes('income') ||
    subCategory.includes('revenue') ||
    subCategory.includes('income') ||
    accountType.includes('revenue') ||
    accountType.includes('income') ||
    displayName.includes('revenue') ||
    displayName.includes('sales') ||
    accountNumber.match(/^[4]\d{3}/)
  );
}

function isExpenseAccount(account) {
  const accountNumber = account.number || account.accountNumber || '';
  const category = (account.category || account.accountCategory || '').toLowerCase();
  
  return (
    category.includes('expense') ||
    category.includes('cost') ||
    accountNumber.match(/^[56]\d{3}/)
  );
}

function isAssetAccount(account) {
  const accountNumber = account.number || account.accountNumber || '';
  const category = (account.category || account.accountCategory || '').toLowerCase();
  
  return (
    category.includes('asset') ||
    accountNumber.match(/^[1]\d{3}/)
  );
}

function isLiabilityAccount(account) {
  const accountNumber = account.number || account.accountNumber || '';
  const category = (account.category || account.accountCategory || '').toLowerCase();
  
  return (
    category.includes('liability') ||
    category.includes('payable') ||
    accountNumber.match(/^[2]\d{3}/)
  );
}

// Business Central Customers endpoint
app.get("/api/business-central/customers", async (req, res) => {
  try {
    const accessToken = await getBCAccessToken();
    const companyId = req.query.companyId || BC_CREDENTIALS.companyId;
    const customersUrl = `https://api.businesscentral.dynamics.com/v2.0/${BC_CREDENTIALS.tenantId}/Production/api/v2.0/companies(${companyId})/customers`;
    
    const response = await fetch(customersUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Business Central API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Return formatted customers data
    const customers = data.value?.map(customer => ({
      name: customer.name,
      balance: customer.balance,
      currencyCode: customer.currencyCode
    })) || [];

    res.json({ customers });

  } catch (error) {
    console.error("Business Central customers error:", error);
    res.status(500).json({ 
      error: "Failed to fetch Business Central customers",
      details: error.message
    });
  }
});

// Business Central Vendors endpoint
app.get("/api/business-central/vendors", async (req, res) => {
  try {
    const accessToken = await getBCAccessToken();
    const companyId = req.query.companyId || BC_CREDENTIALS.companyId;
    const vendorsUrl = `https://api.businesscentral.dynamics.com/v2.0/${BC_CREDENTIALS.tenantId}/Production/api/v2.0/companies(${companyId})/vendors`;
    
    const response = await fetch(vendorsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Business Central API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Return formatted vendors data
    const vendors = data.value?.map(vendor => ({
      name: vendor.name,
      balance: vendor.balance,
      currencyCode: vendor.currencyCode
    })) || [];

    res.json({ vendors });

  } catch (error) {
    console.error("Business Central vendors error:", error);
    res.status(500).json({ 
      error: "Failed to fetch Business Central vendors",
      details: error.message
    });
  }
});

// Business Central General Ledger Entries endpoint
app.get("/api/business-central/ledger-entries", async (req, res) => {
  try {
    const accessToken = await getBCAccessToken();
    const companyId = req.query.companyId || BC_CREDENTIALS.companyId;
    const ledgerUrl = `https://api.businesscentral.dynamics.com/v2.0/${BC_CREDENTIALS.tenantId}/Production/api/v2.0/companies(${companyId})/generalLedgerEntries`;
    
    const response = await fetch(ledgerUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Business Central API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Return formatted ledger entries
    const entries = data.value?.map(entry => ({
      postingDate: entry.postingDate,
      documentNumber: entry.documentNumber,
      accountId: entry.accountId,
      description: entry.description,
      amount: entry.amount
    })) || [];

    res.json({ entries });

  } catch (error) {
    console.error("Business Central ledger entries error:", error);
    res.status(500).json({ 
      error: "Failed to fetch Business Central ledger entries",
      details: error.message
    });
  }
});

// Business Central Revenue endpoint (using real G/L entries approach)
app.get("/api/business-central/revenue", async (req, res) => {
  try {
    const accessToken = await getBCAccessToken();
    const companyId = req.query.companyId || BC_CREDENTIALS.companyId;
    
    const authHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    };

    console.log("📊 Fetching revenue data using G/L entries approach...");

    // Step 1: Get General Ledger Entries to calculate revenue
    const ledgerUrl = `https://api.businesscentral.dynamics.com/v2.0/${BC_CREDENTIALS.tenantId}/Production/api/v2.0/companies(${companyId})/generalLedgerEntries`;
    console.log(`🔗 Fetching G/L entries from: ${ledgerUrl}`);
    
    const ledgerResponse = await fetch(ledgerUrl, { headers: authHeaders });
    
    if (!ledgerResponse.ok) {
      const errorText = await ledgerResponse.text();
      console.log(`❌ G/L entries API failed:`, { status: ledgerResponse.status, error: errorText });
      throw new Error(`Failed to fetch G/L entries: ${ledgerResponse.status} - ${errorText}`);
    }
    
    const ledgerData = await ledgerResponse.json();
    const allEntries = ledgerData.value || [];
    
    console.log(`📋 Found ${allEntries.length} G/L entries`);
    if (allEntries.length > 0) {
      console.log("🔍 Sample G/L entry structure:", JSON.stringify(allEntries.slice(0, 1), null, 2));
    } else {
      console.log("⚠️ No G/L entries found. This could mean:");
      console.log("   - No transactions have been posted");
      console.log("   - The API endpoint might be different");
      console.log("   - There might be date filters needed");
      
      // Try alternative endpoints
      console.log("🔄 Trying alternative: getting trial balance...");
      try {
        const trialBalanceUrl = `https://api.businesscentral.dynamics.com/v2.0/${BC_CREDENTIALS.tenantId}/Production/api/v2.0/companies(${companyId})/trialBalance`;
        const trialResponse = await fetch(trialBalanceUrl, { headers: authHeaders });
        if (trialResponse.ok) {
          const trialData = await trialResponse.json();
          console.log(`📊 Trial balance has ${(trialData.value || []).length} entries`);
          if (trialData.value && trialData.value.length > 0) {
            console.log("🔍 Sample trial balance entry:", JSON.stringify(trialData.value.slice(0, 1), null, 2));
          }
        }
      } catch (trialError) {
        console.log("⚠️ Trial balance also not available");
      }
    }

    // Step 2: Get Chart of Accounts to identify revenue accounts
    const accountsUrl = `https://api.businesscentral.dynamics.com/v2.0/${BC_CREDENTIALS.tenantId}/Production/api/v2.0/companies(${companyId})/accounts`;
    const accountsResponse = await fetch(accountsUrl, { headers: authHeaders });
    
    if (!accountsResponse.ok) {
      throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
    }
    
    const accountsData = await accountsResponse.json();
    const allAccounts = accountsData.value || [];
    
    console.log(`📊 Found ${allAccounts.length} accounts`);

    // Debug: Log first few accounts to see structure
    console.log("🔍 Sample account structure:", JSON.stringify(allAccounts.slice(0, 2), null, 2));

    // Step 3: Identify revenue accounts (typically category "Revenue" or numbers 4000-4999)
    const revenueAccounts = allAccounts.filter(account => {
      const accountNumber = account.number || account.accountNumber || '';
      const category = (account.category || account.accountCategory || '').toLowerCase();
      const subCategory = (account.subCategory || account.accountSubCategory || '').toLowerCase();
      const accountType = (account.accountType || '').toLowerCase();
      const displayName = account.displayName || account.name || '';
      
      // Look for revenue indicators
      return (
        category.includes('revenue') ||
        category.includes('income') ||
        subCategory.includes('revenue') ||
        subCategory.includes('income') ||
        accountType.includes('revenue') ||
        accountType.includes('income') ||
        displayName.toLowerCase().includes('revenue') ||
        displayName.toLowerCase().includes('sales') ||
        (accountNumber.match(/^[4]\d{3}/) && !category.includes('expense')) // 4000-4999 range, not expenses
      );
    });

    console.log(`💰 Identified ${revenueAccounts.length} revenue accounts:`, 
      revenueAccounts.map(a => `${a.number || a.accountNumber} - ${a.displayName || a.name || 'No Name'}`));

    // Step 4: Calculate total revenue from G/L entries for revenue accounts
    const revenueAccountNumbers = revenueAccounts.map(acc => acc.number || acc.accountNumber);
    const revenueEntries = allEntries.filter(entry => 
      revenueAccountNumbers.includes(entry.accountId || entry.accountNumber || entry.glAccountNumber)
    );

    console.log(`📈 Found ${revenueEntries.length} revenue entries`);

    let totalRevenue = 0;
    let calculationMethod = "G/L Entries Analysis";

    if (revenueEntries.length > 0) {
      // Calculate total revenue (sum of amounts for revenue accounts)
      totalRevenue = revenueEntries.reduce((total, entry) => {
        const amount = entry.amount || entry.debitAmount || entry.creditAmount || 0;
        // Revenue accounts typically have credit balances, so we might need to handle sign
        return total + Math.abs(amount);
      }, 0);
    } else {
      // Fallback: Use account balances if no G/L entries found
      console.log("🔄 Fallback: Using account balances since no G/L entries found");
      calculationMethod = "Account Balances (Fallback)";
      
      totalRevenue = revenueAccounts.reduce((total, account) => {
        const balance = account.balance || account.currentBalance || 0;
        // Revenue accounts typically have credit balances, so take absolute value
        return total + Math.abs(balance);
      }, 0);
      
      console.log(`💰 Revenue from account balances: $${totalRevenue.toLocaleString()}`);
      console.log("🔍 Revenue account balances:", revenueAccounts.map(acc => 
        `${acc.number || acc.accountNumber} - ${acc.displayName || acc.name}: $${Math.abs(acc.balance || 0).toLocaleString()}`
      ));
    }

    // Step 5: Get recent revenue entries for analysis
    const recentRevenueEntries = revenueEntries
      .sort((a, b) => new Date(b.postingDate || 0).getTime() - new Date(a.postingDate || 0).getTime())
      .slice(0, 10)
      .map(entry => ({
        postingDate: entry.postingDate,
        documentNumber: entry.documentNumber,
        accountId: entry.accountId || entry.accountNumber,
        description: entry.description,
        amount: entry.amount || entry.debitAmount || entry.creditAmount || 0,
        accountName: revenueAccounts.find(acc => acc.number === entry.accountId)?.name || 'Unknown Account'
      }));

    // Step 6: Get revenue account summary
    const revenueAccountSummary = revenueAccounts.map(account => {
      const accountEntries = revenueEntries.filter(entry => 
        entry.accountId === account.number || entry.accountNumber === account.number
      );
      const accountTotal = accountEntries.reduce((sum, entry) => 
        sum + Math.abs(entry.amount || entry.debitAmount || entry.creditAmount || 0), 0
      );
      
      return {
        number: account.number,
        name: account.name,
        category: account.category,
        totalRevenue: accountTotal,
        entryCount: accountEntries.length,
        balance: account.balance || 0
      };
    }).filter(acc => acc.totalRevenue > 0 || acc.balance !== 0);

    // Step 7: Try to get sales invoices for additional context
    let salesInvoices = [];
    let salesOrders = [];
    
    try {
      const [invoicesRes, ordersRes] = await Promise.all([
        fetch(`https://api.businesscentral.dynamics.com/v2.0/${BC_CREDENTIALS.tenantId}/Production/api/v2.0/companies(${companyId})/salesInvoices`, { headers: authHeaders }),
        fetch(`https://api.businesscentral.dynamics.com/v2.0/${BC_CREDENTIALS.tenantId}/Production/api/v2.0/companies(${companyId})/salesOrders`, { headers: authHeaders })
      ]);

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        salesInvoices = invoicesData.value || [];
      }
      
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        salesOrders = ordersData.value || [];
      }
    } catch (salesError) {
      console.log("⚠️ Could not fetch sales data:", salesError.message);
    }

    const revenueMetrics = {
      totalRevenue: totalRevenue,
      calculationMethod: calculationMethod,
      revenueAccountsFound: revenueAccounts.length,
      revenueEntriesFound: revenueEntries.length,
      
      // Sales context
      totalSalesInvoices: salesInvoices.length,
      totalSalesOrders: salesOrders.length,
      
      // Detailed breakdown
      revenueAccountSummary: revenueAccountSummary,
      recentRevenueEntries: recentRevenueEntries,
      
      // Additional metrics
      pendingRevenue: salesOrders.reduce((total, order) => 
        total + (order.totalAmountIncludingTax || order.totalAmountExcludingTax || 0), 0
      ),
      
      recentInvoices: salesInvoices.slice(0, 5).map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        customerName: invoice.customerName || 'Unknown',
        amount: invoice.totalAmountIncludingTax || invoice.totalAmountExcludingTax || 0,
        currency: invoice.currencyCode || 'USD',
        date: invoice.invoiceDate || invoice.orderDate,
        status: invoice.status || 'Completed'
      }))
    };

    console.log(`✅ Revenue calculation complete: $${totalRevenue.toLocaleString()}`);
    res.json(revenueMetrics);

  } catch (error) {
    console.error("❌ Business Central revenue error:", error);
    res.status(500).json({ 
      error: "Failed to fetch Business Central revenue data",
      details: error.message
    });
  }
});

// Test endpoint to check all Business Central APIs at once
app.get("/api/business-central/test-all", async (req, res) => {
  try {
    console.log("🧪 Testing all Business Central endpoints...");
    
    const results = {};
    const endpoints = [
      { name: 'companies', url: `http://localhost:${PORT}/api/business-central/companies` },
      { name: 'accounts', url: `http://localhost:${PORT}/api/business-central/accounts` },
      { name: 'customers', url: `http://localhost:${PORT}/api/business-central/customers` },
      { name: 'vendors', url: `http://localhost:${PORT}/api/business-central/vendors` },
      { name: 'ledgerEntries', url: `http://localhost:${PORT}/api/business-central/ledger-entries` },
      { name: 'revenue', url: `http://localhost:${PORT}/api/business-central/revenue` }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint.name}...`);
        const response = await fetch(endpoint.url);
        const data = await response.json();
        results[endpoint.name] = {
          status: response.ok ? 'success' : 'error',
          dataCount: Array.isArray(data[endpoint.name]) ? data[endpoint.name].length : 'N/A',
          data: response.ok ? data : { error: data.error }
        };
      } catch (error) {
        results[endpoint.name] = {
          status: 'error',
          error: error.message
        };
      }
    }

    res.json({
      testResults: results,
      summary: {
        total: endpoints.length,
        successful: Object.values(results).filter(r => r.status === 'success').length,
        failed: Object.values(results).filter(r => r.status === 'error').length
      }
    });

  } catch (error) {
    console.error("Test all endpoints error:", error);
    res.status(500).json({ 
      error: "Failed to test Business Central endpoints",
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🏪 Beya Business Central Sandbox running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test all endpoints: http://localhost:${PORT}/api/business-central/test-all`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Business Central Company: ${BC_CREDENTIALS.companyId}`);
});

export default app; 