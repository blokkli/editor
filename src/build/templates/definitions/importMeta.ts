import { defineFileTemplate } from '../defineTemplate'

export default defineFileTemplate('import-meta.d.ts', () => {
  return `declare global {
  interface ImportMeta {
    /**
     * Whether this block or fragment component is rendered in the editor
     * bundle.
     *
     * This only works in components that either contain defineBlokkli or
     * defineBlokkliFragment or in components that are imported by any of these
     * components.
     *
     * It will always resolve to "false" if used in any other place.
     */
    readonly blokkliEditing: boolean
  }
}

export {}
`
})
