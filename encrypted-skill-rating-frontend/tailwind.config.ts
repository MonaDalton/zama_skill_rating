import type { Config } from "tailwindcss";
import { designTokens } from "./design-tokens";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: designTokens.colors.light.primary,
        secondary: designTokens.colors.light.secondary,
        accent: designTokens.colors.light.accent,
        neutral: designTokens.colors.light.neutral,
        success: designTokens.colors.light.success,
        warning: designTokens.colors.light.warning,
        error: designTokens.colors.light.error,
      },
      fontFamily: {
        sans: designTokens.typography.fontFamily.sans,
        heading: designTokens.typography.fontFamily.heading,
      },
      fontSize: designTokens.typography.fontSize,
      fontWeight: designTokens.typography.fontWeight,
      lineHeight: designTokens.typography.lineHeight,
      borderRadius: designTokens.borderRadius,
      boxShadow: designTokens.shadows,
      transitionDuration: {
        fast: '150ms',
        default: '300ms',
        slow: '500ms',
      },
      maxWidth: {
        container: designTokens.layout.maxWidth,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;



