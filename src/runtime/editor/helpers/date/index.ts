export function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(+d)
}
