/**
 * Rename a single CSS class name to avoid collisions with host projects.
 *
 * Classes that already belong to blökkli (equal to 'bk' or starting with
 * 'bk-') are returned unchanged. Everything else is prefixed with '_bk_'.
 */
export function mangleClassName(name: string): string {
  if (name === 'bk' || name.startsWith('bk-')) return name
  return '_bk_' + name
}

/**
 * Rename every class token in a space-separated class string.
 */
export function mangleClassString(str: string): string {
  return str.split(/\s+/).filter(Boolean).map(mangleClassName).join(' ')
}
