import { palette, paletteDark } from './colors';

export const lightTheme = {
  colors: {
    primary: palette.primary,
    primaryDark: palette.primaryDark,
    secondary: palette.secondary,
    background: palette.background,
    backgroundAlt: palette.backgroundAlt,
    surface: palette.surface,
    surfaceAlt: palette.surfaceAlt,
    text: palette.text,
    textSecondary: palette.textSecondary,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    border: palette.border,
    shadow: palette.shadow,
    onPrimary: palette.onPrimary,
    onSurface: palette.onSurface,
    onDanger: palette.onDanger,
    overlay: palette.overlay,
    inverseText: palette.inverseText,
  },
  spacing: (multiplier: number = 1) => 8 * multiplier,
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  typography: {
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400' as const,
    },
  },
};

export const darkTheme: typeof lightTheme = {
  colors: {
    primary: paletteDark.primary,
    primaryDark: paletteDark.primaryDark,
    secondary: paletteDark.secondary,
    background: paletteDark.background,
    backgroundAlt: paletteDark.backgroundAlt,
    surface: paletteDark.surface,
    surfaceAlt: paletteDark.surfaceAlt,
    text: paletteDark.text,
    textSecondary: paletteDark.textSecondary,
    success: paletteDark.success,
    warning: paletteDark.warning,
    danger: paletteDark.danger,
    border: paletteDark.border,
    shadow: paletteDark.shadow,
    onPrimary: paletteDark.onPrimary,
    onSurface: paletteDark.onSurface,
    onDanger: paletteDark.onDanger,
    overlay: paletteDark.overlay,
    inverseText: paletteDark.inverseText,
  },
  spacing: (multiplier: number = 1) => 8 * multiplier,
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  typography: {
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400' as const,
    },
  },
};

export type AppTheme = typeof lightTheme;


