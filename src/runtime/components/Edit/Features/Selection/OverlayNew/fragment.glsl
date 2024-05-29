#version 300 es

precision mediump float;

in vec4 v_quad;
in vec3 v_color;
in vec4 v_rect_radius;
in float v_thickness;
in vec2 v_rect_size;
in vec2 v_rect_center;
in float v_transition;
in float v_is_hovered;
in float v_is_selected;

uniform float u_scale;
uniform float u_dpi;
uniform vec2 u_resolution;

out vec4 fragColor;

int pseudoQuadrant(vec2 p) {
  return int(floor(step(0.0, p.x) + 2.0 * step(0.0, -p.y)));
}

float sdRoundBox(vec2 p, vec2 b, vec4 radii) {
  int idx = pseudoQuadrant(p);
  float cr;

  // Use correct radius. Bottom left and bottom right are flipped.
  if (idx == 0) cr = radii[0];
  else if (idx == 1) cr = radii[1];
  else if (idx == 2) cr = radii[3];
  else cr = radii[2];

  vec2 q = abs(p) - b + cr;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - cr;
}

vec4 drawBox(float thickness, vec4 bg, vec4 fill, vec4 border) {
  float progress = gl_FragCoord.y / u_resolution.y;
  float u_borderThickness = max(thickness, 2.0); // The border size (in pixels)
  // vec2 size = v_rect_size + u_borderThickness * 2.0;
  vec2 size = v_rect_size + u_borderThickness * 2.0 * v_transition;

  float u_edgeSoftness = 1.0 + v_transition;
  vec4 radius = v_rect_radius * u_scale + vec4(u_borderThickness);
  vec4 u_cornerRadii = min(radius, min(size.x, size.y) / 2.0) * v_transition;

  // Border
  float u_borderSoftness = 1.0 + v_transition; // How soft the border should be (in pixels)

  // =========================================================================

  vec4 r = u_cornerRadii; // Animated corner radii

  // -------------------------------------------------------------------------

  // Fill SDF
  float distance =
    sdRoundBox(gl_FragCoord.xy - v_rect_center, size / 2.0, r) +
    u_borderThickness;

  // AA
  float smoothedAlpha = 1.0 - smoothstep(0.0, u_edgeSoftness, distance);

  // -------------------------------------------------------------------------
  // Border: expanded from fill SDF, with AA
  float borderAlpha =
    1.0 -
    smoothstep(
      u_borderThickness - u_borderSoftness,
      u_borderThickness,
      abs(distance - u_borderThickness)
    );

  // -------------------------------------------------------------------------
  // Apply colors layer-by-layer: background <- rect <- border.

  // Blend background with fill
  vec4 res_shadow_with_rect_color = mix(bg, fill, min(fill.a, smoothedAlpha));

  // Blend (background+fill) with border
  return mix(res_shadow_with_rect_color, border, min(border.a, borderAlpha));
}

void main() {
  // Comment out for vertex debugging.
  // fragColor = vec4(1.0, 0.0, 0.0, 1.0);
  // return;
  if (v_is_selected > 0.5) {
    // Red border that should be below the blue border.
    vec4 borderBottom = drawBox(
      v_transition * (v_thickness * 2.0),
      vec4(v_color, 0.0),
      vec4(v_color, 0.5 - 0.5 * v_transition),
      vec4(v_color, 0.4)
    );

    // Blue border that should be on top of the red border.
    vec4 borderTop = drawBox(
      v_thickness,
      vec4(v_color, 0.0),
      vec4(v_color, 0.0),
      vec4(v_color, 1.0)
    );

    vec4 finalColor = mix(borderBottom, borderTop, borderTop.a);
    fragColor = finalColor;
    return;
  }

  // Hover state.
  fragColor = drawBox(
    1.0,
    vec4(v_color, 0.0),
    vec4(v_color, 0.0),
    vec4(v_color, 0.8)
  );
}
