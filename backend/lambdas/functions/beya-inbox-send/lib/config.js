// lib/config.js
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export const region = process.env.AWS_REGION;

export async function loadGmailCreds() {
  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  ) {
    return {
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    };
  }

  const sm = new SecretsManagerClient({ region });
  const resp = await sm.send(
    new GetSecretValueCommand({
      SecretId: process.env.GMAIL_SECRET_ID,
    })
  );
  if (!resp.SecretString) throw new Error('Empty Gmail secret');
  const parsed = JSON.parse(resp.SecretString);
  if (
    !parsed.client_id ||
    !parsed.client_secret ||
    !parsed.refresh_token
  ) {
    throw new Error('Invalid Gmail OAuth2 secret structure');
  }
  return parsed;
}