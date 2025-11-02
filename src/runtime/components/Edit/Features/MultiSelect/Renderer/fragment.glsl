#version 300 es

precision highp float;

in float v_intersecting;
in float v_is_select_rect;
in vec4 v_quad;
in vec3 v_color_default;
in vec3 v_color_active;
in float v_rect_id;

// Optimized inputs - values computed once per vertex instead of per pixel
in vec2 v_size;
in vec2 v_location;
in float v_thickness;
in float v_edge_softness;
in float v_radius;

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

  // Selectable blocks - using pre-computed values from vertex shader
  float distance = roundedBoxSDF(
    v_location - gl_FragCoord.xy,
    v_size / 2.0,
    v_radius
  );

  bool is_intersecting = v_intersecting >= 0.5;

  vec3 color = is_intersecting ? v_color_active : v_color_default;
  float mixedDistance = is_intersecting ? distance : abs(distance);

  float smoothedAlpha =
    1.0 - smoothstep(-v_edge_softness, v_edge_softness, mixedDistance - v_thickness);

  fragColor = vec4(
    color,
    is_intersecting
      ? smoothedAlpha - 0.7
      : smoothedAlpha
  );
}
