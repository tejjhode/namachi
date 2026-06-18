import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nomichi: {
          rust: '#D55D27',      // Primary Brand Color
          sand: '#D1B788',      // Accent
          ink: '#1C1B1A',       // Dark Text/UI
          olive: '#45471D',     // Tertiary
          cream: '#FFFBF5',     // Main Background
          white: '#FFFFFF',     // Secondary White
        },
        primary: '#D55D27',
        secondary: '#1C1B1A',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config

