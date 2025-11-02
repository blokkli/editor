#version 300 es

precision highp float;

in vec4 v_quad;
in float v_rect_type;
in vec3 v_color;
in vec2 v_rect_size;
in vec2 v_rect_center;

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
  float borderThickness = 2.0 * u_dpi;
  vec2 size = v_rect_size;
  vec4 radius = vec4(0.0); // No rounded corners for now

  vec2 posRelativeToQuad = gl_FragCoord.xy - v_rect_center;

  float mainDist = sdRoundBox(posRelativeToQuad, size / 2.0, radius);

  // Calculate fill alpha (inside the rectangle)
  float fillAlpha = 1.0 - smoothstep(-1.0, 0.0, mainDist);

  // Calculate border alpha (edge of the rectangle)
  float borderAlpha =
    1.0 - smoothstep(-1.0, 0.0, abs(mainDist) - borderThickness);

  // Background (transparent)
  vec4 bg = vec4(0.0, 0.0, 0.0, 0.0);

  // Fill (semi-transparent)
  vec4 fill = vec4(v_color, 0.3);

  // Border (fully opaque)
  vec4 border = vec4(v_color, 1.0);

  // Mix background with fill
  vec4 res_with_fill = mix(bg, fill, fillAlpha);

  // Mix with border
  vec4 finalColor = mix(res_with_fill, border, borderAlpha * border.a);

  fragColor = finalColor;
}
