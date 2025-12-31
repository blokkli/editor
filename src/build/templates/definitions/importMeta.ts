import { defineFileTemplate } from '../defineTemplate'

export default defineFileTemplate('import-meta.d.ts', () => {
  return `declare global {
  interface ImportMeta {
    /**
     * Whether this block or fragment component is rendered in the editor
     * bundle.
     *
     * This may ONLY used in components that contain "defineBlokkli" or "defineBlokkliFragment".
     * It will always resolve to "false" if used in any other component.
     */
    readonly blokkliEditing: boolean
  }
}

export {}
`
})
