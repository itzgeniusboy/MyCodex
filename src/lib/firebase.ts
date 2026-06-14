import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const config = {
  apiKey: ((import.meta as any).env?.VITE_FIREBASE_API_KEY) || firebaseConfig.apiKey,
  authDomain: ((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN) || firebaseConfig.authDomain,
  projectId: ((import.meta as any).env?.VITE_FIREBASE_PROJECT_ID) || firebaseConfig.projectId,
  storageBucket: ((import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET) || firebaseConfig.storageBucket,
  messagingSenderId: ((import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseConfig.messagingSenderId,
  appId: ((import.meta as any).env?.VITE_FIREBASE_APP_ID) || firebaseConfig.appId,
  measurementId: ((import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID) || firebaseConfig.measurementId
};

const databaseId = ((import.meta as any).env?.VITE_FIREBASE_DATABASE_ID) || firebaseConfig.firestoreDatabaseId;

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, databaseId);

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Auto-check redirect result on boot if in browser to capture Google access token
if (typeof window !== "undefined") {
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          console.log("Successfully cached Google access token from redirect.");
        }
      }
    })
    .catch((error) => {
      console.error("Error retrieving Google redirect outcome:", error);
    });
}

// Initialize auth state to sync with our app
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Token is not loaded yet (page refresh) but user is still signed in.
        // We'll let the user initiate provider sign-in again to re-acquire the token or keep guest state.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (withGmailScopes = false): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    if (withGmailScopes) {
      provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
      provider.addScope("https://www.googleapis.com/auth/gmail.send");
    }

    // Detect if mobile/tablet or embedded webview to prefer Redirect directly
    const isMobileDevice = typeof window !== "undefined" && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 1024
    );

    if (isMobileDevice) {
      console.log("Mobile/tablet environment detected. Initiating signInWithRedirect...");
      await signInWithRedirect(auth, provider);
      return null; // Page will redirect and refresh automatically
    }

    // High performance desktop flow: standard signInWithPopup
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error("Failed to retrieve Google OAuth access token from Firebase credentials.");
      }
      cachedAccessToken = credential.accessToken;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (popupError: any) {
      const errorCode = popupError?.code || "";
      console.warn("Popup authentication warning:", errorCode, popupError);
      
      // Fall back to redirect if popup is closed by user or blocked entirely
      if (
        errorCode.includes("popup-closed-by-user") ||
        errorCode.includes("popup-blocked") ||
        errorCode.includes("cancelled-popup-request")
      ) {
        console.log("Popup was closed or blocked. Gracefully redirecting the user instead...");
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw popupError;
    }
  } catch (error: any) {
    console.error("Firebase Sign in error details:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const listStr = localStorage.getItem("pocketcodex_gmail_vault") || localStorage.getItem("chat_gpt_ios_gmail_accounts");
    if (listStr) {
      const accounts = JSON.parse(listStr);
      const active = accounts.find((a: any) => a.isActive);
      if (active && active.accessToken) {
        return active.accessToken;
      }
    }
  } catch (e) {}
  return null;
};

export const logoutGmail = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

