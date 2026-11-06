/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          50: '#FAF5F5',
          100: '#F5EAEA',
          200: '#EBD5D6',
          300: '#DAB5B7',
          400: '#C2898C',
          500: '#9E4447',
          600: '#832729',
          700: '#6E1F21',
          800: '#5A1A1C',
          900: '#461416',
          950: '#2A0B0C',
        },
        gold: {
          500: '#D4AF37',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
