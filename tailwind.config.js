/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'blue': {
          500: '#3B82F6',
          600: '#2563EB',
        },
        'gray': {
          50: '#F9FAFB',
          100: '#F3F4F6',
          300: '#D1D5DB',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
        },
        'red': {
          500: '#EF4444',
          600: '#DC2626',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 