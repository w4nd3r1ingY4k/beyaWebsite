// callback.js
const { Issuer } = require('openid-client');
const AWS = require('aws-sdk');

// Environment variables
const region       = process.env.AWS_REGION;
const userPoolId   = process.env.USER_POOL_ID;
const clientId     = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri  = process.env.REDIRECT_URI;
const stateTable   = process.env.STATE_TABLE_NAME;

AWS.config.update({ region });
const ddb = new AWS.DynamoDB.DocumentClient();

let oidcClient;
async function getOidcClient() {
  if (oidcClient) return oidcClient;
  const issuer = await Issuer.discover(
    `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
  );
  oidcClient = new issuer.Client({
    client_id:     clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
    response_types:['code'],
  });
  return oidcClient;
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const state  = params.state;
  const code   = params.code;

  // Retrieve & validate state/nonce from DynamoDB
  const record = await ddb.get({
    TableName: stateTable,
    Key: { state }
  }).promise();
  if (!record.Item) {
    return { statusCode: 400, body: 'Invalid or expired state' };
  }
  const { nonce } = record.Item;

  const client = await getOidcClient();
  let tokenSet;
  try {
    // Exchange code for tokens
    tokenSet = await client.callback(
      redirectUri,
      event.rawQueryString,
      { state, nonce }
    );
  } catch (err) {
    console.error('OIDC callback error:', err);
    return { statusCode: 302, headers: { Location: `${redirectUri}?error=auth_failed` } };
  }

  // Optionally fetch user info
  const userInfo = await client.userinfo(tokenSet.access_token);

  // TODO: issue your own session (cookie or JWT)
  // Example: set a cookie with the ID token
  const idToken = tokenSet.id_token;

  return {
    statusCode: 302,
    headers: {
      'Set-Cookie': `id_token=${idToken}; HttpOnly; Secure; Path=/;`,
      Location: '/app'
    }
  };
};