import { google } from 'googleapis';
import { createBackendClient } from "@pipedream/sdk/server";
import { withRetry, RetryableErrors } from '../utils/retry.js';
import { 
  storeGmailCredentials, 
  getGmailCredentials,
  deleteCredentials 
} from '../utils/firebase.js';

// Custom error classes for better error handling
class GmailConnectionError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'GmailConnectionError';
    this.code = code;
    this.details = details;
  }
}

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:2074/gmail/oauth2callback'
);

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
];

// Validate environment variables
function validateGmailConfig() {
    const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new GmailConnectionError(
            'Missing required Gmail configuration',
            'CONFIG_ERROR',
            { missing }
        );
    }
}

// Validate OAuth tokens
async function validateTokens(tokens) {
    if (!tokens.refresh_token) {
        throw new GmailConnectionError(
            'No refresh token received from Google',
            'AUTH_ERROR',
            { tokens: { ...tokens, refresh_token: '[REDACTED]' } }
        );
    }

    try {
        oauth2Client.setCredentials(tokens);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        await gmail.users.getProfile({ userId: 'me' });
    } catch (error) {
        throw new GmailConnectionError(
            'Failed to validate Gmail tokens',
            'VALIDATION_ERROR',
            { originalError: error.message }
        );
    }
}

export async function handleGmailConnect(req, res) {
    const { userId, action } = req.body;

    if (!userId) {
        return res.status(400).json({ 
            error: 'userId is required',
            code: 'MISSING_USER_ID'
        });
    }

    try {
        validateGmailConfig();

        if (action === 'create_token') {
            try {
                const authUrl = await withRetry(
                    () => oauth2Client.generateAuthUrl({
                        access_type: 'offline',
                        scope: SCOPES,
                        prompt: 'consent',
                        state: userId
                    }),
                    {
                        shouldRetry: RetryableErrors.isNetworkError,
                        maxAttempts: 2
                    }
                );

                return res.status(200).json({ 
                    authUrl,
                    message: 'Please visit the URL to authorize Gmail access'
                });
            } catch (error) {
                console.error('Failed to generate Gmail auth URL:', error);
                throw new GmailConnectionError(
                    'Failed to generate authorization URL',
                    'AUTH_URL_ERROR',
                    { originalError: error.message }
                );
            }
        } 
        else if (action === 'oauth2callback') {
            const { code, state: callbackUserId } = req.query;
            
            if (!code) {
                throw new GmailConnectionError(
                    'Authorization code is required',
                    'MISSING_CODE'
                );
            }

            if (callbackUserId !== userId) {
                throw new GmailConnectionError(
                    'User ID mismatch in OAuth callback',
                    'USER_MISMATCH',
                    { expected: userId, received: callbackUserId }
                );
            }

            try {
                const { tokens } = await withRetry(
                    () => oauth2Client.getToken(code),
                    {
                        shouldRetry: (error) => 
                            RetryableErrors.isNetworkError(error) || 
                            RetryableErrors.isServerError(error),
                        maxAttempts: 3
                    }
                );

                await validateTokens(tokens);

                // Get user's email address
                oauth2Client.setCredentials(tokens);
                const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
                const profile = await gmail.users.getProfile({ userId: 'me' });

                // Store credentials in Firebase
                await storeGmailCredentials(userId, {
                    refresh_token: tokens.refresh_token,
                    email: profile.data.emailAddress
                });

                return res.status(200).json({ 
                    success: true,
                    message: 'Gmail account connected successfully',
                    email: profile.data.emailAddress
                });
            } catch (error) {
                console.error('Failed to exchange Gmail auth code:', error);
                throw new GmailConnectionError(
                    'Failed to complete Gmail authorization',
                    'TOKEN_EXCHANGE_ERROR',
                    { originalError: error.message }
                );
            }
        }
        else if (action === 'get_accounts') {
            try {
                // Get credentials from Firebase
                const credentials = await getGmailCredentials(userId);
                
                if (!credentials) {
                    return res.status(200).json({ 
                        success: true, 
                        accounts: [] 
                    });
                }

                // Verify the credentials are still valid
                oauth2Client.setCredentials({
                    refresh_token: credentials.refreshToken
                });

                const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
                const profile = await withRetry(
                    () => gmail.users.getProfile({ userId: 'me' }),
                    {
                        shouldRetry: (error) => 
                            RetryableErrors.isNetworkError(error) || 
                            RetryableErrors.isTokenError(error) ||
                            RetryableErrors.isServerError(error),
                        maxAttempts: 3
                    }
                );

                return res.status(200).json({
                    success: true,
                    accounts: [{
                        email: profile.data.emailAddress,
                        connected: true
                    }]
                });
            } catch (error) {
                console.error('Failed to get Gmail account info:', error);
                
                // If token is invalid, delete it from Firebase
                if (RetryableErrors.isTokenError(error)) {
                    await deleteCredentials(userId, 'gmail');
                }

                throw new GmailConnectionError(
                    'Failed to get Gmail account information',
                    'ACCOUNT_INFO_ERROR',
                    { originalError: error.message }
                );
            }
        }
        else if (action === 'disconnect') {
            try {
                await deleteCredentials(userId, 'gmail');
                return res.status(200).json({
                    success: true,
                    message: 'Gmail account disconnected successfully'
                });
            } catch (error) {
                throw new GmailConnectionError(
                    'Failed to disconnect Gmail account',
                    'DISCONNECT_ERROR',
                    { originalError: error.message }
                );
            }
        }
        else {
            throw new GmailConnectionError(
                'Invalid action',
                'INVALID_ACTION',
                { action }
            );
        }
    } catch (error) {
        console.error('Gmail Connect API error:', error);
        
        if (error instanceof GmailConnectionError) {
            return res.status(error.code === 'CONFIG_ERROR' ? 500 : 400).json({ 
                error: error.message,
                code: error.code,
                details: error.details
            });
        }

        return res.status(500).json({ 
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
            message: error.message
        });
    }
} 