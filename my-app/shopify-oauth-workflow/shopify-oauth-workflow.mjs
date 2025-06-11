import { defineSource } from "@pipedream/types";

export default defineSource({
  name: "Shopify OAuth Workflow for Beya Integration",
  version: "0.1.0", 
  key: "shopify-oauth-workflow",
  description: "Complete Shopify OAuth flow triggered from Beya IntegrationsPanel",
  type: "source",
  dedupe: "unique",
  props: {
    http: "$.interface.http",
    // AWS credentials for token storage
    awsAccessKeyId: {
      type: "string",
      label: "AWS Access Key ID",
      description: "AWS credentials for storing tokens in Parameter Store"
    },
    awsSecretAccessKey: {
      type: "string", 
      label: "AWS Secret Access Key",
      secret: true
    },
    awsRegion: {
      type: "string",
      label: "AWS Region", 
      default: "us-east-1"
    },
    shopifyClientId: {
      type: "string",
      label: "Shopify Client ID",
      description: "Your Shopify app's client ID"
    },
    shopifyClientSecret: {
      type: "string",
      label: "Shopify Client Secret",
      secret: true,
      description: "Your Shopify app's client secret"
    },
    redirectUri: {
      type: "string",
      label: "Redirect URI",
      description: "Where to redirect after OAuth (your app URL)",
      default: "https://your-app.com/integrations/shopify/callback"
    }
  },
  methods: {
    generateState() {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    },
    
    async storeTokensInAWS(tokenData, shop) {
      const AWS = await import('aws-sdk');
      const ssm = new AWS.SSM({
        accessKeyId: this.awsAccessKeyId,
        secretAccessKey: this.awsSecretAccessKey,
        region: this.awsRegion
      });
      
      // Store tokens with shop identifier
      await ssm.putParameter({
        Name: `/beya/oauth/shopify/${shop}/tokens`,
        Value: JSON.stringify(tokenData),
        Type: 'SecureString',
        Overwrite: true,
        Description: `Shopify OAuth tokens for shop: ${shop}`
      }).promise();
      
      // Store shop-specific endpoint
      await ssm.putParameter({
        Name: `/beya/oauth/shopify/${shop}/endpoint`,
        Value: `https://${shop}.myshopify.com`,
        Type: 'String',
        Overwrite: true
      }).promise();
    }
  },
  async run(event) {
    const { body, query, method, headers } = event;
    
    // Handle initial OAuth request from IntegrationsPanel
    if (method === "GET" && query.action === "start") {
      const shop = query.shop;
      const userId = query.userId;
      
      if (!shop || !userId) {
        this.$respond({
          status: 400,
          body: { error: "Missing shop or userId parameter" }
        });
        return;
      }
      
      // Generate OAuth URL
      const state = this.generateState();
      const scopes = "read_orders,read_customers,read_products";
      
      const oauthUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?` +
        `client_id=${this.shopifyClientId}&` +
        `scope=${scopes}&` +
        `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
        `state=${state}&` +
        `response_type=code`;
      
      // Store state for verification
      await this.$checkpoint({
        state,
        shop,
        userId,
        timestamp: Date.now()
      });
      
      // Redirect to Shopify OAuth
      this.$respond({
        status: 302,
        headers: {
          "Location": oauthUrl
        }
      });
      
      return;
    }
    
    // Handle OAuth callback from Shopify
    if (method === "GET" && query.code) {
      const { code, state, shop: callbackShop } = query;
      
      // Retrieve stored state
      const checkpoint = await this.$checkpoint();
      
      if (!checkpoint || checkpoint.state !== state) {
        this.$respond({
          status: 400,
          body: { error: "Invalid state parameter" }
        });
        return;
      }
      
      const { shop, userId } = checkpoint;
      
      try {
        // Exchange code for access token
        const tokenResponse = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: this.shopifyClientId,
            client_secret: this.shopifyClientSecret,
            code
          })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.access_token) {
          // Store tokens in AWS Parameter Store
          await this.storeTokensInAWS({
            access_token: tokenData.access_token,
            scope: tokenData.scope,
            shop,
            userId,
            connected_at: new Date().toISOString()
          }, shop);
          
          // Emit success event
          this.$emit({
            success: true,
            shop,
            userId,
            scope: tokenData.scope,
            connected_at: new Date().toISOString()
          }, {
            id: `shopify-connected-${shop}-${userId}`,
            summary: `Shopify store ${shop} connected for user ${userId}`,
            ts: Date.now()
          });
          
          // Redirect back to your app with success
          this.$respond({
            status: 302,
            headers: {
              "Location": `${this.redirectUri}?success=true&shop=${shop}&integration=shopify`
            }
          });
          
        } else {
          throw new Error('No access token received');
        }
        
      } catch (error) {
        console.error('OAuth error:', error);
        
        // Redirect back to your app with error
        this.$respond({
          status: 302,
          headers: {
            "Location": `${this.redirectUri}?success=false&error=${encodeURIComponent(error.message)}&integration=shopify`
          }
        });
      }
      
      return;
    }
    
    // Default response for unsupported requests
    this.$respond({
      status: 400,
      body: { 
        error: "Unsupported request",
        usage: "GET /?action=start&shop=SHOP_NAME&userId=USER_ID to start OAuth"
      }
    });
  }
}); 