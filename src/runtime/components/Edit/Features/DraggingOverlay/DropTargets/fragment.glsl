precision mediump float;

varying float v_intersecting;
varying vec4 v_quad;
varying vec3 v_color;

uniform float u_scale;
uniform float u_dpi;
uniform vec2 u_resolution;

float roundedBoxSDF(vec2 CenterPosition, vec2 Size, float Radius) {
  return length(max(abs(CenterPosition) - Size + Radius, 0.0)) - Radius;
}

void main() {
  float radiusBase = 4.0 * u_scale;
  float thickness = max(min(1.0 * u_scale, 3.0), 0.5);

  // Calculate the resulting inset so that we draw the rounded box and border *inside* the quad (vs. that it would bleed outside the quad).
  float inset = max(min(2.0 * u_scale, 1.0), 2.0) * thickness;

  // Rectangle dimensions with inset.
  float u_rect_x = v_quad.x + inset;
  float u_rect_y = v_quad.y + inset;
  float u_rectWidth = v_quad.z - 2.0 * inset;
  float u_rectHeight = v_quad.w - 2.0 * inset;

  vec2 size = vec2(u_rectWidth, u_rectHeight);

  // Center position of the rectangle.
  vec2 offsetPosition = vec2(u_rect_x + size.x / 2.0, u_rect_y + size.y / 2.0);
  vec2 location = offsetPosition;

  // Make sure the edges of the border are not too harsh.
  float edgeSoftness = 0.5 * u_dpi;

  float borderWidth = 2.0 * u_scale * u_dpi;

  // Different radius for inner and outer.
  float radiusOutside =
    min(radiusBase * u_dpi, min(size.x, size.y)) + thickness;
  float radiusInside = radiusOutside - borderWidth;

  vec2 sizeInner = size - 2.0 * borderWidth;

  // Compute different distance for inside and outside.
  float distanceOuter = roundedBoxSDF(
    location - gl_FragCoord.xy,
    size / 2.0,
    radiusOutside
  );
  float distanceInner = roundedBoxSDF(
    location - gl_FragCoord.xy,
    sizeInner / 2.0,
    radiusInside
  );

  float alphaOuter =
    1.0 - smoothstep(-edgeSoftness, edgeSoftness, distanceOuter - thickness);
  float alphaInner =
    1.0 - smoothstep(-edgeSoftness, edgeSoftness, distanceInner - thickness);

  // Alpha value for the border.
  float alphaBorder = clamp(alphaOuter - alphaInner, 0.0, 1.0);

  // Adjust alphas based on intersection.
  float adjustedAlphaFill =
    v_intersecting >= 0.5
      ? alphaInner * 0.9
      : alphaInner - 0.8;

  if (alphaBorder > 0.0) {
    gl_FragColor = vec4(v_color, 1.0);
    return;
  } else if (adjustedAlphaFill > 0.0) {
    gl_FragColor = vec4(v_color, adjustedAlphaFill);
    return;
  }

  discard;
}
