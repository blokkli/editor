#version 300 es

precision highp float;

in vec4 v_quad;
in float v_rect_type;
in vec3 v_color;
in vec2 v_rect_size;
in vec2 v_rect_center;
in float v_opacity;
in float v_border_opacity;
in float v_border_factor;
in float v_fill_opacity;

out vec4 fragColor;

uniform float u_dpi;

int pseudoQuadrant(vec2 p) {
  return int(floor(step(0.0, p.x) + 2.0 * step(0.0, -p.y)));
}

float sdRoundBox(vec2 p, vec2 b, vec4 radii) {
  int idx = pseudoQuadrant(p);
  float cr;
  if (idx == 0) cr = radii[0];
  else if (idx == 1) cr = radii[1];
  else if (idx == 2) cr = radii[3];
  else cr = radii[2];
  vec2 q = abs(p) - b + cr;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - cr;
}

void main() {
  float borderThickness = 2.0 * u_dpi * v_border_factor;
  vec2 size = v_rect_size;
  vec4 radius = vec4(4.0 * u_dpi * v_border_factor);

  vec2 posRelativeToQuad = gl_FragCoord.xy - v_rect_center;

  // Outer rounded rectangle (includes border)
  float outerDist = sdRoundBox(posRelativeToQuad, size / 2.0, radius);

  // Inner rounded rectangle (fill area, excluding border)
  float innerDist = sdRoundBox(
    posRelativeToQuad,
    size / 2.0 - borderThickness,
    radius - borderThickness
  );

  // Calculate fill alpha (inside the inner rectangle)
  float fillAlpha = 1.0 - smoothstep(-1.0, 0.0, innerDist);

  // Calculate border alpha (between outer and inner)
  float outerAlpha = 1.0 - smoothstep(-1.0, 0.0, outerDist);
  float borderAlpha = outerAlpha * (1.0 - fillAlpha);

  // Background (transparent)
  vec4 bg = vec4(0.0, 0.0, 0.0, 0.0);

  // Fill (semi-transparent) - use fill opacity from vertex shader
  vec4 fill = vec4(v_color, v_fill_opacity * v_opacity);

  // Border - use opacity calculated in vertex shader
  vec4 border = vec4(v_color, v_border_opacity);

  // Mix background with fill
  vec4 res_with_fill = mix(bg, fill, fillAlpha);

  // Mix with border
  vec4 finalColor = mix(res_with_fill, border, borderAlpha);

  fragColor = finalColor;
}
