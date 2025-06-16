import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
const app = initializeApp({
  credential: process.env.FIREBASE_ADMIN_CREDENTIALS 
    ? JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS)
    : undefined,
  projectId: process.env.FIREBASE_PROJECT_ID
});

const db = getFirestore(app);
const auth = getAuth(app);

// Collection names
const COLLECTIONS = {
  USER_CREDENTIALS: 'userCredentials',
  WHATSAPP_VERIFICATIONS: 'whatsappVerifications'
};

/**
 * Store Gmail credentials for a user
 * @param {string} userId - User ID
 * @param {Object} credentials - Gmail credentials
 * @param {string} credentials.refresh_token - Gmail refresh token
 * @param {string} credentials.email - User's Gmail address
 */
export async function storeGmailCredentials(userId, credentials) {
  const docRef = db.collection(COLLECTIONS.USER_CREDENTIALS).doc(userId);
  
  // Use a transaction to ensure atomic updates
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    
    const data = doc.exists ? doc.data() : {};
    transaction.set(docRef, {
      ...data,
      gmail: {
        refreshToken: credentials.refresh_token,
        email: credentials.email,
        updatedAt: new Date().toISOString()
      }
    }, { merge: true });
  });
}

/**
 * Get Gmail credentials for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Gmail credentials or null
 */
export async function getGmailCredentials(userId) {
  const doc = await db.collection(COLLECTIONS.USER_CREDENTIALS)
    .doc(userId)
    .get();
  
  return doc.exists ? doc.data().gmail : null;
}

/**
 * Store WhatsApp verification data
 * @param {string} userId - User ID
 * @param {Object} verification - Verification data
 * @param {string} verification.phoneNumber - Phone number
 * @param {string} verification.code - Verification code
 * @param {number} verification.expiresAt - Expiration timestamp
 */
export async function storeWhatsAppVerification(userId, verification) {
  const docRef = db.collection(COLLECTIONS.WHATSAPP_VERIFICATIONS).doc(userId);
  
  await docRef.set({
    phoneNumber: verification.phoneNumber,
    code: verification.code,
    expiresAt: verification.expiresAt,
    createdAt: new Date().toISOString()
  });
}

/**
 * Get and validate WhatsApp verification data
 * @param {string} userId - User ID
 * @param {string} code - Verification code
 * @returns {Promise<Object|null>} Verification data or null
 */
export async function getWhatsAppVerification(userId, code) {
  const doc = await db.collection(COLLECTIONS.WHATSAPP_VERIFICATIONS)
    .doc(userId)
    .get();
  
  if (!doc.exists) return null;
  
  const data = doc.data();
  const now = Date.now();
  
  // Check if verification is expired
  if (data.expiresAt < now) {
    // Clean up expired verification
    await doc.ref.delete();
    return null;
  }
  
  // Check if code matches
  if (data.code !== code) return null;
  
  return data;
}

/**
 * Store verified WhatsApp number
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Verified phone number
 */
export async function storeWhatsAppNumber(userId, phoneNumber) {
  const docRef = db.collection(COLLECTIONS.USER_CREDENTIALS).doc(userId);
  
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    
    const data = doc.exists ? doc.data() : {};
    transaction.set(docRef, {
      ...data,
      whatsapp: {
        phoneNumber,
        verifiedAt: new Date().toISOString()
      }
    }, { merge: true });
  });
  
  // Clean up verification data
  await db.collection(COLLECTIONS.WHATSAPP_VERIFICATIONS)
    .doc(userId)
    .delete();
}

/**
 * Get verified WhatsApp number
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} WhatsApp data or null
 */
export async function getWhatsAppNumber(userId) {
  const doc = await db.collection(COLLECTIONS.USER_CREDENTIALS)
    .doc(userId)
    .get();
  
  return doc.exists ? doc.data().whatsapp : null;
}

/**
 * Delete user credentials
 * @param {string} userId - User ID
 * @param {string} type - 'gmail' or 'whatsapp'
 */
export async function deleteCredentials(userId, type) {
  const docRef = db.collection(COLLECTIONS.USER_CREDENTIALS).doc(userId);
  
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) return;
    
    const data = doc.data();
    const update = { ...data };
    delete update[type];
    
    transaction.set(docRef, update);
  });
}

// Export Firebase instances for other uses
export { db, auth }; 