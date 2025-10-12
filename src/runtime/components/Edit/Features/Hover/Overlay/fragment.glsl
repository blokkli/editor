precision highp float;

varying vec4 v_quad;
varying vec4 v_rect_radius;
varying vec2 v_rect_size;
varying vec2 v_rect_center;
varying float v_rect_type;
varying vec2 v_quad_artboard_pos;

uniform float u_dpi;
uniform float u_scale;
uniform float u_offset_x;
uniform float u_offset_y;
uniform vec2 u_resolution;
uniform vec3 u_color_mono;
uniform vec3 u_color_accent;
uniform vec3 u_color_teal;
uniform vec3 u_color_white;

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
  vec2 size = v_rect_size;
  vec4 u_cornerRadii = min(v_rect_radius, min(size.x, size.y) / 2.0);
  vec4 r = u_cornerRadii;

  vec2 posRelativeToQuad = gl_FragCoord.xy - v_rect_center;

  float mainDist = sdRoundBox(posRelativeToQuad, size / 2.0, r);

  // For editable fields (type 2), render a fill instead of border
  if (v_rect_type > 1.5 && v_rect_type < 2.5) {
    float u_edgeSoftness = 1.0;
    float fillAlpha = 1.0 - smoothstep(-u_edgeSoftness, 0.0, mainDist);
    vec4 fillColor = vec4(u_color_teal, 0.2);
    gl_FragColor = vec4(fillColor.rgb, fillAlpha * fillColor.a);
    return;
  }

  // For blocks (type 0, 1, and 3), render border
  float borderThickness = 1.0 * u_dpi;
  float u_borderSoftness = 0.0;

  float borderAlpha =
    1.0 - smoothstep(-u_borderSoftness, 0.0, abs(mainDist) - borderThickness);

  // Select color based on type: 0 = mono, 1 = accent, 3 = white (inverted)
  vec3 color = u_color_mono;
  if (v_rect_type > 2.5) {
    color = u_color_white;
  } else if (v_rect_type > 0.5) {
    color = u_color_accent;
  }

  // Apply dashed pattern for all blocks
  // Calculate actual perimeter distance for proper dashing
  vec2 halfSize = size / 2.0;
  vec2 p = posRelativeToQuad;
  vec2 absP = abs(p);

  // Determine which edge/corner we're on and calculate perimeter distance
  float perimeterDistance = 0.0;

  // Check which edge we're closest to
  float dx = absP.x - halfSize.x;
  float dy = absP.y - halfSize.y;

  if (dy > dx) {
    // Top or bottom edge
    if (p.y > 0.0) {
      // Bottom edge: start at bottom-left, go right
      perimeterDistance = size.x + size.y + (p.x + halfSize.x);
    } else {
      // Top edge: start at top-right, go left
      perimeterDistance = size.x + (halfSize.x - p.x);
    }
  } else {
    // Left or right edge
    if (p.x > 0.0) {
      // Right edge: start at top-right, go down
      perimeterDistance = p.y + halfSize.y;
    } else {
      // Left edge: start at bottom-left, go up
      perimeterDistance = size.x + size.y + size.x + (halfSize.y - p.y);
    }
  }

  float dashWidth = 10.0 * u_dpi;
  float dashGap = 10.0 * u_dpi;
  float dashCycle = dashWidth + dashGap;

  float dashPosition = mod(perimeterDistance, dashCycle);
  float dashFactor = step(dashPosition, dashWidth);

  // Only show dashes
  borderAlpha *= dashFactor;

  vec4 borderColor = vec4(color, 1.0);
  vec4 finalColor = mix(
    vec4(0.0, 0.0, 0.0, 0.0),
    borderColor,
    borderAlpha * borderColor.a
  );

  gl_FragColor = finalColor;
}
