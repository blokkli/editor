export function asValidNumber(v: unknown, defaultValue: number): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }

  return defaultValue
}

export function modulo(n: number, m: number) {
  return ((n % m) + m) % m
}
