export function sortObjectKeys(obj: Record<string, any>): Record<string, any> {
  const sortedKeys = Object.keys(obj).sort()
  const sortedObj: Record<string, any> = {}
  sortedKeys.forEach((key) => {
    const value = obj[key]
    sortedObj[key] =
      typeof value === 'object' && value !== null
        ? sortObjectKeys(value)
        : value
  })
  return sortedObj
}
