precision mediump float;

varying float v_intersecting;
varying vec4 v_quad;
varying vec3 v_color_default;
varying vec3 v_color_active;

uniform float u_scale;
uniform float u_dpi;
uniform vec2 u_resolution;

float roundedBoxSDF(vec2 CenterPosition, vec2 Size, float Radius) {
  return length(max(abs(CenterPosition) - Size + Radius, 0.0)) - Radius;
}

void main() {
  float radius_base = 2.0 * u_scale;
  float thickness = max(min(1.0 * u_scale, 3.0), 0.5);
  float inset = max(min(2.0 * u_scale, 1.0), 2.0) * thickness;

  float u_rect_x = v_quad.x + inset;
  float u_rect_y = v_quad.y + inset;
  float u_rectWidth = v_quad.z - 2.0 * inset;
  float u_rectHeight = v_quad.w - 2.0 * inset;

  vec2 size = vec2(u_rectWidth, u_rectHeight);

  float x = u_rect_x;
  float y = u_rect_y;
  vec2 offsetPosition = vec2(x + size.x / 2.0, y + size.y / 2.0);

  vec2 location = vec2(offsetPosition);

  float edgeSoftness = 1.0 * u_dpi;
  float radius =
    min(radius_base * u_dpi, min(size.x, size.y) / 2.0) + thickness * 2.0;

  float distance = roundedBoxSDF(
    location - gl_FragCoord.xy,
    size / 2.0,
    radius
  );

  bool is_intersecting = v_intersecting >= 0.5;

  vec3 color = is_intersecting ? v_color_active : v_color_default;
  float mixedDistance = is_intersecting ? distance : abs(distance);

  float smoothedAlpha =
    1.0 - smoothstep(-edgeSoftness, edgeSoftness, mixedDistance - thickness);

  gl_FragColor = vec4(
    color,
    is_intersecting
      ? smoothedAlpha - 0.4
      : smoothedAlpha
  );
}
