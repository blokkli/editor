const getGridMarkup = () => {
  return `<div class="container">${Array(12)
    .fill('<div></div>')
    .join('')}</div>`
}

export default defineNuxtConfig({
  ssr: false,
  modules: ['../src/module', '@nuxtjs/tailwindcss', 'nuxt-svg-icon-sprite'],

  app: {
    rootId: 'nuxt-root',
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
    },
  },

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: ['./assets/icons/**/*.svg'],
      },
    },
  },
})
