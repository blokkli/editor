/* eslint-disable */
// Empty PostCSS config so the playground does NOT inherit the parent
// editor's postcss.config.cjs (which mangles selectors with `_bk_` and
// scopes them under `.bk`). The playground's CSS is handled entirely by
// `@tailwindcss/vite` — the per-SFC `@reference` directives let v4
// resolve `@apply` against the playground's tailwind.config.ts.
module.exports = { plugins: {} }
