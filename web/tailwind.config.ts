import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#246BFD',
        'primary-dark': '#1A56DB',
      },
    },
  },
  plugins: [],
};

export default config;
