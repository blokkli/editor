#version 300 es

precision highp float;

// [x, y] position.
in vec2 a_position;
// The [x,y,width, height] of the quad the vertex belongs to.
in vec4 a_quad;
in float a_rect_id;
in float a_rect_type;

// The global scaling applied to all quads.
uniform float u_scale;
uniform float u_dpi;
// The amount of pixels to offset on the x axis.
uniform float u_offset_x;
// The amount of pixels to offset on the y axis.
uniform float u_offset_y;
uniform vec2 u_resolution;
uniform vec3 u_color_violation;
uniform vec3 u_color_incomplete;
uniform float u_opacity;
uniform float u_manual_stale;
uniform float u_active_id;

out vec4 v_quad;
out float v_rect_type;
out vec3 v_color;
out vec2 v_rect_size;
out vec2 v_rect_center;
out float v_opacity;
out float v_border_opacity;
out float v_border_factor;
out float v_fill_opacity;

void main() {
  // Apply global scale and offsets
  vec2 offsetPosition = a_position * u_scale;
  offsetPosition.x += u_offset_x;
  offsetPosition.y += u_offset_y;

  // Normalize position for rendering
  vec2 normalizedPosition = offsetPosition / u_resolution;

  // Transform to screen space (-1 to 1)
  vec2 screenSpacePosition = normalizedPosition * 2.0 - vec2(1.0, 1.0);
  screenSpacePosition.y = -screenSpacePosition.y;

  // Output final position in clip space
  gl_Position = vec4(screenSpacePosition, 0.0, 1.0) * u_dpi;

  // Pass quad and type to fragment shader
  vec4 transformed_quad = vec4(
    (a_quad.x * u_scale + u_offset_x) * u_dpi,
    (u_resolution.y - a_quad.y * u_scale - a_quad.w * u_scale - u_offset_y) *
      u_dpi,
    a_quad.z * u_scale * u_dpi,
    a_quad.w * u_scale * u_dpi
  );
  v_quad = transformed_quad;
  v_rect_type = a_rect_type;
  v_rect_size = vec2(v_quad.z, v_quad.w);
  v_rect_center = vec2(v_quad.x + v_quad.z / 2.0, v_quad.y + v_quad.w / 2.0);

  // Set color based on status type
  // 0 = violation (manual), 1 = violation (continuous)
  // 2 = incomplete (manual), 3 = incomplete (continuous)
  if (a_rect_type < 1.5) {
    // Types 0 and 1: violation
    v_color = u_color_violation;
  } else {
    // Types 2 and 3: incomplete
    v_color = u_color_incomplete;
  }

  // Calculate final opacity
  // Check if this is a manual analyzer (type 0 or 2)
  bool isManual = a_rect_type == 0.0 || a_rect_type == 2.0;

  // If manual AND stale, use 0.3, otherwise use global opacity
  if (isManual && u_manual_stale > 0.5) {
    v_opacity = 0.3;
  } else {
    v_opacity = u_opacity;
  }

  // Calculate border factor based on scale.
  v_border_factor = smoothstep(0.5, 0.8, u_scale);

  // Calculate fill opacity based on whether this rect is active
  // If active (rect_id matches u_active_id), use 0.5, otherwise 0.1
  v_fill_opacity = a_rect_id == u_active_id ? 0.3 : 0.1;
  v_border_opacity = a_rect_id == u_active_id ? 1.0 : 0.3;
}
