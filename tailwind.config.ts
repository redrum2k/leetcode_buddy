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
        theme: {
          base:          'var(--color-base)',
          surface:       'var(--color-surface)',
          elevated:      'var(--color-elevated)',
          text:          'var(--color-text)',
          muted:         'var(--color-muted)',
          border:        'var(--color-border)',
          accent:        'var(--color-accent)',
          'accent-tint': 'var(--color-accent-tint)',
          'on-accent':   'var(--color-on-accent)',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
