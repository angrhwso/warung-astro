import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        warung: {
          primary: '#E76F51',
          primarySoft: '#F4A261',
          secondary: '#2A9D8F',
          cream: '#FDF8F5',
          paper: '#FFFBF5',
          text: '#4A3B32',
          muted: '#8A7768',
          line: '#F1DED2',
          danger: '#E63946',
          warning: '#E9C46A',
          dark: '#1E1E2E',
          darkCard: '#2A2A3A',
          darkText: '#CDD6F4',
        },
      },
      boxShadow: {
        warm: '0 18px 45px rgba(231, 111, 81, 0.14)',
        soft: '0 12px 30px rgba(74, 59, 50, 0.10)',
        glow: '0 0 0 6px rgba(42, 157, 143, 0.14)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scale-fade': {
          '0%': { opacity: '0', transform: 'scale(.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.72', transform: 'scale(1.02)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'badge-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .45s ease both',
        'slide-in-right': 'slide-in-right .24s ease both',
        'scale-fade': 'scale-fade .2s ease both',
        'soft-pulse': 'soft-pulse 1.8s ease-in-out infinite',
        shimmer: 'shimmer 1.4s infinite',
        'badge-bounce': 'badge-bounce .7s ease infinite',
      },
    },
  },
  plugins: [forms, typography],
}
