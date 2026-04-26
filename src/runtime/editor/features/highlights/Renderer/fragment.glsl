#version 300 es

precision highp float;

in vec4 v_quad;
in vec3 v_color1;
in vec3 v_color2;
in vec2 v_rect_size;
in vec2 v_rect_center;
in float v_border_factor;
in vec2 v_rect_size_artboard;
in float v_active;

out vec4 fragColor;

uniform float u_dpi;
uniform float u_scale;
uniform float u_opacity;

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
  float borderThickness = (1.5 + v_active * 1.5) * u_dpi * v_border_factor;
  vec2 size = v_rect_size;
  vec4 radius = vec4(0.0);
  float borderSoftness = 1.0;

  vec2 posRelativeToQuad = gl_FragCoord.xy - v_rect_center;

  // Signed distance to the outer edge of the border.
  float mainDist = sdRoundBox(posRelativeToQuad, size / 2.0, radius);

  // Border alpha (band around the edge).
  float borderAlpha =
    1.0 -
    smoothstep(-borderSoftness, 0.0, abs(mainDist) - borderThickness);

  // Determine border color: striped if two different colors, solid otherwise.
  // Calculate perimeter distance in artboard space for scale-independent stripes.
  vec2 viewportToArtboardRatio = v_rect_size_artboard / v_rect_size;
  vec2 posRelativeToQuad_artboard = posRelativeToQuad * viewportToArtboardRatio;
  vec2 halfSize_artboard = v_rect_size_artboard / 2.0;
  vec2 posFromTopLeft = posRelativeToQuad_artboard + halfSize_artboard;
  vec2 p = clamp(posFromTopLeft, vec2(0.0), v_rect_size_artboard);

  float perimeterDistance = 0.0;
  float width = v_rect_size_artboard.x;
  float height = v_rect_size_artboard.y;

  vec2 absP = abs(posRelativeToQuad_artboard);
  float dx = absP.x - halfSize_artboard.x;
  float dy = absP.y - halfSize_artboard.y;

  if (dy > dx) {
    if (posRelativeToQuad_artboard.y > 0.0) {
      perimeterDistance = p.x;
    } else {
      perimeterDistance = height + p.x;
    }
  } else {
    if (posRelativeToQuad_artboard.x < 0.0) {
      perimeterDistance = height - p.y;
    } else {
      perimeterDistance = width + (height - p.y);
    }
  }

  // Stripe pattern: alternate between color1 and color2 along perimeter.
  float stripeLength = 14.0 - u_scale;
  float stripePhase = mod(perimeterDistance, stripeLength * 2.0);
  vec3 borderColor = stripePhase < stripeLength ? v_color1 : v_color2;

  vec4 finalColor = vec4(borderColor, borderAlpha);
  finalColor.a *= u_opacity;
  fragColor = finalColor;
}
