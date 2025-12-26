#version 300 es

precision highp float;

in vec4 v_quad;
in vec4 v_rect_radius;
in vec2 v_rect_size;
in vec2 v_rect_center;
in float v_rect_type;
in vec2 v_quad_artboard_pos;
// Optimized varyings calculated in vertex shader
in vec4 v_corner_radii;
in float v_border_thickness;
in vec2 v_half_size;
in vec3 v_color;
in float v_dash_cycle;
in vec2 v_rect_size_artboard;

out vec4 fragColor;

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
      1.0 -
      smoothstep(-u_borderSoftness, 0.0, abs(mainDist) - v_border_thickness);
    vec4 borderColor = vec4(v_color, 1.0);

    // Combine fill and border
    vec4 combined = mix(
      vec4(fillColor.rgb, fillAlpha * fillColor.a),
      borderColor,
      borderAlpha * borderColor.a
    );

    combined.a *= u_opacity;
    fragColor = combined;
    return;
  }

  // For blocks (type 0, 1, and 3), render border
  float u_borderSoftness = 1.0;

  float borderAlpha =
    1.0 -
    smoothstep(-u_borderSoftness, 0.0, abs(mainDist) - v_border_thickness);

  // Apply dashed pattern for all blocks
  // Calculate perimeter distance in artboard space for scale-independent dashing

  // Convert pixel position from viewport to artboard space
  vec2 viewportToArtboardRatio = v_rect_size_artboard / v_rect_size;
  vec2 posRelativeToQuad_artboard = posRelativeToQuad * viewportToArtboardRatio;

  // Get artboard-space half dimensions
  vec2 halfSize_artboard = v_rect_size_artboard / 2.0;

  // Convert from center-relative to top-left-relative coordinates
  vec2 posFromTopLeft = posRelativeToQuad_artboard + halfSize_artboard;

  // Clamp to rect bounds to avoid edge issues
  vec2 p = clamp(posFromTopLeft, vec2(0.0), v_rect_size_artboard);

  // Two continuous dash paths anchored to visual top-left:
  // Path 1: TOP (left→right) → RIGHT (top→bottom)
  // Path 2: LEFT (top→bottom) → BOTTOM (left→right)
  float perimeterDistance = 0.0;
  float width = v_rect_size_artboard.x;
  float height = v_rect_size_artboard.y;

  // Determine which edge we're on based on distance to edges
  vec2 absP = abs(posRelativeToQuad_artboard);
  float dx = absP.x - halfSize_artboard.x;
  float dy = absP.y - halfSize_artboard.y;

  if (dy > dx) {
    // Closer to top or bottom edge
    if (posRelativeToQuad_artboard.y > 0.0) {
      // Visual TOP edge: starts at top-left, goes left to right
      perimeterDistance = p.x;
    } else {
      // Visual BOTTOM edge: continues from LEFT edge, then goes left to right
      perimeterDistance = height + p.x;
    }
  } else {
    // Closer to left or right edge
    if (posRelativeToQuad_artboard.x < 0.0) {
      // Visual LEFT edge: starts at visual top-left (0 at top, height at bottom)
      perimeterDistance = height - p.y;
    } else {
      // Visual RIGHT edge: continues from TOP edge (width at visual top, width+height at visual bottom)
      perimeterDistance = width + (height - p.y);
    }
  }

  float dashPosition = mod(perimeterDistance, v_dash_cycle);
  // dashWidth = v_dash_cycle / 2.0 (since dashWidth = dashGap = 7.0, dashCycle = 14.0)
  float dashFactor = step(dashPosition, v_dash_cycle / 2.0);

  // Only show dashes...
  borderAlpha *= dashFactor;

  vec4 borderColor = vec4(v_color, 1.0);
  vec4 finalColor = mix(
    vec4(0.0, 0.0, 0.0, 0.0),
    borderColor,
    borderAlpha * borderColor.a
  );

  finalColor.a *= u_opacity;
  fragColor = finalColor;
}
