import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lc: {
          orange: '#ffa116',
          dark: '#1a1a1a',
          surface: '#282828',
          elevated: '#303030',
          easy: '#00b8a3',
          medium: '#ffc01e',
          hard: '#ef4743',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
