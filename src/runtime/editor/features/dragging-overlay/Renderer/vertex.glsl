#version 300 es

precision highp float;

in vec2 a_position;
in vec4 a_quad;
in float a_rect_id;
in float a_rect_type;
in float a_state;

uniform float u_scale;
uniform float u_offset_x;
uniform float u_offset_y;
uniform vec2 u_resolution;
uniform float u_active_rect_id;
uniform vec3 u_color_area;
uniform vec3 u_color_hover_area;
uniform vec4 u_active_hover_rect;
uniform float u_active_hover_nesting_level;
uniform float u_field_min_size;
uniform float u_dpi;
uniform vec3 u_field_0[4];
uniform vec3 u_field_1[4];
uniform vec3 u_field_2[4];
uniform vec3 u_field_3[4];
uniform vec3 u_drop_area[4];

out vec4 v_quad;
out float v_intersecting;
out float v_is_hover_area;
out float v_is_field;
out float v_is_drop_area;
out float v_is_vertical;
out vec3 v_color;
out vec3 v_grad_start;
out vec3 v_grad_end;
out vec3 v_border_outer;
out vec3 v_border_inner;

// Optimized varyings - values computed once per vertex instead of per pixel
out vec2 v_size;
out vec2 v_location;
out vec2 v_size_inner;
out float v_thickness;
out float v_border_width;
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

vec3 getFieldColor(int idx, int kind) {
  // kind: 0=gradStart, 1=gradEnd, 2=borderOuter, 3=borderInner
  if (idx == 1) {
    return u_field_1[kind];
  } else if (idx == 2) {
    return u_field_2[kind];
  } else if (idx == 3) {
    return u_field_3[kind];
  }
  return u_field_0[kind];
}

void main() {
  vec4 quad = getQuad();

  bool is_field = a_rect_type >= 1.0 && a_rect_type < 5.0;
  bool is_active = a_rect_id == u_active_rect_id;
  bool is_empty = a_state > 1.5;
  bool is_vertical_shrink = a_state > 0.5;

  if (is_field && !is_active) {
    float minSize = u_field_min_size;
    if (is_vertical_shrink) {
      float newHeight = min(minSize, quad.w);
      quad.y += (quad.w - newHeight) * 0.5;
      quad.w = newHeight;
    } else {
      float newWidth = min(minSize, quad.z);
      quad.x += (quad.z - newWidth) * 0.5;
      quad.z = newWidth;
    }
  }
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
  v_is_field = a_rect_type >= 1.0 && a_rect_type < 5.0 ? 1.0 : 0.0;
  v_is_drop_area = a_rect_type < 1.0 ? 1.0 : 0.0;
  v_is_vertical = is_empty ? 0.0 : (is_vertical_shrink ? 1.0 : 0.0);

  bool is_drop_target = a_rect_type <= 0.5;

  // Set correct colors based on type.
  if (a_rect_type < 1.0) {
    v_color = u_color_area;
  } else if (a_rect_type < 2.0) {
    v_color = u_color_area;
  } else if (a_rect_type < 3.0) {
    v_color = u_color_area;
  } else if (a_rect_type < 4.0) {
    v_color = u_color_area;
  } else if (a_rect_type < 5.0) {
    v_color = u_color_area;
  } else {
    v_color = u_color_hover_area;
  }

  if (v_is_field >= 0.5) {
    int idx = int(floor(a_rect_type - 1.0));
    idx = int(clamp(float(idx), 0.0, 3.0));
    v_grad_start = getFieldColor(idx, 0);
    v_grad_end = getFieldColor(idx, 1);
    v_border_outer = getFieldColor(idx, 2);
    v_border_inner = getFieldColor(idx, 3);
  } else if (v_is_drop_area >= 0.5) {
    v_grad_start = u_drop_area[0];
    v_grad_end = u_drop_area[1];
    v_border_outer = u_drop_area[2];
    v_border_inner = u_drop_area[3];
  } else {
    v_grad_start = v_color;
    v_grad_end = v_color;
    v_border_outer = v_color;
    v_border_inner = v_color;
  }

  // Compute values that are constant per quad (optimization)
  bool isHoverArea = v_is_hover_area >= 1.0;
  float stroke = isHoverArea ? 0.5 : 1.0;
  float radiusBase = 4.0;

  v_thickness = max(min(1.0 * u_scale, 3.0), 0.5);
  v_size = vec2(transformed_quad.z, transformed_quad.w);
  v_location = vec2(
    transformed_quad.x + v_size.x / 2.0,
    transformed_quad.y + v_size.y / 2.0
  );

  v_edge_softness = 0.5 * u_dpi;

  float borderWidth = stroke * u_scale * u_dpi;
  float maxBorder = min(v_size.x, v_size.y) * 0.25;
  borderWidth = min(borderWidth, maxBorder);
  v_border_width = borderWidth;

  // Different radius for inner and outer (based on full quad size)
  v_radius_outer =
    min(radiusBase * u_dpi, min(v_size.x, v_size.y) / 2.0);
  v_radius_inner = max(v_radius_outer - borderWidth, 0.0);

  v_size_inner = v_size - 2.0 * borderWidth;

  v_fill_alpha = v_is_hover_area >= 1.0 ? 0.5 : 1.0;
}
