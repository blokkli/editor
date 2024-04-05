module.exports = {
  root: true,
  extends: ['@nuxtjs/eslint-config-typescript', 'plugin:prettier/recommended'],
  rules: {
    'vue/no-v-html': 'off',
    'import/order': 'off',
    'array-callback-return': 'off',
    'vue/no-v-text-v-html-on-component': 'off',
    'vue/multi-word-component-names': 'off',
  },
}
