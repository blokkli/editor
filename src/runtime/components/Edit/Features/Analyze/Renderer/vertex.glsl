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
uniform vec3 u_color_pass;

out vec4 v_quad;
out float v_rect_type;
out vec3 v_color;
out vec2 v_rect_size;
out vec2 v_rect_center;

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
  // 0 = pass, 1 = incomplete, 2 = inapplicable, 3 = violation
  if (a_rect_type > 2.5) {
    // violation
    v_color = u_color_violation;
  } else if (a_rect_type > 0.5 && a_rect_type < 1.5) {
    // incomplete
    v_color = u_color_incomplete;
  } else if (a_rect_type < 0.5) {
    // pass
    v_color = u_color_pass;
  } else {
    // inapplicable - use a neutral gray
    v_color = vec3(0.5, 0.5, 0.5);
  }
}
