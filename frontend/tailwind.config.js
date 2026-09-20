/** @type {import('tailwindcss').Config} */
const grayscalePalette = {
  50: '#f5f7fa',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#333333',
  900: '#2d2d2d',
  950: '#1a1a1a',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mono: {
          bg: '#FFFFFF',
          surface: '#F5F5F7',
          text: '#1D1D1F',
          muted: '#6E6E73',
          border: '#E5E5EA',
        },
        primary: grayscalePalette,
        accent: grayscalePalette,
        ink: grayscalePalette,
        indigo: grayscalePalette,
        red: grayscalePalette,
        emerald: grayscalePalette,
        purple: grayscalePalette,
        blue: grayscalePalette,
        green: grayscalePalette,
        yellow: grayscalePalette,
        amber: grayscalePalette,
        teal: grayscalePalette,
        cyan: grayscalePalette,
      }
    },
  },
  plugins: [],
}