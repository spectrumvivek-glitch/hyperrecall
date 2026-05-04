import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { resolved } = useTheme();
  const palette = resolved === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
