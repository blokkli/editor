#version 300 es

precision highp float;

// [x, y] position.
in vec2 a_position;
// The [x,y,width, height] of the quad the vertex belongs to.
in vec4 a_quad;
in float a_rect_id;
in float a_rect_type;
in vec4 a_rect_radius;

// The global scaling applied to all quads.
uniform float u_scale;
uniform float u_dpi;
// The amount of pixels to offset on the x axis.
uniform float u_offset_x;
// The amount of pixels to offset on the y axis.
uniform float u_offset_y;
uniform vec2 u_resolution;

// Hover state uniforms (12 rectangles)
uniform vec4 u_hover_positions[12]; // x, y, width, height
uniform vec4 u_hover_radii[12]; // topLeft, topRight, bottomRight, bottomLeft
uniform float u_hover_types[12]; // 0=mono, 1=accent, 2=teal fill
uniform float u_hover_visible[12]; // 0=hidden, 1=visible

// Color uniforms
uniform vec3 u_color_mono;
uniform vec3 u_color_accent;
uniform vec3 u_color_teal;
uniform vec3 u_color_white;
uniform vec3 u_color_lime;
uniform vec3 u_color_yellow;

// The transformed quad for the fragment shader.
out vec4 v_quad;
out vec4 v_rect_radius;
out vec2 v_rect_size;
out vec2 v_rect_center;
out float v_rect_type;
out vec2 v_quad_artboard_pos;
// Optimized varyings to reduce fragment shader calculations
out vec4 v_corner_radii;
out float v_border_thickness;
out vec2 v_half_size;
out vec3 v_color;
out float v_dash_cycle;
out vec2 v_rect_size_artboard;

void main() {
  int rectIndex = int(a_rect_id);

  // If not visible, move off-screen
  if (u_hover_visible[rectIndex] < 0.5) {
    gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
    return;
  }

  // Get rect data from uniforms
  vec4 hoverPos = u_hover_positions[rectIndex]; // x, y, width, height
  vec4 hoverRadius = u_hover_radii[rectIndex];
  float hoverType = u_hover_types[rectIndex];

  // Define the increase size to prevent border clipping
  float borderThickness = 2.0 * u_dpi;
  float increaseSize = max(borderThickness, 10.0) + 4.0;

  // Calculate the new dimensions of the quad
  vec4 adjusted_quad = hoverPos;
  adjusted_quad.z += 2.0 * increaseSize; // increase width
  adjusted_quad.w += 2.0 * increaseSize; // increase height

  // Adjust vertex positions to scale from the center of the rectangle
  // Calculate the center of the original quad
  vec2 center = vec2(
    hoverPos.x + hoverPos.z / 2.0,
    hoverPos.y + hoverPos.w / 2.0
  );

  // Calculate vertex offset relative to dummy quad center
  vec2 dummyCenter = vec2(a_quad.x + a_quad.z / 2.0, a_quad.y + a_quad.w / 2.0);
  vec2 vertexOffset = a_position - dummyCenter;

  // Map vertex offset to new rect
  vec2 newOffset =
    vertexOffset *
    (vec2(adjusted_quad.z, adjusted_quad.w) / vec2(a_quad.z, a_quad.w));

  // New position is center plus the new offset
  vec2 newPosition = center + newOffset;

  // Apply global scale and offsets
  vec2 offsetPosition = newPosition * u_scale;
  offsetPosition.x += u_offset_x;
  offsetPosition.y += u_offset_y;

  // Normalize position for rendering
  vec2 normalizedPosition = offsetPosition / u_resolution;

  // Transform to screen space (-1 to 1)
  vec2 screenSpacePosition = normalizedPosition * 2.0 - vec2(1.0, 1.0);
  screenSpacePosition.y = -screenSpacePosition.y;

  // Output final position in clip space
  gl_Position = vec4(screenSpacePosition, 0.0, 1.0) * u_dpi;

  // Pass the dimensions to fragment shader for SDF calculations
  vec4 transformed_quad = vec4(
    (hoverPos.x * u_scale + u_offset_x) * u_dpi,
    (u_resolution.y -
      hoverPos.y * u_scale -
      hoverPos.w * u_scale -
      u_offset_y) *
      u_dpi,
    hoverPos.z * u_scale * u_dpi,
    hoverPos.w * u_scale * u_dpi
  );
  v_quad = transformed_quad;

  // Expand the rect by 2px for border rendering
  float borderExpansion = 2.0 * u_dpi;

  // Set varying variables
  v_rect_radius = hoverRadius * u_dpi;
  v_rect_size = vec2(
    v_quad.z + 2.0 * borderExpansion,
    v_quad.w + 2.0 * borderExpansion
  );
  v_rect_center = vec2(v_quad.x + v_quad.z / 2.0, v_quad.y + v_quad.w / 2.0);
  v_rect_type = hoverType;
  // Pass the original artboard-space quad position for stable dash pattern
  v_quad_artboard_pos = vec2(hoverPos.x, hoverPos.y);

  // Calculate optimized values once per vertex instead of per fragment
  // Corner radii clamped to max radius
  v_corner_radii = min(v_rect_radius, min(v_rect_size.x, v_rect_size.y) / 2.0);

  v_border_thickness = 1.5 * u_dpi;
  v_half_size = v_rect_size / 2.0;
  v_dash_cycle = 14.0 - u_scale * 1.0;
  v_rect_size_artboard = vec2(hoverPos.z, hoverPos.w);

  // Select color based on type: 0 = mono, 1 = accent, 2 = teal, 3 = white (inverted), 4 = lime (library), 5 = yellow (restricted), 6 = yellow (outdated)
  if (hoverType > 5.5) {
    v_color = u_color_yellow;
  } else if (hoverType > 4.5) {
    v_color = u_color_mono;
  } else if (hoverType > 3.5) {
    v_color = u_color_lime;
  } else if (hoverType > 2.5) {
    v_color = u_color_white;
  } else if (hoverType > 1.5) {
    v_color = u_color_teal;
  } else if (hoverType > 0.5) {
    v_color = u_color_accent;
  } else {
    v_color = u_color_mono;
  }
}
