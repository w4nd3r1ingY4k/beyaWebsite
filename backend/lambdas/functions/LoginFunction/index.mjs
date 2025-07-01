
import AWS from 'aws-sdk';
import OpenIDClient from 'openid-client';
const { Issuer, generators } = OpenIDClient;

// Environment variables
const region        = process.env.AWS_REGION;
const userPoolId    = process.env.USER_POOL_ID;
const clientId      = process.env.CLIENT_ID;
const clientSecret  = process.env.CLIENT_SECRET;
const redirectUri   = process.env.REDIRECT_URI;
const stateTable    = process.env.STATE_TABLE_NAME;

AWS.config.update({ region });
const ddb = new AWS.DynamoDB.DocumentClient();

let oidcClient;
async function getOidcClient() {
  if (oidcClient) return oidcClient;

  // Discover the Cognito issuer
  const issuer = await Issuer.discover(
    `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
  );

  // Create the OIDC client
  oidcClient = new issuer.Client({
    client_id:      clientId,
    client_secret:  clientSecret,
    redirect_uris:  [redirectUri],
    response_types: ['code'],
  });
  return oidcClient;
}

export const handler = async (event) => {
  const client = await getOidcClient();

  // Generate state & nonce for CSRF protection
  const state = generators.state();
  const nonce = generators.nonce();

  // Persist state and nonce to DynamoDB with TTL
  await ddb.put({
    TableName: stateTable,
    Item: {
      state,
      nonce,
      expiresAt: Math.floor(Date.now() / 1000) + 300
    }
  }).promise();

  // Build the authorization URL
  const authUrl = client.authorizationUrl({
    scope: 'openid email profile',
    state,
    nonce,
  });

  // Redirect the user to Cognito
  return {
    statusCode: 302,
    headers: {
      Location: authUrl
    }
  };
};
