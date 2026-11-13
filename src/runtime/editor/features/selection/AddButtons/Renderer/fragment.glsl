#version 300 es

precision highp float;

flat in vec4 v_rect;
flat in vec4 v_style;
in vec2 v_position;

uniform float u_dpi;
// Tabs, the band behind a hovered tab, the border and plus of knobs.
uniform vec3 u_color_accent;
// Hovered tabs.
uniform vec3 u_color_accent_hover;
// End bars, dashed outlines and areas.
uniform vec3 u_color_line;
// Hovered knobs.
uniform vec3 u_color_tint;

out vec4 fragColor;

const vec3 WHITE = vec3(1.0);

// The tab's size at full scale, from the geometry module.
const float TAB_DEPTH = __TAB_DEPTH__;
const float TAB_RADIUS = __TAB_RADIUS__;
const float TAB_FLARE = __TAB_FLARE__;
const float BAND_OPACITY = __BAND_OPACITY__;

// Sides: 0 top, 1 right, 2 bottom, 3 left.

// How much of a device pixel at this distance (CSS pixels) is inside a shape.
float coverage(float d) {
  return clamp(0.5 - d * u_dpi, 0.0, 1.0);
}

float sdBox(vec2 p, vec2 halfSize) {
  vec2 q = abs(p) - halfSize;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0));
}

// A box with a radius per corner, y pointing down: top left, top right,
// bottom right, bottom left.
float sdRoundBox(vec2 p, vec2 halfSize, vec4 radii) {
  float r;
  if (p.x < 0.0) {
    r = p.y < 0.0 ? radii.x : radii.w;
  } else {
    r = p.y < 0.0 ? radii.y : radii.z;
  }
  vec2 q = abs(p) - halfSize + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float sdPlus(vec2 p, float arm, float halfThickness) {
  return min(
    sdBox(p, vec2(arm, halfThickness)),
    sdBox(p, vec2(halfThickness, arm))
  );
}

vec4 over(vec4 top, vec4 bottom) {
  float a = top.a + bottom.a * (1.0 - top.a);
  if (a <= 0.0) {
    return vec4(0.0);
  }
  vec3 rgb = (top.rgb * top.a + bottom.rgb * bottom.a * (1.0 - top.a)) / a;
  return vec4(rgb, a);
}

// A tab attached to an edge: a body with rounded outer corners, and concave
// curves on both sides where it meets the edge.
vec4 drawTab(vec2 p, vec2 halfSize, int side, bool hovered) {
  // The middle of the flat side, the direction the tab points to, and the
  // direction along the edge.
  vec2 base;
  vec2 outward;
  vec2 along;
  if (side == 0) {
    base = vec2(0.0, halfSize.y);
    outward = vec2(0.0, -1.0);
    along = vec2(1.0, 0.0);
  } else if (side == 2) {
    base = vec2(0.0, -halfSize.y);
    outward = vec2(0.0, 1.0);
    along = vec2(1.0, 0.0);
  } else if (side == 3) {
    base = vec2(halfSize.x, 0.0);
    outward = vec2(-1.0, 0.0);
    along = vec2(0.0, 1.0);
  } else {
    base = vec2(-halfSize.x, 0.0);
    outward = vec2(1.0, 0.0);
    along = vec2(0.0, 1.0);
  }

  bool isHorizontal = side == 0 || side == 2;
  float depth = isHorizontal ? halfSize.y * 2.0 : halfSize.x * 2.0;
  float halfLength = isHorizontal ? halfSize.x : halfSize.y;
  // The tab scales in after changing options.
  float scale = depth / TAB_DEPTH;
  float flare = TAB_FLARE * scale;
  float radius = TAB_RADIUS * scale;
  float halfWidth = halfLength - flare;

  // The same for every side: u along the edge, v from the edge (0) outwards
  // (negative), like a tab pointing up.
  vec2 q = vec2(dot(p - base, along), -dot(p - base, outward));
  vec2 bodyCenter = vec2(0.0, -depth * 0.5);

  float body = sdRoundBox(
    q - bodyCenter,
    vec2(halfWidth, depth * 0.5),
    vec4(radius, radius, 0.0, 0.0)
  );
  float u = abs(q.x);
  float flareBox = sdBox(
    vec2(u - (halfWidth + flare * 0.5), q.y + flare * 0.5),
    vec2(flare * 0.5)
  );
  float flareCircle = length(vec2(u - (halfWidth + flare), q.y + flare)) - flare;
  float d = min(body, max(flareBox, -flareCircle));

  vec3 color = hovered ? u_color_accent_hover : u_color_accent;
  color = mix(
    color,
    WHITE,
    coverage(sdPlus(q - bodyCenter, depth * 0.28, 1.0))
  );

  return vec4(color, coverage(d));
}

// A round knob with a plus: white with an accent border.
vec4 drawKnob(vec2 p, vec2 halfSize, bool hovered) {
  float radius = min(halfSize.x, halfSize.y);
  float d = length(p) - radius;

  vec3 color = hovered ? u_color_tint : WHITE;
  color = mix(color, u_color_accent, coverage(-(d + 2.0)));
  color = mix(color, u_color_accent, coverage(sdPlus(p, radius * 0.45, 1.0)));

  return vec4(color, coverage(d));
}

// The band behind a hovered tab: where the new block goes.
vec4 drawBand(vec2 p, vec2 halfSize) {
  float radius = min(2.0, min(halfSize.x, halfSize.y));
  float d = sdRoundBox(p, halfSize, vec4(radius));
  return vec4(u_color_accent, coverage(d) * BAND_OPACITY);
}

// An end bar with a white halo.
vec4 drawBar(vec2 p, vec2 halfSize, bool hovered) {
  float radius = min(2.0, min(halfSize.x, halfSize.y));
  float d = sdRoundBox(p, halfSize, vec4(radius));

  return vec4(
    mix(WHITE, u_color_line, coverage(d)),
    coverage(d - 1.5) * (hovered ? 1.0 : 0.75)
  );
}

// A dashed line just inside the edge of a box: 6px dashes, 4px gaps, laid
// out from the centre of the box along its nearest edge.
float dashedBorder(vec2 p, vec2 halfSize) {
  float radius = min(3.0, min(halfSize.x, halfSize.y));
  float d = sdRoundBox(p, halfSize, vec4(radius));
  float line = coverage(abs(d + 1.0) - 0.75);
  bool isOnSide = halfSize.x - abs(p.x) < halfSize.y - abs(p.y);
  float along = isOnSide ? p.y : p.x;
  return line * step(mod(along, 10.0), 6.0);
}

vec4 drawOutline(vec2 p, vec2 halfSize) {
  return vec4(u_color_line, dashedBorder(p, halfSize) * 0.8);
}

// An empty field: a faint fill and a dashed border.
vec4 drawArea(vec2 p, vec2 halfSize, bool hovered) {
  float radius = min(3.0, min(halfSize.x, halfSize.y));
  float d = sdRoundBox(p, halfSize, vec4(radius));
  vec4 fill = vec4(u_color_line, coverage(d) * (hovered ? 0.14 : 0.07));
  vec4 border = vec4(
    u_color_line,
    dashedBorder(p, halfSize) * (hovered ? 0.9 : 0.6)
  );
  return over(border, fill);
}

void main() {
  vec2 halfSize = v_rect.zw * 0.5;
  vec2 p = v_position - (v_rect.xy + halfSize);
  float type = v_style.x;
  int side = int(v_style.y + 0.5);
  bool hovered = v_style.z > 0.5;

  vec4 color;
  if (type < 1.5) {
    color = drawTab(p, halfSize, side, hovered);
  } else if (type < 2.5) {
    color = drawKnob(p, halfSize, hovered);
  } else if (type < 3.5) {
    color = drawBand(p, halfSize);
  } else if (type < 4.5) {
    color = drawBar(p, halfSize, hovered);
  } else if (type < 5.5) {
    color = drawOutline(p, halfSize);
  } else {
    color = drawArea(p, halfSize, hovered);
  }

  color.a *= v_style.w;
  if (color.a < 0.002) {
    discard;
  }
  fragColor = color;
}
