import { createBackendClient } from "@pipedream/sdk/server";
import fetch from 'node-fetch';
import { withRetry, RetryableErrors } from '../utils/retry.js';
import {
  storeWhatsAppVerification,
  getWhatsAppVerification,
  storeWhatsAppNumber,
  getWhatsAppNumber,
  deleteCredentials
} from '../utils/firebase.js';

// Custom error classes for better error handling
class WhatsAppConnectionError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'WhatsAppConnectionError';
        this.code = code;
        this.details = details;
    }
}

// Validate environment variables
function validateWhatsAppConfig() {
    const required = ['WABA_PHONE_NUMBER_ID', 'WABA_TOKEN'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new WhatsAppConnectionError(
            'Missing required WhatsApp configuration',
            'CONFIG_ERROR',
            { missing }
        );
    }
}

// Validate phone number format
function validatePhoneNumber(phoneNumber) {
    const normalized = phoneNumber.replace(/[^0-9]/g, '');
    if (normalized.length < 10) {
        throw new WhatsAppConnectionError(
            'Invalid phone number format',
            'INVALID_PHONE',
            { phoneNumber: normalized }
        );
    }
    return normalized;
}

// Verify WhatsApp Business API connection
async function verifyWhatsAppConnection(phoneNumberId) {
    try {
        const response = await withRetry(
            () => fetch(
                `https://graph.facebook.com/v17.0/${phoneNumberId}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.WABA_TOKEN}`
                    }
                }
            ),
            {
                shouldRetry: (error) =>
                    RetryableErrors.isNetworkError(error) ||
                    RetryableErrors.isServerError(error),
                maxAttempts: 3
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new WhatsAppConnectionError(
                'Failed to verify WhatsApp Business account',
                'VERIFICATION_ERROR',
                { apiError: error }
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof WhatsAppConnectionError) {
            throw error;
        }
        throw new WhatsAppConnectionError(
            'Failed to verify WhatsApp connection',
            'VERIFICATION_ERROR',
            { originalError: error.message }
        );
    }
}

export async function handleWhatsAppConnect(req, res) {
    const { userId, action, phoneNumber, code } = req.body;

    if (!userId) {
        return res.status(400).json({
            error: 'userId is required',
            code: 'MISSING_USER_ID'
        });
    }

    try {
        validateWhatsAppConfig();

        if (action === 'create_token') {
            try {
                if (!phoneNumber) {
                    throw new WhatsAppConnectionError(
                        'Phone number is required',
                        'MISSING_PHONE'
                    );
                }

                const normalizedNumber = validatePhoneNumber(phoneNumber);

                // Generate verification code with expiration
                const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

                // Store verification data in Firebase
                await storeWhatsAppVerification(userId, {
                    phoneNumber: normalizedNumber,
                    code: verificationCode,
                    expiresAt
                });

                // In production, send the code via WhatsApp Business API
                // For demo, we'll just return it
                return res.status(200).json({
                    message: 'Please enter the verification code sent to your WhatsApp',
                    phoneNumber: normalizedNumber,
                    verificationCode // For demo purposes only
                });
            } catch (error) {
                if (error instanceof WhatsAppConnectionError) {
                    throw error;
                }
                throw new WhatsAppConnectionError(
                    'Failed to initiate WhatsApp verification',
                    'VERIFICATION_INIT_ERROR',
                    { originalError: error.message }
                );
            }
        }
        else if (action === 'verify_code') {
            try {
                if (!code) {
                    throw new WhatsAppConnectionError(
                        'Verification code is required',
                        'MISSING_CODE'
                    );
                }

                // Get and validate verification data from Firebase
                const verification = await getWhatsAppVerification(userId, code);
                
                if (!verification) {
                    throw new WhatsAppConnectionError(
                        'Invalid or expired verification code',
                        'INVALID_CODE'
                    );
                }

                // Verify the WhatsApp Business API connection
                await verifyWhatsAppConnection(process.env.WABA_PHONE_NUMBER_ID);

                // Store verified number in Firebase
                await storeWhatsAppNumber(userId, verification.phoneNumber);

                return res.status(200).json({
                    success: true,
                    message: 'WhatsApp account verified successfully',
                    phoneNumber: verification.phoneNumber
                });
            } catch (error) {
                if (error instanceof WhatsAppConnectionError) {
                    throw error;
                }
                throw new WhatsAppConnectionError(
                    'Failed to verify WhatsApp code',
                    'VERIFICATION_ERROR',
                    { originalError: error.message }
                );
            }
        }
        else if (action === 'get_accounts') {
            try {
                // Get verified number from Firebase
                const whatsappData = await getWhatsAppNumber(userId);
                
                if (!whatsappData) {
                    return res.status(200).json({
                        success: true,
                        accounts: []
                    });
                }

                // Verify the number is still valid with WhatsApp Business API
                await verifyWhatsAppConnection(process.env.WABA_PHONE_NUMBER_ID);

                return res.status(200).json({
                    success: true,
                    accounts: [{
                        phoneNumber: whatsappData.phoneNumber,
                        connected: true,
                        verifiedAt: whatsappData.verifiedAt
                    }]
                });
            } catch (error) {
                console.error('Failed to get WhatsApp account info:', error);
                
                // If verification fails, delete the stored number
                if (error.code === 'VERIFICATION_ERROR') {
                    await deleteCredentials(userId, 'whatsapp');
                }

                throw error;
            }
        }
        else if (action === 'disconnect') {
            try {
                await deleteCredentials(userId, 'whatsapp');
                return res.status(200).json({
                    success: true,
                    message: 'WhatsApp account disconnected successfully'
                });
            } catch (error) {
                throw new WhatsAppConnectionError(
                    'Failed to disconnect WhatsApp account',
                    'DISCONNECT_ERROR',
                    { originalError: error.message }
                );
            }
        }
        else {
            throw new WhatsAppConnectionError(
                'Invalid action',
                'INVALID_ACTION',
                { action }
            );
        }
    } catch (error) {
        console.error('WhatsApp Connect API error:', error);
        
        if (error instanceof WhatsAppConnectionError) {
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