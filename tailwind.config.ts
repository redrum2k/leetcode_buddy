import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lc: {
          orange: '#f89f1b',
          dark: '#1a1a2e',
          surface: '#282828',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
