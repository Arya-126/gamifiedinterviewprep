import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize Firebase Admin SDK
let serviceAccountKey: any;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    // Try parsing as JSON string (handles both single-line and multi-line)
    serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from environment');
    process.exit(1);
  }
} else if (fs.existsSync(path.join(__dirname, '../serviceAccountKey.json'))) {
  // Fallback to local service account key file
  serviceAccountKey = require('../serviceAccountKey.json');
} else {
  console.error('No Firebase service account key found');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://learnhub-project.firebaseio.com'
});

export const db = admin.database();
export const auth = admin.auth();
export default admin;
