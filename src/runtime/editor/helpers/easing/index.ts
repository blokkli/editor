export function easeOutElastic(
  time: number,
  startIntensity = 2,
  elasticPeriod = 0.5,
): number {
  // Return when at start or end of animation.
  if (time === 0 || time === 1) {
    return time
  }

  const modifiedTime = Math.pow(time, startIntensity)
  const amplitudeAdjustment = (elasticPeriod / (2 * Math.PI)) * Math.asin(1)

  return (
    Math.pow(2, -10 * modifiedTime) *
      Math.sin(
        ((modifiedTime - amplitudeAdjustment) * (2 * Math.PI)) / elasticPeriod,
      ) +
    1
  )
}

export function easeOutSine(x: number): number {
  return Math.sin((x * Math.PI) / 2)
}

export function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x)
}
