precision highp float;

varying vec4 v_quad;
varying vec4 v_rect_radius;
varying vec2 v_rect_size;
varying vec2 v_rect_center;
varying float v_rect_type;
varying vec2 v_quad_artboard_pos;
// Optimized varyings calculated in vertex shader
varying vec4 v_corner_radii;
varying float v_border_thickness;
varying vec2 v_half_size;
varying vec3 v_color;
varying float v_dash_cycle;

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
  vec2 posRelativeToQuad = gl_FragCoord.xy - v_rect_center;

  float mainDist = sdRoundBox(posRelativeToQuad, v_half_size, v_corner_radii);

  // For editable fields (type 2), render both fill and solid border
  if (v_rect_type > 1.5 && v_rect_type < 2.5) {
    float u_edgeSoftness = 1.0;
    float u_borderSoftness = 1.0;

    // Render fill
    float fillAlpha = 1.0 - smoothstep(-u_edgeSoftness, 0.0, mainDist);
    vec4 fillColor = vec4(v_color, 0.2);

    // Render solid border (non-dashed)
    float borderAlpha =
      1.0 - smoothstep(-u_borderSoftness, 0.0, abs(mainDist) - v_border_thickness);
    vec4 borderColor = vec4(v_color, 1.0);

    // Combine fill and border
    vec4 combined = mix(
      vec4(fillColor.rgb, fillAlpha * fillColor.a),
      borderColor,
      borderAlpha * borderColor.a
    );

    combined.a *= u_opacity;
    gl_FragColor = combined;
    return;
  }

  // For blocks (type 0, 1, and 3), render border
  float u_borderSoftness = 1.0;

  float borderAlpha =
    1.0 - smoothstep(-u_borderSoftness, 0.0, abs(mainDist) - v_border_thickness);

  // Apply dashed pattern for all blocks
  // Calculate actual perimeter distance for proper dashing
  vec2 p = posRelativeToQuad;
  vec2 absP = abs(p);

  // Determine which edge/corner we're on and calculate perimeter distance
  float perimeterDistance = 0.0;

  // Check which edge we're closest to
  float dx = absP.x - v_half_size.x;
  float dy = absP.y - v_half_size.y;

  if (dy > dx) {
    // Top or bottom edge
    if (p.y > 0.0) {
      // Bottom edge: start at bottom-left, go right
      perimeterDistance = v_rect_size.x + v_rect_size.y + (p.x + v_half_size.x);
    } else {
      // Top edge: start at top-right, go left
      perimeterDistance = v_rect_size.x + (v_half_size.x - p.x);
    }
  } else {
    // Left or right edge
    if (p.x > 0.0) {
      // Right edge: start at top-right, go down
      perimeterDistance = p.y + v_half_size.y;
    } else {
      // Left edge: start at bottom-left, go up
      perimeterDistance = v_rect_size.x + v_rect_size.y + v_rect_size.x + (v_half_size.y - p.y);
    }
  }

  float dashPosition = mod(perimeterDistance, v_dash_cycle);
  // dashWidth = v_dash_cycle / 2.0 (since dashWidth = dashGap = 7.0, dashCycle = 14.0)
  float dashFactor = step(dashPosition, v_dash_cycle / 2.0);

  // Only show dashes
  borderAlpha *= dashFactor;

  vec4 borderColor = vec4(v_color, 1.0);
  vec4 finalColor = mix(
    vec4(0.0, 0.0, 0.0, 0.0),
    borderColor,
    borderAlpha * borderColor.a
  );

  finalColor.a *= u_opacity;
  gl_FragColor = finalColor;
}
