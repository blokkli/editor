precision mediump float;
varying vec4 v_quad;
varying vec3 v_color;
varying vec4 v_rect_radius;
varying float v_thickness;
varying float v_rect_id;
varying vec2 v_rect_size;
varying vec2 v_rect_center;
varying float v_rect_width;

varying float v_transition;
uniform float u_scale;
uniform float u_dpi;
uniform float u_time;
uniform float u_is_transforming;
uniform vec2 u_resolution;

#define PI (3.141592653589793)

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

float bounceOut(float t) {
  const float a = 4.0 / 11.0;
  const float b = 8.0 / 11.0;
  const float c = 9.0 / 10.0;

  const float ca = 4356.0 / 361.0;
  const float cb = 35442.0 / 1805.0;
  const float cc = 16061.0 / 1805.0;

  float t2 = t * t;

  return t < a
    ? 7.5625 * t2
    : t < b
      ? 9.075 * t2 - 9.9 * t + 3.4
      : t < c
        ? ca * t2 - cb * t + cc
        : 10.8 * t * t - 20.52 * t + 10.72;
}

float exponentialIn(float t) {
  return t == 0.0
    ? t
    : pow(2.0, 10.0 * (t - 1.0));
}

float getStripePattern(vec2 quadRelativePos, float time) {
  float d = 300.0 * u_scale;

  float t = mod(u_time + v_rect_id * 1000.0, 1200.0) / 1200.0;

  float movement = t * 2.0 * PI;

  float normalizedSin =
    (sin((quadRelativePos.y + quadRelativePos.x) / d - movement + v_rect_id) +
      1.0) /
    2.0;

  return normalizedSin * 0.2 + 0.5;
}

vec4 drawBox(float thickness, vec4 bg, vec4 fill, vec4 border, float offset) {
  float borderThickness = max(thickness, 2.0);

  float t = exponentialIn(
    (sin(u_time / 270.0 - v_rect_id + offset) + 1.0) / 2.0
  );

  if (u_is_transforming >= 0.5) {
    borderThickness = (t * 0.7 + 0.5) * borderThickness;
  }
  vec2 size = v_rect_size + borderThickness * 2.0 * v_transition;
  float u_edgeSoftness = 1.0 + v_transition;
  vec4 radius = v_rect_radius * u_scale + vec4(borderThickness);
  vec4 u_cornerRadii = min(radius, min(size.x, size.y) / 2.0) * v_transition;
  float u_borderSoftness = 1.0 + v_transition;

  vec4 r = u_cornerRadii;

  vec2 posRelativeToQuad = gl_FragCoord.xy - v_rect_center;

  float mainDist = sdRoundBox(posRelativeToQuad, size / 2.0, r);
  float innerDist = mainDist;

  float fillAlpha = 1.0 - smoothstep(-u_edgeSoftness, 0.0, innerDist);
  float borderAlpha =
    1.0 - smoothstep(-u_borderSoftness, 0.0, abs(mainDist) - borderThickness);

  vec4 stripedFill = vec4(1.0, 1.0, 1.0, 0.0);
  if (u_is_transforming >= 0.5) {
    stripedFill = fill;
    stripedFill.a = getStripePattern(posRelativeToQuad, u_time);
    borderAlpha *= t + 0.6;
  }

  vec4 res_with_fill = mix(bg, stripedFill, fillAlpha * stripedFill.a);
  return mix(res_with_fill, border, borderAlpha * border.a);
}

void main() {
  vec4 borderBottom = drawBox(
    v_transition * (v_thickness * 2.0),
    vec4(v_color, 0.0),
    vec4(v_color, 0.5),
    vec4(v_color, 0.4),
    0.0
  );

  vec4 borderTop = drawBox(
    v_thickness,
    vec4(v_color, 0.0),
    vec4(v_color, 0.0),
    vec4(v_color, 1.0),
    -0.2
  );

  vec4 finalColor = mix(borderBottom, borderTop, borderTop.a);
  gl_FragColor = finalColor;
}
