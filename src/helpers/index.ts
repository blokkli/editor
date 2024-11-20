export function sortObjectKeys(obj: Record<string, any>): Record<string, any> {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  } else if (obj && typeof obj === 'object') {
    const sortedObj: any = {}
    const keys = Object.keys(obj).sort()
    for (const key of keys) {
      sortedObj[key] = sortObjectKeys(obj[key])
    }
    return sortedObj
  }
  return obj
}
