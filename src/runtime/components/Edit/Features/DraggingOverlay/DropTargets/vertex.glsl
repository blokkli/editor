precision mediump float;

attribute vec2 a_position;
attribute vec4 a_quad;
attribute float a_rect_id;
attribute float a_rect_type;

uniform float u_scale;
uniform float u_offset_x;
uniform float u_offset_y;
uniform vec2 u_resolution;
uniform float u_active_rect_id;
uniform vec3 u_color_field_0;
uniform vec3 u_color_field_1;
uniform vec3 u_color_field_2;
uniform vec3 u_color_field_3;
uniform vec3 u_color_area;
uniform float u_dpi;

varying vec4 v_quad;
varying float v_intersecting;
varying vec3 v_color;

void main() {
  vec2 offsetPosition = a_position * u_scale;
  offsetPosition.x += u_offset_x;
  offsetPosition.y += u_offset_y;

  vec2 normalizedPosition = offsetPosition / u_resolution;

  // Transform to screen space (-1 to 1)
  vec2 screenSpacePosition = normalizedPosition * 2.0 - vec2(1.0, 1.0);
  screenSpacePosition.y = -screenSpacePosition.y;

  // Output final position in clip space
  gl_Position = vec4(screenSpacePosition, 0.0, 1.0);
  v_intersecting = a_rect_id == u_active_rect_id ? 1.0 : 0.0;

  // Transform the quad.
  vec4 transformed_quad = vec4(
    (a_quad.x * u_scale + u_offset_x) * u_dpi,
    (u_resolution.y - a_quad.y * u_scale - a_quad.w * u_scale - u_offset_y) *
      u_dpi,
    a_quad.z * u_scale * u_dpi,
    a_quad.w * u_scale * u_dpi
  );
  v_quad = transformed_quad;

  // Set correct colors based on type.
  if (a_rect_type < 0.5) {
    v_color = u_color_area;
  } else if (a_rect_type < 1.5) {
    v_color = u_color_field_0;
  } else if (a_rect_type < 2.5) {
    v_color = u_color_field_1;
  } else if (a_rect_type < 3.5) {
    v_color = u_color_field_2;
  } else {
    v_color = u_color_field_3;
  }
}
