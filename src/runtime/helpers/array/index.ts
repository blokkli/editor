export function getArrayDiff(a: string[], b: string[]): string[] {
  const setA = new Set(a)
  return b.filter((item) => !setA.has(item))
}
