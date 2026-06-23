/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        orbit: {
          accent: {
            red: 'var(--color-accent-red)',
            'red-light': 'var(--color-accent-red-light)',
            'red-hover': 'var(--color-accent-red-hover)',
            purple: 'var(--color-accent-purple)',
            'purple-light': 'var(--color-accent-purple-light)',
            'purple-hover': 'var(--color-accent-purple-hover)',
          },
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '24px',
        pill: '999px',
      },
      boxShadow: {
        sm: 'var(--color-shadow-sm)',
        md: 'var(--color-shadow-md)',
        lg: 'var(--color-shadow-lg)',
      },
      keyframes: {
        'panel-in': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-out': {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
      },
      animation: {
        'panel-in': 'panel-in 250ms ease forwards',
        'toast-in': 'toast-in 300ms ease-out',
        'toast-out': 'toast-out 250ms ease-in forwards',
        shimmer: 'shimmer 1.2s infinite',
      },
    },
  },
  plugins: [],
}
