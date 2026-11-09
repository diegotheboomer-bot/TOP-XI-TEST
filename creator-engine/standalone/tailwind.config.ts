import type { Config } from 'tailwindcss';
import { backgroundImage, boxShadow, colors } from '../tailwind.theme';

// Same design tokens as the app (src/styles/tokens.css), Google-hosted fonts.
export default {
  content: ['./standalone/**/*.tsx', './src/components/**/*.tsx'],
  theme: {
    colors,
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow,
      backgroundImage,
    },
  },
  plugins: [],
} satisfies Config;
