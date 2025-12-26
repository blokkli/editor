import { defineConfig } from 'cypress'

export default defineConfig({
  viewportHeight: 1200,
  viewportWidth: 1680,
  e2e: {
    setupNodeEvents(_on, _config) {
      // implement node event listeners here
    },
  },
})
