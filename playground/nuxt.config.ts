const getGridMarkup = () => {
  return `<div class="container">${Array(12)
    .fill('<div></div>')
    .join('')}</div>`
}

export default defineNuxtConfig({
  ssr: false,
  modules: ['../src/module', '@nuxtjs/tailwindcss', 'nuxt-svg-icon-sprite'],

  runtimeConfig: {
    openaiKey: process.env.OPENAI_KEY || '',
  },

  app: {
    rootId: 'nuxt-root',
    head: {
      viewport:
        'width=device-width, height=device-height, initial-scale=1.0, user-scalable=0, minimum-scale=1.0, maximum-scale=1.0',
    },
  },

  blokkli: {
    itemEntityType: 'block',
    optionsPluginId: 'mock',
    fieldListTypes: ['header'],
    gridMarkup: getGridMarkup(),
    globalOptions: {
      background: {
        type: 'radios',
        label: 'Background',
        default: 'white',
        displayAs: 'colors',
        options: {
          white: 'bg-white',
          light: 'bg-slate-100',
          dark: 'bg-slate-800',
        },
      },
      showHeader: {
        type: 'checkbox',
        label: 'Show Header',
        default: '',
      },
    },
  },

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: [
          './assets/icons/**/*.svg',
          './../src/icons/logo.svg',
          './components/Blokkli/**/*.svg',
        ],
      },
    },
  },
})
