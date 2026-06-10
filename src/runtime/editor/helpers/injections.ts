import type { InjectionKey, Ref } from 'vue'

/**
 * A ref to the nearest popup host element (provided by `<PopupHost>`).
 *
 * Descendants that render floating menus (e.g. the chart editor's color
 * picker) inject this and teleport their content into the host. This lets
 * the menu escape any `overflow: hidden`/`overflow: auto` clipping ancestor
 * while staying inside the popup host's stacking context. When no host is
 * provided, descendants fall back to inline rendering.
 */
export const INJECT_POPUP_HOST = Symbol('blokkli_popup_host') as InjectionKey<
  Ref<HTMLElement | null>
>
