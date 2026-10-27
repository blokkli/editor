import {
  isLanguage,
  type Language,
} from '../../../frontend/shared/utils/languages'
import { DEFAULT_LANGUAGE } from '../../shared/utils/claim'

/**
 * The first of the browser's languages (Accept-Language) that the claim page
 * has, else German.
 */
export function preferredLanguage(header: string | undefined): Language {
  const language = (header ?? '')
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
  return language ?? DEFAULT_LANGUAGE
}
