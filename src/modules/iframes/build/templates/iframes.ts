import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { IframesModuleOptions } from '../types'

export default function (options: IframesModuleOptions) {
  return defineCodeTemplate(
    'iframes-config',
    () => {
      return `
export const VIEWPORTS = ${JSON.stringify(options.viewports)}
`
    },
    () => {
      return `
import type { IframeViewport } from '#blokkli/iframes/types'

export const VIEWPORTS: Record<string, IframeViewport>
`
    },
    {
      context: 'both',
      write: true,
    },
  )
}
