#version 300 es

precision highp float;

in vec2 a_position;
in vec4 a_quad;
in float a_rect_id;
in float a_rect_type;

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
uniform vec3 u_color_hover_area;
uniform vec4 u_active_hover_rect;
uniform float u_active_hover_nesting_level;
uniform float u_dpi;

out vec4 v_quad;
out float v_intersecting;
out float v_is_hover_area;
out vec3 v_color;

// Optimized varyings - values computed once per vertex instead of per pixel
out vec2 v_size;
out vec2 v_location;
out vec2 v_size_inner;
out float v_thickness;
out float v_edge_softness;
out float v_radius_outer;
out float v_radius_inner;
out float v_fill_alpha;

vec4 getQuad() {
  if (a_rect_type >= 5.0) {
    // Return the quad coming in via uniform.
    return u_active_hover_rect;
  }
  // Use the provided quad.
  return a_quad;
}

void main() {
  vec4 quad = getQuad();
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
    (quad.x * u_scale + u_offset_x) * u_dpi,
    (u_resolution.y - quad.y * u_scale - quad.w * u_scale - u_offset_y) * u_dpi,
    quad.z * u_scale * u_dpi,
    quad.w * u_scale * u_dpi
  );
  v_quad = transformed_quad;

  v_is_hover_area = a_rect_type >= 5.0 ? 1.0 : 0.0;

  bool is_drop_target = a_rect_type <= 0.5;

  // Set correct colors based on type.
  if (a_rect_type < 1.0) {
    v_color = u_color_area;
  } else if (a_rect_type < 2.0) {
    v_color = u_color_field_0;
  } else if (a_rect_type < 3.0) {
    v_color = u_color_field_1;
  } else if (a_rect_type < 4.0) {
    v_color = u_color_field_2;
  } else if (a_rect_type < 5.0) {
    v_color = u_color_field_3;
  } else {
    v_color = u_color_hover_area;
  }

  // Compute values that are constant per quad (optimization)
  bool isHoverArea = v_is_hover_area >= 1.0;
  float stroke = isHoverArea ? 0.5 : 1.0;
  float radiusBase = stroke * u_scale;

  v_thickness = max(min(1.0 * u_scale, 3.0), 0.5);

  // Calculate inset to draw border inside the quad
  float inset = max(min(2.0 * u_scale, 1.0), 3.0) * v_thickness + stroke;

  // Rectangle dimensions with inset
  float u_rect_x = transformed_quad.x + inset;
  float u_rect_y = transformed_quad.y + inset;
  float u_rectWidth = transformed_quad.z - 2.0 * inset;
  float u_rectHeight = transformed_quad.w - 2.0 * inset;

  v_size = vec2(u_rectWidth, u_rectHeight);

  // Center position of the rectangle
  v_location = vec2(u_rect_x + v_size.x / 2.0, u_rect_y + v_size.y / 2.0);

  v_edge_softness = 0.5 * u_dpi;

  float borderWidth = stroke * u_scale * u_dpi;

  // Different radius for inner and outer
  v_radius_outer =
    min(radiusBase * u_dpi, min(v_size.x, v_size.y)) + v_thickness;
  v_radius_inner = v_radius_outer - borderWidth;

  v_size_inner = v_size - 2.0 * borderWidth;

  if (is_drop_target) {
    v_fill_alpha = v_intersecting >= 0.5 ? 0.5 : 0.2;
  } else {
    v_fill_alpha = v_intersecting >= 0.5 ? 1.0 : 0.2;
  }
}
