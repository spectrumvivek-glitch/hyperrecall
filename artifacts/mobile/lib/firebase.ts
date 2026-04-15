import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: "recallify-9cff7.firebaseapp.com",
  projectId: "recallify-9cff7",
  storageBucket: "recallify-9cff7.firebasestorage.app",
  messagingSenderId: "111191762327",
  appId: "1:111191762327:web:481072e00ffb3eea2750d2",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Auth — persistent sessions via AsyncStorage on native ───────────────────
let auth: Auth;
if (Platform.OS !== "web") {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
} else {
  auth = getAuth(app);
}

// ─── Firestore — enable IndexedDB persistence on web for offline reads ───────
let db: Firestore;
if (Platform.OS === "web") {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Already initialised (hot-reload)
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}

// ─── Firebase Storage ─────────────────────────────────────────────────────────
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
