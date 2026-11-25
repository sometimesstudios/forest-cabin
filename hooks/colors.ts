import { makeColors } from './make-colors.js'

// Dark: a log cabin at night, lit by the fire. Light: the same cabin by day, pine wood.
export const { theme, problems } = makeColors({
  label: 'Forest cabin',
  roles: { accent: '#d9822f', danger: '#c0503a', success: '#6f9a4c', warning: '#d2a03c', pro: '#8b78b0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e6d8bf',
        'surface-1': '#ede1cb',
        'surface-2': '#f5ecdc',
        'text-primary': '#2a1f15',
        'text-secondary': '#4d3d2c',
        'text-muted': '#665441',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#15120e',
        'surface-1': '#1d1913',
        'surface-2': '#241f17',
        'surface-3': '#2b251c',
        'text-primary': '#f1e5cf',
        'text-secondary': '#d0c0a5',
        'text-muted': '#ab9c84',
      },
    },
  },
})
