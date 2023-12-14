module.exports = {
  root: true,
  extends: ['@nuxt/eslint-config', 'plugin:prettier/recommended'],
  rules: {
    'vue/no-v-html': 'off',
    'vue/no-v-text-v-html-on-component': 'off',
    'vue/multi-word-component-names': 'off',
  },
}
