import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      perspective: {
        '1000': '1000px',
      },
      backfaceVisibility: {
        'hidden': 'hidden',
      },
      transform: {
        'flip': 'rotateY(180deg)',
      },
    },
  },
  plugins: [],
};

export default config; 