type NormalizeToArray<T> =
  | undefined
  | null
  | void
  | T
  | T[]
  | Promise<T | T[] | undefined | null>

export async function normalizeToArray<T>(
  input: NormalizeToArray<T>,
): Promise<T[]> {
  if (input === null || input === undefined) {
    return []
  }

  if (input instanceof Promise) {
    const resolved = await input

    if (resolved === null || resolved === undefined) {
      return []
    }

    return Array.isArray(resolved) ? resolved : [resolved]
  }

  return Array.isArray(input) ? input : [input as T]
}
