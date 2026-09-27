// src/theme.ts
// Single source of truth for Color Fool's Nordic Obsidian & Arctic Cyan theme

export const theme = {
  colors: {
    // Canvas & Surfaces
    background: '#0B1017',
    cardSurface: '#131B27',
    surface2: '#1D2838',
    surfaceBorder: '#28354A',

    // Accents
    primaryAccent: '#38BDF8',
    primaryAccentHover: '#0284C7',
    accentText: '#07111D',

    // Typography
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',

    // Brand Dots (Coordinated blue-cyan triad, strictly no rainbow)
    dots: {
      dot1: '#38BDF8',
      dot2: '#60A5FA',
      dot3: '#93C5FD',
    },

    // Semantic status colors (crisp, no harsh neon gradients)
    status: {
      success: '#38BDF8',
      successMuted: 'rgba(56, 189, 248, 0.15)',
      warning: '#FBBF24',
      warningMuted: 'rgba(251, 191, 36, 0.15)',
      danger: '#F87171',
      dangerMuted: 'rgba(248, 113, 113, 0.15)',
    },

    // Overlay colors
    overlay: 'rgba(11, 16, 23, 0.95)',
    hudControl: 'rgba(19, 27, 39, 0.75)',
    hudBorder: 'rgba(40, 53, 74, 0.8)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 999,
  },
} as const;

export type Theme = typeof theme;
