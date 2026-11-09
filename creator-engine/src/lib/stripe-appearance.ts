// Stripe's iframes can't read our CSS variables, so the colours from
// src/styles/tokens.css are repeated here as hex for each theme.
import type { AppTheme } from '@/components/use-app-theme';

const PALETTE = {
  dark: { bg: '#161619', field: '#0c0c0e', text: '#f4f4f5', muted: '#a1a1aa', border: '#2e2e34', primary: '#f4f4f5', onPrimary: '#161619', accent: '#34d399', danger: '#fb7185' },
  light: { bg: '#ffffff', field: '#ffffff', text: '#18181b', muted: '#71717a', border: '#e4e4e7', primary: '#18181b', onPrimary: '#ffffff', accent: '#059669', danger: '#e11d48' },
} as const;

const FONT = '"Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

/** Appearance for the Payment Element (card fields, Apple Pay, Google Pay). */
export function elementsAppearance(theme: AppTheme) {
  const c = PALETTE[theme];
  return {
    theme: theme === 'dark' ? ('night' as const) : ('stripe' as const),
    variables: {
      colorPrimary: c.accent,
      colorBackground: c.field,
      colorText: c.text,
      colorTextSecondary: c.muted,
      colorDanger: c.danger,
      fontFamily: FONT,
      fontSizeBase: '15px',
      borderRadius: '8px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': { border: `1px solid ${c.border}`, boxShadow: 'none' },
      '.Input:focus': { border: `1px solid ${c.muted}`, boxShadow: 'none' },
      '.Tab': { border: `1px solid ${c.border}`, boxShadow: 'none' },
      '.Label': { fontWeight: '500' },
    },
  };
}

/** Appearance for Connect embedded components (clipper payout onboarding). */
export function connectAppearance(theme: AppTheme) {
  const c = PALETTE[theme];
  return {
    overlays: 'dialog' as const,
    variables: {
      fontFamily: FONT,
      colorPrimary: c.accent,
      colorBackground: c.bg,
      colorText: c.text,
      colorSecondaryText: c.muted,
      colorBorder: c.border,
      colorDanger: c.danger,
      buttonPrimaryColorBackground: c.primary,
      buttonPrimaryColorText: c.onPrimary,
      buttonSecondaryColorBackground: c.bg,
      buttonSecondaryColorText: c.text,
      buttonSecondaryColorBorder: c.border,
      formBackgroundColor: c.field,
      formAccentColor: c.accent,
      offsetBackgroundColor: c.field,
      borderRadius: '8px',
      buttonBorderRadius: '8px',
      formBorderRadius: '8px',
    },
  };
}
