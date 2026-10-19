/**
 * The claim page has a path per language (/de, /fr, /en): / redirects by the
 * browser's languages, keeping the query (an invitation).
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (url.pathname !== '/') {
    return
  }
  const language = preferredLanguage(getRequestHeader(event, 'accept-language'))
  return sendRedirect(event, `/${language}${url.search}`)
})
