precision highp float;

varying vec4 v_quad;
varying vec2 v_circle_center;
varying float v_visible;
varying float v_is_hovered;
varying float v_scale_fade;
varying float v_rect_id;

uniform float u_dpi;
uniform vec3 u_color;
uniform vec3 u_color_hover;
uniform vec3 u_color_field;
uniform vec3 u_color_field_hover;

void main() {
  // Early exit if not visible or fully faded out
  if (v_visible < 0.5 || v_scale_fade < 0.01) {
    discard;
  }

  // Calculate distance from pixel to circle center
  vec2 pixelPos = gl_FragCoord.xy;
  float dist = distance(pixelPos, v_circle_center);

  // Circle radius (includes border)
  float radius = v_quad.z / 2.0;

  // Border width in pixels (must match vertex shader) - scaled by DPI
  float borderWidth = 4.0 * u_dpi;

  // Inner circle radius (without border)
  float innerRadius = radius - borderWidth;

  // Anti-aliased circle
  float edgeSoftness = 1.0 * u_dpi;
  float alpha = 1.0 - smoothstep(radius - edgeSoftness, radius, dist);

  if (alpha < 0.01) {
    discard;
  }

  // Calculate position relative to circle center
  vec2 offset = pixelPos - v_circle_center;

  // Plus dimensions relative to inner circle radius
  // Reduce thickness at low DPI (zoomed out)
  float plusThicknessBase = u_dpi <= 0.5 ? 1.25 : 1.5;
  float plusThickness = plusThicknessBase * u_dpi;
  float plusLength = innerRadius * 0.5; // 50% of inner radius
  float plusSoftness = 0.25 * u_dpi;

  // Calculate soft plus factor (0 = not plus, 1 = fully plus)
  float horizontalDist = max(abs(offset.y) - plusThickness, 0.0);
  float verticalDist = max(abs(offset.x) - plusThickness, 0.0);

  float horizontalBarFactor = 0.0;
  if (abs(offset.x) < plusLength) {
    horizontalBarFactor = 1.0 - smoothstep(0.0, plusSoftness, horizontalDist);
  }

  float verticalBarFactor = 0.0;
  if (abs(offset.y) < plusLength) {
    verticalBarFactor = 1.0 - smoothstep(0.0, plusSoftness, verticalDist);
  }

  float plusFactor = max(horizontalBarFactor, verticalBarFactor);

  // Check if pixel is in the border area (outside the inner circle)
  bool isBorder = dist >= innerRadius && dist <= radius;

  // Determine base fill color
  vec3 fillColor;
  bool isFieldButton = v_rect_id >= 2.0;
  if (isFieldButton) {
    fillColor = v_is_hovered > 0.5 ? u_color_field_hover : u_color_field;
  } else {
    fillColor = v_is_hovered > 0.5 ? u_color_hover : u_color;
  }

  // Determine final color
  vec3 finalColor;
  if (isBorder) {
    // Soft border transition - blend from fill color to white over 0.5px
    float transitionRange = 0.5 * u_dpi;
    float borderStart = innerRadius;
    float borderEnd = innerRadius + transitionRange;

    // Calculate blend factor (0 = fill color, 1 = white)
    float blendFactor = smoothstep(borderStart, borderEnd, dist);

    // Blend between fill color and white
    finalColor = mix(fillColor, vec3(1.0, 1.0, 1.0), blendFactor);
  } else {
    // Circle background
    finalColor = fillColor;
  }

  // Apply soft plus on top
  if (plusFactor > 0.0) {
    finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), plusFactor);
  }

  // Apply scale fade to alpha
  gl_FragColor = vec4(finalColor, alpha);
}
