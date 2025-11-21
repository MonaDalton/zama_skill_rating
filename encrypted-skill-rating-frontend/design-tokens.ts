/**
 * Design Tokens - Encrypted Skill Rating Hub
 * 
 * Seed: sha256("Encrypted Skill Rating Hub" + "sepolia" + "202412" + "SkillRating.sol")
 * = 06f7d835e93bb0b3a0a43e49ccb7623e25dc4da53445ab5cc8fa2c6ae2f6c358
 * 
 * Theme selection based on seed:
 * - Primary: Indigo (deep blue/purple) - encryption, professionalism
 * - Secondary: Emerald (green) - verification, trust
 * - Accent: Orange - ratings, activity
 */

export const designTokens = {
  colors: {
    light: {
      primary: {
        50: '#EEF2FF',
        100: '#E0E7FF',
        200: '#C7D2FE',
        300: '#A5B4FC',
        400: '#818CF8',
        500: '#6366F1',
        600: '#4F46E5',
        700: '#4338CA',
        800: '#3730A3',
        900: '#312E81',
      },
      secondary: {
        50: '#ECFDF5',
        100: '#D1FAE5',
        200: '#A7F3D0',
        300: '#6EE7B7',
        400: '#34D399',
        500: '#10B981',
        600: '#059669',
        700: '#047857',
        800: '#065F46',
        900: '#064E3B',
      },
      accent: {
        50: '#FFF7ED',
        100: '#FFEDD5',
        200: '#FED7AA',
        300: '#FDBA74',
        400: '#FB923C',
        500: '#F97316',
        600: '#EA580C',
        700: '#C2410C',
        800: '#9A3412',
        900: '#7C2D12',
      },
      neutral: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827',
      },
      success: {
        50: '#ECFDF5',
        100: '#D1FAE5',
        500: '#10B981',
        600: '#059669',
      },
      warning: {
        50: '#FFFBEB',
        100: '#FEF3C7',
        500: '#F59E0B',
        600: '#D97706',
      },
      error: {
        50: '#FEF2F2',
        100: '#FEE2E2',
        500: '#EF4444',
        600: '#DC2626',
      },
    },
    dark: {
      primary: {
        50: '#312E81',
        100: '#3730A3',
        200: '#4338CA',
        300: '#4F46E5',
        400: '#6366F1',
        500: '#818CF8',
        600: '#A5B4FC',
        700: '#C7D2FE',
        800: '#E0E7FF',
        900: '#EEF2FF',
      },
      secondary: {
        50: '#064E3B',
        100: '#065F46',
        200: '#047857',
        300: '#059669',
        400: '#10B981',
        500: '#34D399',
        600: '#6EE7B7',
        700: '#A7F3D0',
        800: '#D1FAE5',
        900: '#ECFDF5',
      },
      accent: {
        50: '#7C2D12',
        100: '#9A3412',
        200: '#C2410C',
        300: '#EA580C',
        400: '#F97316',
        500: '#FB923C',
        600: '#FDBA74',
        700: '#FED7AA',
        800: '#FFEDD5',
        900: '#FFF7ED',
      },
      neutral: {
        50: '#111827',
        100: '#1F2937',
        200: '#374151',
        300: '#4B5563',
        400: '#6B7280',
        500: '#9CA3AF',
        600: '#D1D5DB',
        700: '#E5E7EB',
        800: '#F3F4F6',
        900: '#F9FAFB',
      },
      success: {
        50: '#064E3B',
        500: '#10B981',
        600: '#34D399',
      },
      warning: {
        50: '#78350F',
        500: '#F59E0B',
        600: '#FBBF24',
      },
      error: {
        50: '#7F1D1D',
        500: '#EF4444',
        600: '#F87171',
      },
    },
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '24px',
      '2xl': '32px',
      '3xl': '40px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    compact: {
      base: 4,
      scale: [4, 8, 12, 16, 20, 24, 32, 40, 48],
    },
    comfortable: {
      base: 8,
      scale: [8, 16, 24, 32, 40, 48, 64, 80, 96],
    },
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms ease-out',
    default: '300ms ease-out',
    slow: '500ms ease-out',
  },
  layout: {
    maxWidth: '1280px',
    containerPadding: {
      mobile: '16px',
      tablet: '24px',
      desktop: '32px',
    },
  },
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1024px',
  },
  density: {
    compact: 'compact',
    comfortable: 'comfortable',
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
} as const;

// Helper functions
export function getColor(colorPath: string, theme: 'light' | 'dark' = 'light'): string {
  const parts = colorPath.split('.');
  let value: any = designTokens.colors[theme];
  for (const part of parts) {
    value = value?.[part];
    if (!value) break;
  }
  return value || designTokens.colors.light.neutral[500];
}

export function getSpacing(size: number, density: 'compact' | 'comfortable' = 'comfortable'): string {
  const base = designTokens.spacing[density].base;
  return `${size * base}px`;
}

export type DesignTokens = typeof designTokens;



