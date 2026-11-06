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
          600: '#832729', // Brand Primary
          700: '#6E1F21',
          800: '#5A1A1C',
          900: '#461416',
          950: '#2A0B0C',
        },
        gold: {
          50: '#FDFBF5',
          100: '#FAF4E3',
          200: '#F3E5AB',
          300: '#ECD37B',
          400: '#E2BD48',
          500: '#D4AF37', // Brand Accent
          600: '#B89324',
          700: '#917118',
          800: '#6C5311',
          900: '#4A380A',
        },
        cream: {
          50: '#FCFBF9',
          100: '#FAF7F2',
          200: '#F5EFEB',
          300: '#EFE7DE',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Cinzel', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
