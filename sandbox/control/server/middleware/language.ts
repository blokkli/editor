import {
  defineEventHandler,
  getRequestHeader,
  getRequestURL,
  sendRedirect,
} from 'h3'
import { isLanguage } from '../../../frontend/shared/utils/languages'
import { DEFAULT_LANGUAGE } from '../../shared/claim'

/**
 * The claim page has a path per language (/de, /fr, /en): / redirects by the
 * browser's languages, keeping the query (an invitation).
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (url.pathname !== '/') {
    return
  }
  const language = (getRequestHeader(event, 'accept-language') ?? '')
    .split(',')
    .map((part) => {
      const [tag = '', quality] = part.trim().split(';q=')
      return {
        tag: tag.slice(0, 2).toLowerCase(),
        quality: Number(quality ?? 1),
      }
    })
    .sort((a, b) => b.quality - a.quality)
    .map(({ tag }) => tag)
    .find(isLanguage)
  return sendRedirect(event, `/${language ?? DEFAULT_LANGUAGE}${url.search}`)
})
