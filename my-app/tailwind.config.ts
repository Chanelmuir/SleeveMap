import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'sleevePalette': {
          black: '#132326',
          ocean1: '#2E5558',
          ocean2: '#506E6F',
          ocean3: '#6A8E90',
          gold: '#A67C3B',
          bronze: '#7A5A2A',
        },
        orange: {
          DEFAULT: '#FC4C02',
          dim:     '#c93d01',
        },
        base: {
          DEFAULT: '#080808',
          2:       '#111111',
          3:       '#181818',
        },
        text: {
          DEFAULT: '#f0ede8',
          muted:   '#6b6560',
        },
        sport: {
          run:  '#FC4C02',
          ride: '#3498DB',
          hike: '#27AE60',
          walk: '#F39C12',
          swim: '#9B59B6',
        },
      },
      fontFamily: {
        condensed: ['var(--font-barlow)', 'sans-serif'],
        mono:      ['var(--font-dm-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config