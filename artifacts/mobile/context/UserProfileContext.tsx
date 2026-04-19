import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const USERNAME_KEY = "@hyperrecall/username";

interface UserProfileValue {
  username: string;
  isReady: boolean;
  hasUsername: boolean;
  setUsername: (name: string) => Promise<void>;
}

const UserProfileContext = createContext<UserProfileValue>({
  username: "",
  isReady: false,
  hasUsername: false,
  setUsername: async () => {},
});

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsernameState] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(USERNAME_KEY);
        if (!cancelled && saved && saved.trim().length > 0) {
          setUsernameState(saved.trim());
        }
      } catch (err) {
        console.warn("Failed to load username:", err);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setUsername = useCallback(async (name: string) => {
    const clean = name.trim().slice(0, 30);
    if (clean.length === 0) return;
    try {
      await AsyncStorage.setItem(USERNAME_KEY, clean);
      setUsernameState(clean);
    } catch (err) {
      console.warn("Failed to save username:", err);
    }
  }, []);

  return (
    <UserProfileContext.Provider
      value={{
        username,
        isReady,
        hasUsername: username.trim().length > 0,
        setUsername,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
