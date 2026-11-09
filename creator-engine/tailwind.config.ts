import type { Config } from 'tailwindcss';
import { boxShadow, colors } from './tailwind.theme';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors,
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow,
    },
  },
  plugins: [],
} satisfies Config;
