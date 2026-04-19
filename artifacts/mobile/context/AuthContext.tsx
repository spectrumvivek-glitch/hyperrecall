import Constants from "expo-constants";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

import { auth } from "@/lib/firebase";
import { deleteUserProfile, upsertUserProfile } from "@/lib/firestore";

const extra = Constants.expoConfig?.extra ?? {};
const GOOGLE_WEB_CLIENT_ID: string =
  extra.googleWebClientId ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "";

// Lazy-load the native Google Sign-In module so the web build doesn't break.
// On web we use Firebase popup; on native we use the native account picker.
let GoogleSignin: any = null;
let googleSigninConfigured = false;
function getGoogleSignin() {
  if (Platform.OS === "web") return null;
  if (!GoogleSignin) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
    } catch {
      return null;
    }
  }
  if (GoogleSignin && !googleSigninConfigured && GOOGLE_WEB_CLIENT_ID) {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    googleSigninConfigured = true;
  }
  return GoogleSignin;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null;
  /** True while resolving the initial auth session */
  isLoading: boolean;
  /** True while a sign-in / sign-up / sign-out operation is in flight */
  isAuthenticating: boolean;
  /** Last auth error, cleared on next operation */
  authError: string | null;
  clearAuthError: () => void;
  googleAvailable: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** Native: complete Google sign-in after expo-auth-session returns an id_token */
  signInWithGoogleIdToken: (idToken: string, accessToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Permanently deletes the Firebase Auth account + Firestore profile */
  deleteAccount: (password?: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Google Sign-In via popup works on web without a client ID.
  // On native we need the Web Client ID (used by the native SDK to mint an
  // idToken that Firebase accepts).
  const googleAvailable =
    Platform.OS === "web" || Boolean(GOOGLE_WEB_CLIENT_ID);

  // ─── Listen to auth state changes ────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsLoading(false);
      if (u) {
        await upsertUserProfile(u.uid, u.email ?? "", u.displayName).catch(
          () => {}
        );
      }
    });
    return unsub;
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // ─── Wrap every auth op with loading + error state ────────────────────────

  async function withAuth<T>(fn: () => Promise<T>): Promise<T> {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      return await fn();
    } catch (err: any) {
      const msg = friendlyAuthError(err?.code ?? "", err?.message ?? "");
      setAuthError(msg);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }

  // ─── Auth operations ──────────────────────────────────────────────────────

  const signIn = useCallback(
    (email: string, password: string) =>
      withAuth(() => signInWithEmailAndPassword(auth, email, password).then(() => {})),
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) =>
      withAuth(async () => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(cred.user, { displayName }).catch(() => {});
        }
        await upsertUserProfile(cred.user.uid, email, displayName).catch(() => {});
      }),
    []
  );

  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS === "web") {
      await withAuth(async () => {
        const provider = new GoogleAuthProvider();
        provider.addScope("profile");
        provider.addScope("email");
        await signInWithPopup(auth, provider);
      });
      return;
    }

    // Native: use the native Google account picker (production-grade).
    await withAuth(async () => {
      const Gs = getGoogleSignin();
      if (!Gs) {
        throw new Error(
          "Google Sign-In native module unavailable. Rebuild the app with the latest config."
        );
      }
      if (!GOOGLE_WEB_CLIENT_ID) {
        throw new Error(
          "Google Sign-In not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID."
        );
      }
      try {
        await Gs.hasPlayServices({ showPlayServicesUpdateDialog: true });
      } catch {
        throw new Error("Google Play Services is required for Google Sign-In.");
      }
      const result = await Gs.signIn();
      // v13+ returns { type, data: { idToken, user } }; older returns idToken on root.
      const idToken: string | undefined =
        result?.data?.idToken ?? result?.idToken;
      if (!idToken) {
        // Cancelled by user, or no idToken returned
        const cancelled =
          result?.type === "cancelled" || result?.type === "noSavedCredentialFound";
        if (cancelled) return;
        throw new Error("Google sign-in did not return an ID token.");
      }
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    });
  }, []);

  const signInWithGoogleIdToken = useCallback(
    async (idToken: string, accessToken?: string) =>
      withAuth(async () => {
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        await signInWithCredential(auth, credential);
      }),
    []
  );

  const signOut = useCallback(
    () => withAuth(() => firebaseSignOut(auth)),
    []
  );

  /**
   * Permanently deletes the Firebase Auth account + Firestore profile.
   * For email users, pass the current password to re-authenticate first.
   * At scale, subcollection cleanup (notes, reviews) should be done via
   * a Cloud Functions onDelete trigger, not the client.
   */
  const deleteAccount = useCallback(
    async (password?: string) =>
      withAuth(async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Not signed in.");

        // Re-authenticate for email/password users (security requirement)
        if (password && currentUser.email) {
          const cred = EmailAuthProvider.credential(
            currentUser.email,
            password
          );
          await reauthenticateWithCredential(currentUser, cred);
        }

        // Delete Firestore profile (subcollection docs cleaned up by Cloud Function)
        await deleteUserProfile(currentUser.uid).catch(() => {});

        // Delete the Firebase Auth account
        await deleteUser(currentUser);
      }),
    []
  );

  const updateDisplayName = useCallback(
    async (name: string) =>
      withAuth(async () => {
        if (!auth.currentUser) throw new Error("Not signed in.");
        await updateProfile(auth.currentUser, { displayName: name });
        await upsertUserProfile(
          auth.currentUser.uid,
          auth.currentUser.email ?? "",
          name
        ).catch(() => {});
        // Refresh user object in state
        setUser({ ...auth.currentUser });
      }),
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticating,
        authError,
        clearAuthError,
        googleAvailable,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithGoogleIdToken,
        signOut,
        deleteAccount,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ─── Error messages ───────────────────────────────────────────────────────────

function friendlyAuthError(code: string, fallback: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with that email already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/unauthorized-domain":
      return "This domain isn't authorised in Firebase. Add it under Authentication → Settings → Authorized domains.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled. Check Firebase Console.";
    case "auth/requires-recent-login":
      return "Please sign out and sign in again before performing this action.";
    default:
      return fallback || "Something went wrong. Please try again.";
  }
}
