import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { chatbotConfig } from "../../config/chatbot.config.js";

let firestoreInstance: admin.firestore.Firestore | null = null;
let isInitialized = false;

export function getFirestore(): admin.firestore.Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  if (isInitialized && admin.apps.length > 0) {
    firestoreInstance = admin.firestore();
    return firestoreInstance;
  }

  const { projectId, clientEmail, privateKey, serviceAccountPath } = chatbotConfig.firebase;

  // 1. Check if serviceAccountPath is provided
  if (serviceAccountPath) {
    const resolvedPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.resolve(process.cwd(), serviceAccountPath);

    if (fs.existsSync(resolvedPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isInitialized = true;
      firestoreInstance = admin.firestore();
      return firestoreInstance;
    }
  }

  // 2. Check if individual credentials are provided
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    isInitialized = true;
    firestoreInstance = admin.firestore();
    return firestoreInstance;
  }

  // 3. Fallback to Google Application Default Credentials (ADC) if project ID is available
  if (projectId) {
    admin.initializeApp({
      projectId,
    });
    isInitialized = true;
    firestoreInstance = admin.firestore();
    return firestoreInstance;
  }

  // 4. Default initialization if already configured via environment
  if (admin.apps.length > 0) {
    isInitialized = true;
    firestoreInstance = admin.firestore();
    return firestoreInstance;
  }

  throw new Error(
    "Firebase Firestore credentials not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_PATH) in your .env file."
  );
}

export function isFirebaseConfigured(): boolean {
  const { projectId, clientEmail, privateKey, serviceAccountPath } = chatbotConfig.firebase;
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) return true;
  if (projectId && clientEmail && privateKey) return true;
  if (projectId) return true;
  return admin.apps.length > 0;
}
