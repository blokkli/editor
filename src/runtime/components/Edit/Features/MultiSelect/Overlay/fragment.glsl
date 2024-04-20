#version 300 es

precision mediump float;

in float v_intersecting;
in float v_is_select_rect;
in vec4 v_quad;
in vec3 v_color_default;
in vec3 v_color_active;
in float v_rect_id;

out vec4 fragColor;

uniform float u_time;
uniform float u_scale;
uniform float u_dpi;
uniform float u_offset_x;
uniform float u_offset_y;
uniform vec2 u_resolution;
uniform vec4 u_select_rect;

float roundedBoxSDF(vec2 CenterPosition, vec2 Size, float Radius) {
  return length(max(abs(CenterPosition) - Size + Radius, 0.0)) - Radius;
}

vec4 marchingAnts() {
  float speed = 100.0 * u_dpi;
  float count = 8.0;
  float width = 2.0 * u_dpi;
  float time = u_time * speed;
  float phase = time * -1.0;
  float stripePosition = mod(
    (gl_FragCoord.x - gl_FragCoord.y + phase) / width,
    count
  );
  float factor = step(count * 0.5, stripePosition);
  vec3 col = vec3(factor);
  return vec4(col, 1.0 - col / 5.0);
}

void main() {
  // Marching ants selection rectangle.
  if (v_is_select_rect > 0.5) {
    fragColor = marchingAnts();
    return;
  }

  // Selectable blocks.
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

  fragColor = vec4(
    color,
    is_intersecting
      ? smoothedAlpha - 0.7
      : smoothedAlpha
  );
}
