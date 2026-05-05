import React, { createContext, useContext } from "react";

export type ThemeMode = "light";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => Promise<void>;
  resolved: "light";
}

const value: ThemeContextValue = {
  mode: "light",
  setMode: async () => {},
  resolved: "light",
};

const ThemeContext = createContext<ThemeContextValue>(value);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
