export function asValidNumber(v: unknown, defaultValue: number): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }

  return defaultValue
}

export function modulo(n: number, m: number) {
  return ((n % m) + m) % m
}

export const lerp = (s: number, e: number, t: number) => s * (1 - t) + e * t
