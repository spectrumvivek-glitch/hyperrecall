import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
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
import { createUserProfile } from "@/lib/firestore";

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra ?? {};
const GOOGLE_WEB_CLIENT_ID: string =
  extra.googleWebClientId ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "";

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  googleAvailable: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On web, signInWithPopup works without a separate client ID.
  // On mobile (Expo Go), the custom OAuth flow needs GOOGLE_WEB_CLIENT_ID.
  const googleAvailable = Platform.OS === "web" || Boolean(GOOGLE_WEB_CLIENT_ID);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsLoading(false);
      if (u) {
        await createUserProfile(u.uid, u.email ?? "").catch(() => {});
      }
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await createUserProfile(cred.user.uid, email).catch(() => {});
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS === "web") {
      // Web: use Firebase popup — no extra client ID needed.
      // Requires Google enabled in Firebase Console + this domain in Authorized Domains.
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      await signInWithPopup(auth, provider);
      return;
    }

    // Mobile (Expo Go): custom OAuth flow via in-app browser.
    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error(
        "Google Sign-In requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to be set with your Firebase project's Web OAuth 2.0 client ID."
      );
    }

    const redirectUri = AuthSession.makeRedirectUri({ scheme: "mobile" });
    const nonce = Math.random().toString(36).slice(2);
    const params = new URLSearchParams({
      client_id: GOOGLE_WEB_CLIENT_ID,
      response_type: "id_token",
      redirect_uri: redirectUri,
      scope: "openid profile email",
      nonce,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === "success" && result.url) {
      const hash = result.url.split("#")[1] ?? "";
      const hashParams = new URLSearchParams(hash);
      const idToken = hashParams.get("id_token");
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        googleAvailable,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
