/**
 * The point of an image that crops keep: its offsets from the image's left and
 * top edges, in whole percent.
 */
export type FocalPoint = { x: number; y: number }

/**
 * Round a share of the image's width or height to a whole percent, within the
 * image.
 */
export function toPercent(share: number): number {
  return Math.min(100, Math.max(0, Math.round(share * 100)))
}

/**
 * Read a focal point's value, "x,y". Anything else is the image's centre.
 */
export function parseFocalPoint(value: unknown): FocalPoint {
  const match =
    typeof value === 'string'
      ? /^\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*$/.exec(value)
      : null
  if (!match) {
    return { x: 50, y: 50 }
  }
  return {
    x: toPercent(Number(match[1]) / 100),
    y: toPercent(Number(match[2]) / 100),
  }
}

/**
 * Write a focal point as its value, "x,y".
 */
export function formatFocalPoint(point: FocalPoint): string {
  return `${point.x},${point.y}`
}

/**
 * Move a focal point by a key: an arrow moves it by a percent, or by ten with
 * Shift. Other keys don't move it.
 */
export function moveFocalPoint(
  point: FocalPoint,
  key: string,
  shift: boolean,
): FocalPoint | null {
  const step = shift ? 10 : 1
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }
  const move = moves[key]
  if (!move) {
    return null
  }
  return {
    x: toPercent((point.x + move[0]) / 100),
    y: toPercent((point.y + move[1]) / 100),
  }
}
