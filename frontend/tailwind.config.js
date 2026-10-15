/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B6B4A',
          hover: '#09573c',
          dark: '#06422d',
          light: '#0f8a60',
          50: '#e8f5f0',
          100: '#c5e8dc',
          500: '#0B6B4A',
          600: '#09573c',
          700: '#07442f',
          800: '#053122',
          900: '#031f15',
        },
        danger: {
          DEFAULT: '#C8362B',
          hover: '#aa2c23',
          dark: '#85221b',
          light: '#e14f44',
          50: '#fdf2f1',
          100: '#f9dedc',
          500: '#C8362B',
          600: '#aa2c23',
          700: '#85221b',
        },
        land: {
          DEFAULT: '#0B6B4A',
          50: '#e8f5f0',
          100: '#c5e8dc',
          200: '#9ed6c3',
          300: '#72c2a7',
          400: '#46af8c',
          500: '#0B6B4A',
          600: '#09573c',
          700: '#07442f',
          800: '#053122',
          900: '#031f15',
          950: '#02120c',
        },
        trust: {
          ocr: '#0284c7',       // OCR_EXTRACTED (Cyan/Sky)
          match: '#d97706',     // POSSIBLE_MATCH (Amber)
          user: '#6366f1',      // USER_CORRECTED (Indigo)
          verified: '#0B6B4A',  // VERIFIED_AUTHORIZED_SOURCE (Official Green)
          required: '#C8362B',  // VERIFICATION_REQUIRED (Official Red)
        }
      },
      fontFamily: {
        sans: ['"Noto Sans Bengali"', '"Hind Siliguri"', 'Inter', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        'screen-dvh': '100dvh',
      },
      height: {
        'screen-dvh': '100dvh',
      },
      padding: {
        'safe-bottom': 'env(safe-area-inset-bottom, 16px)',
        'safe-top': 'env(safe-area-inset-top, 16px)',
      }
    },
  },
  plugins: [],
}
