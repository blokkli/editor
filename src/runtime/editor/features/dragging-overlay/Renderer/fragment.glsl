#version 300 es

precision highp float;

in float v_intersecting;
in float v_is_hover_area;
in float v_is_field;
in float v_is_drop_area;
in float v_is_vertical;
in vec4 v_quad;
in vec3 v_color;
in vec3 v_grad_start;
in vec3 v_grad_end;
in vec3 v_border_outer;
in vec3 v_border_inner;

// Optimized varyings - values computed once per vertex instead of per pixel
in vec2 v_size;
in vec2 v_location;
in vec2 v_size_inner;
in float v_thickness;
in float v_border_width;
in float v_edge_softness;
in float v_radius_outer;
in float v_radius_inner;
in float v_fill_alpha;

out vec4 fragColor;

uniform float u_scale;
uniform float u_dpi;
uniform vec2 u_resolution;
uniform float u_active_hover_nesting_level;

const float OUTER_BORDER_PX = 2.5;
const float INNER_BORDER_PX = 2.0;
const float INNER_BORDER_SOFTNESS_PX = 0.5;
const float OUTER_BORDER_SOFTNESS_PX = 0.3;

float roundedBoxSDF(vec2 CenterPosition, vec2 Size, float Radius) {
  return length(max(abs(CenterPosition) - Size + Radius, 0.0)) - Radius;
}

void main() {
  bool isHoverArea = v_is_hover_area >= 1.0;
  bool isField = v_is_field >= 0.5;
  bool isDropArea = v_is_drop_area >= 0.5;

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
    1.0 -
    smoothstep(-v_edge_softness, v_edge_softness, distanceOuter - v_thickness);
  float alphaInner =
    1.0 -
    smoothstep(-v_edge_softness, v_edge_softness, distanceInner - v_thickness);

  // Alpha value for the border.
  float alphaBorder = clamp(alphaOuter - alphaInner, 0.0, 1.0);

  float adjustedAlphaFill = alphaInner * v_fill_alpha;

  if (v_is_hover_area >= 1.0) {
    // If nesting level is 0, don't render the fill (border only)
    if (u_active_hover_nesting_level < 0.5) {
      adjustedAlphaFill = 0.0;
    } else {
      adjustedAlphaFill *= 0.1;
    }
  }

  vec3 fillColor = v_color;
  vec3 borderOuter = v_color;
  vec3 borderInner = v_color;
  if (isField || isDropArea) {
    vec2 minCorner = v_location - v_size * 0.5;
    vec2 uv = (gl_FragCoord.xy - minCorner) / v_size;
    float t = uv.y;
    t = clamp(t, 0.0, 1.0);
    fillColor = mix(v_grad_start, v_grad_end, t);
    borderOuter = v_border_outer;
    borderInner = v_border_inner;
  }

  if (isField || isDropArea) {
    vec2 pos = gl_FragCoord.xy - v_location;
    float soft = v_edge_softness;
    float outerBorderWidth = OUTER_BORDER_PX;
    float innerBorderWidth = INNER_BORDER_PX;

    float distOuter = roundedBoxSDF(pos, v_size / 2.0, v_radius_outer);
    float inside = 1.0 - smoothstep(-soft, soft, distOuter);
    float distFromOuter = -distOuter; // distance inside from outer edge in px

    float outerBand = 0.0;
    if (OUTER_BORDER_SOFTNESS_PX <= 0.0) {
      outerBand = inside * step(0.0, distFromOuter) * step(distFromOuter, outerBorderWidth);
    } else {
      float s = OUTER_BORDER_SOFTNESS_PX;
      outerBand = inside *
        smoothstep(0.0, s, distFromOuter) *
        (1.0 - smoothstep(outerBorderWidth - s, outerBorderWidth + s, distFromOuter));
    }
    float innerBand = 0.0;
    if (INNER_BORDER_SOFTNESS_PX <= 0.0) {
      innerBand = inside *
        step(outerBorderWidth, distFromOuter) *
        step(distFromOuter, outerBorderWidth + innerBorderWidth);
    } else {
      float s = INNER_BORDER_SOFTNESS_PX;
      innerBand = inside *
        smoothstep(outerBorderWidth - s, outerBorderWidth + s, distFromOuter) *
        (1.0 - smoothstep(outerBorderWidth + innerBorderWidth - s, outerBorderWidth + innerBorderWidth + s, distFromOuter));
    }
    float fillMask = inside * step(outerBorderWidth + innerBorderWidth, distFromOuter);

    vec3 color = fillColor;
    color = mix(color, borderOuter, outerBand);
    color = mix(color, borderInner, innerBand);

    float a = isDropArea
      ? (v_intersecting >= 0.5 ? 0.6 : 0.3)
      : (v_intersecting >= 0.5 ? 1.0 : 0.7);
    float alpha = max(fillMask, max(outerBand, innerBand)) * a;
    if (alpha <= 0.0) {
      discard;
    }
    fragColor = vec4(color, alpha);
    return;
  }

  if (alphaBorder > 0.0) {
    float a = isHoverArea ? 0.6 : 1.0;
    fragColor = vec4(v_color, a);
    return;
  } else if (adjustedAlphaFill > 0.0) {
    fragColor = vec4(fillColor, adjustedAlphaFill);
    return;
  }

  discard;
}
