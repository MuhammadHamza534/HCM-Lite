import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1E2A47',
        teal: '#0F9D8A',
        canvas: '#F7F9FC',
        ink: '#18223A'
      }
    }
  },
  plugins: []
} satisfies Config;
