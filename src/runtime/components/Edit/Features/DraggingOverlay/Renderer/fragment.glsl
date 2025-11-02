#version 300 es

precision highp float;

in float v_intersecting;
in float v_is_hover_area;
in vec4 v_quad;
in vec3 v_color;

// Optimized varyings - values computed once per vertex instead of per pixel
in vec2 v_size;
in vec2 v_location;
in vec2 v_size_inner;
in float v_thickness;
in float v_edge_softness;
in float v_radius_outer;
in float v_radius_inner;

out vec4 fragColor;

uniform float u_scale;
uniform float u_dpi;
uniform vec2 u_resolution;
uniform float u_active_hover_nesting_level;

float roundedBoxSDF(vec2 CenterPosition, vec2 Size, float Radius) {
  return length(max(abs(CenterPosition) - Size + Radius, 0.0)) - Radius;
}

void main() {
  bool isHoverArea = v_is_hover_area >= 1.0;

  // Compute different distance for inside and outside using pre-computed values
  float distanceOuter = roundedBoxSDF(
    v_location - gl_FragCoord.xy,
    v_size / 2.0,
    v_radius_outer
  );
  float distanceInner = roundedBoxSDF(
    v_location - gl_FragCoord.xy,
    v_size_inner / 2.0,
    v_radius_inner
  );

  float alphaOuter =
    1.0 - smoothstep(-v_edge_softness, v_edge_softness, distanceOuter - v_thickness);
  float alphaInner =
    1.0 - smoothstep(-v_edge_softness, v_edge_softness, distanceInner - v_thickness);

  // Alpha value for the border.
  float alphaBorder = clamp(alphaOuter - alphaInner, 0.0, 1.0);

  // Adjust alphas based on intersection.
  float adjustedAlphaFill =
    v_intersecting >= 0.5
      ? alphaInner * 0.95
      : alphaInner * 0.2;

  if (v_is_hover_area >= 1.0) {
    // If nesting level is 0, don't render the fill (border only)
    if (u_active_hover_nesting_level < 0.5) {
      adjustedAlphaFill = 0.0;
    } else {
      adjustedAlphaFill *= 0.5;
    }
  }

  if (alphaBorder > 0.0) {
    float a = isHoverArea ? 0.6 : 1.0;
    fragColor = vec4(v_color, a);
    return;
  } else if (adjustedAlphaFill > 0.0) {
    fragColor = vec4(v_color, adjustedAlphaFill);
    return;
  }

  discard;
}
