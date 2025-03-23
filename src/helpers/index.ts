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

export function toValidVariableName(input: string): string {
  // Replace non-alphanumeric characters with underscores.
  let result = input.replace(/\W/g, '_')

  // Ensure the first character is not a number.
  if (/^\d/.test(result)) {
    result = '_' + result
  }

  // Handle empty string edge case
  if (result === '') {
    result = '_empty'
  }

  return result
}
