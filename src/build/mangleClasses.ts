/**
 * Rename a single CSS class name to avoid collisions with host projects.
 *
 * Classes that already belong to blökkli (equal to 'bk', starting with
 * 'bk-', or already mangled with the '_bk_' prefix) are returned unchanged.
 * The `_bk_` skip makes the mangler idempotent, so a second pass over
 * already-mangled source (e.g. when HMR persisted transformed code, or
 * when `mangle-dist.ts` runs on dist files that the Vite plugin already
 * touched) does not produce `_bk__bk_*` collisions.
 */
export function mangleClassName(name: string): string {
  if (name === 'bk' || name.startsWith('bk-') || name.startsWith('_bk_')) {
    return name
  }
  return '_bk_' + name
}

/**
 * Rename every class token in a space-separated class string.
 */
export function mangleClassString(str: string): string {
  return str.split(/\s+/).filter(Boolean).map(mangleClassName).join(' ')
}
