import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * Returns whether the device currently has a network connection.
 *
 * On web: uses the browser's `online` / `offline` events.
 * On native: assumes online (use @react-native-community/netinfo for deeper coverage).
 */
export function useConnectionState(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    setIsOnline(window.navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return isOnline;
}
