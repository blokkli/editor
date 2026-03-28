/**
 * Identity function that marks a string as containing CSS class names.
 *
 * Use this in <script> sections when referencing Tailwind utility classes
 * outside of template `class` attributes (e.g. classList.add, computed
 * class strings). The build-time mangling system uses `tw()` calls as
 * markers to find and rename utility classes.
 *
 * At runtime this is a no-op — it returns the string unchanged.
 *
 * @example
 * element.classList.add(tw('flex pt-5'))
 * const cls = tw('items-center gap-10')
 */
export function tw(classes: string): string {
  return classes
}
