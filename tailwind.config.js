/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  safelist: [
    'bg-core-green',
    'bg-core-green-h',
    'text-core-green',
    'border-core-green',
    'ring-core-green',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0)    scale(1)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      boxShadow: {
        'core-sm': '0 1px 3px 0 rgb(0 0 0 / 0.06)',
        core: '0 2px 8px 0 rgb(0 0 0 / 0.08)',
        'core-lg': '0 8px 24px 0 rgb(0 0 0 / 0.10)',
      },
      borderRadius: {
        core: '10px', // padrão Core para cards e containers
      },
      colors: {
        core: {
          green: '#18B37A',
          'green-h': '#0e9463',
          black: '#111111',
          50: '#F5F5F5',
          200: '#E5E7EB',
          400: '#6B7280',
        },
        shopee: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
