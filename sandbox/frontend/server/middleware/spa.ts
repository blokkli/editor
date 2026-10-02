import { defineEventHandler, getRequestHeader } from 'h3'

/**
 * Render on the server only for anonymous users, and only locally.
 *
 * Logged-in users, editing, previews and the hosted instance get the SPA, as
 * in the starterkit. SSR stays available locally to test blökkli's server
 * code paths.
 */
export default defineEventHandler((event) => {
  const path = event.path
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_nuxt/') ||
    /\.(js|css|woff2?|ico|svg|png|jpg|webp)$/.test(path)
  ) {
    return
  }

  const cookie = getRequestHeader(event, 'cookie') ?? ''
  if (
    process.env.IS_DDEV_HOSTED === 'true' ||
    path.includes('blokkliEditing') ||
    path.includes('blokkliPreview') ||
    /(^|;\s*)S?SESS/.test(cookie)
  ) {
    event.context.nuxt ??= {}
    event.context.nuxt.noSSR = true
  }
})
