precision highp float;

varying vec4 v_quad;
varying vec2 v_circle_center;
varying float v_visible;
varying float v_is_hovered;

uniform float u_dpi;
uniform vec3 u_color;
uniform vec3 u_color_hover;

void main() {
  // Early exit if not visible
  if (v_visible < 0.5) {
    discard;
  }

  // Calculate distance from pixel to circle center
  vec2 pixelPos = gl_FragCoord.xy;
  float dist = distance(pixelPos, v_circle_center);

  // Circle radius
  float radius = v_quad.z / 2.0;

  // Anti-aliased circle
  float edgeSoftness = 1.0;
  float alpha = 1.0 - smoothstep(radius - edgeSoftness, radius, dist);

  if (alpha < 0.01) {
    discard;
  }

  // Calculate position relative to circle center
  vec2 offset = pixelPos - v_circle_center;

  // Plus dimensions relative to circle radius
  float plusThickness = radius * 0.1; // 10% of radius
  float plusLength = radius * 0.5; // 50% of radius

  // Check if pixel is part of the plus (horizontal or vertical bar)
  bool isHorizontalBar = abs(offset.y) < plusThickness && abs(offset.x) < plusLength;
  bool isVerticalBar = abs(offset.x) < plusThickness && abs(offset.y) < plusLength;
  bool isPlus = isHorizontalBar || isVerticalBar;

  // Determine final color
  vec3 finalColor;
  if (isPlus) {
    // Plus is white
    finalColor = vec3(1.0, 1.0, 1.0);
  } else {
    // Circle background: use hover color if hovered, otherwise normal color
    finalColor = v_is_hovered > 0.5 ? u_color_hover : u_color;
  }

  gl_FragColor = vec4(finalColor, alpha);
}
