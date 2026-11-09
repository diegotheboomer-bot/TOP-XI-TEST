import type { Config } from 'tailwindcss';

// Same design as the app, but every colour reads a CSS variable so the page
// follows the viewer's light/dark theme (tokens live in standalone/styles.css).
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (name: string, steps: number[]) => Object.fromEntries(steps.map((s) => [s, v(`${name}-${s}`)]));

export default {
  content: ['./standalone/**/*.tsx', './src/components/**/*.tsx'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: v('white'),
      zinc: scale('zinc', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
      accent: scale('accent', [50, 100, 500, 600, 700]),
      rose: scale('rose', [50, 200, 600, 700]),
      amber: scale('amber', [50, 300, 700, 800]),
      sky: scale('sky', [50, 700]),
    },
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: { card: '0 1px 2px rgb(var(--shadow) / 0.05), 0 1px 1px rgb(var(--shadow) / 0.03)' },
    },
  },
  plugins: [],
} satisfies Config;
