import React, { createContext, useContext } from "react";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  clearAuthError: () => void;
  googleAvailable: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleIdToken: (idToken: string, accessToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const noop = async () => {};

const STUB: AuthContextValue = {
  user: null,
  isLoading: false,
  isAuthenticating: false,
  authError: null,
  clearAuthError: () => {},
  googleAvailable: false,
  signIn: noop,
  signUp: noop,
  signInWithGoogle: noop,
  signInWithGoogleIdToken: noop,
  signOut: noop,
  deleteAccount: noop,
  updateDisplayName: noop,
};

const AuthContext = createContext<AuthContextValue>(STUB);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={STUB}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
