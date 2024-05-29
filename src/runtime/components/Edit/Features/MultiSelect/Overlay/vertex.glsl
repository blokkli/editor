#version 300 es

precision mediump float;

in vec3 a_position;
in vec4 a_quad;
in float a_rect_id;
in float a_rect_type;
in float a_vertex_index;

uniform float u_time;
uniform float u_dpi;
uniform float u_scale;
uniform float u_offset_x;
uniform float u_offset_y;
uniform float u_select_all;
uniform vec2 u_resolution;
uniform vec3 u_color_field_default;
uniform vec3 u_color_field_active;
uniform vec3 u_color_area_default;
uniform vec3 u_color_area_active;
uniform vec4 u_select_rect;

out vec4 v_quad;
out float v_intersecting;
out float v_is_select_rect;
out vec3 v_color_default;
out vec3 v_color_active;
out float v_rect_id;

bool isIntersecting(vec4 a, vec4 b) {
  return a.x < b.x + b.z &&
  a.x + a.z > b.x &&
  a.y < b.y + b.w &&
  a.y + a.w > b.y;
}

/**
 * Maps the vertices of 4 quads (total of 16 vertices) so that they together form a border of thickness t.
 */
vec2 getVertexPos(vec4 targetRect, float edge, float corner) {
  // @TODO: Could maybe be made less verbose?
  // How much to thicken around targetRect (in viewport pixels.)
  // This will be the
  float t = max(1.0 / u_dpi, 0.75);

  float x = targetRect.x;
  float y = targetRect.y;
  float w = targetRect.z;
  float h = targetRect.w;
  vec2 pos = vec2(0.0, 0.0);

  bool edge_top = edge < 0.5;
  bool edge_right = edge < 1.5;
  bool edge_bottom = edge < 2.5;
  bool edge_left = edge < 3.5;

  bool corner_top_left = corner < 0.5;
  bool corner_top_right = corner < 1.5;
  bool corner_bottom_right = corner < 2.5;
  bool corner_bottom_left = corner < 3.5;

  // Top edge of rectangle.
  if (edge_top) {
    // Top-left.
    if (corner_top_left) {
      pos.x = x - t;
      pos.y = y - t;
      // Top-right.
    } else if (corner_top_right) {
      pos.x = x + w + t;
      pos.y = y - t;
      // Bottom-right.
    } else if (corner_bottom_right) {
      pos.x = x + w + t;
      pos.y = y + t;
      // Bottom-left.
    } else if (corner_bottom_left) {
      pos.x = x - t;
      pos.y = y + t;
    }
    // Right edge of rectangle.
  } else if (edge_right) {
    if (corner_top_left) {
      pos.x = x + w - t;
      pos.y = y - t;
    } else if (corner_top_right) {
      pos.x = x + w + t;
      pos.y = y - t;
    } else if (corner_bottom_right) {
      pos.x = x + w + t;
      pos.y = y + t + h;
    } else if (corner_bottom_left) {
      pos.x = x + w - t;
      pos.y = y + t + h;
    }
    // Bottom edge of rectangle.
  } else if (edge_bottom) {
    if (corner_top_left) {
      pos.x = x - t;
      pos.y = y + h - t;
    } else if (corner_top_right) {
      pos.x = x + w + t;
      pos.y = y + h - t;
    } else if (corner_bottom_right) {
      pos.x = x + w + t;
      pos.y = y + h + t;
    } else if (corner_bottom_left) {
      pos.x = x - t;
      pos.y = y + t + h;
    }
    // Left edge of rectangle.
  } else if (edge_left) {
    if (corner_top_left) {
      pos.x = x - t;
      pos.y = y - t;
    } else if (corner_top_right) {
      pos.x = x + t;
      pos.y = y - t;
    } else if (corner_bottom_right) {
      pos.x = x + t;
      pos.y = y + h + t;
    } else if (corner_bottom_left) {
      pos.x = x - t;
      pos.y = y + t + h;
    }
  }

  return pos;
}

void main() {
  // Selection rectangle.
  if (a_rect_type < 0.5) {
    vec2 pos = getVertexPos(u_select_rect, a_rect_id, a_position.z);
    vec2 normalizedPosition = pos / u_resolution;
    vec2 screenSpacePosition = normalizedPosition * 2.0 - vec2(1.0, 1.0);
    screenSpacePosition.y = -screenSpacePosition.y;

    gl_Position = vec4(screenSpacePosition, 0.0, 1.0);
    v_is_select_rect = 1.0;
    return;
  }

  vec2 offsetPosition = a_position.xy * u_scale;
  offsetPosition.x += u_offset_x;
  offsetPosition.y += u_offset_y;

  vec2 normalizedPosition = offsetPosition / u_resolution;

  // Transform to screen space (-1 to 1)
  vec2 screenSpacePosition = normalizedPosition * 2.0 - vec2(1.0, 1.0);
  screenSpacePosition.y = -screenSpacePosition.y;

  // Output final position in clip space
  gl_Position = vec4(screenSpacePosition, 0.0, 1.0);

  vec4 transformed_quad = vec4(
    (a_quad.x * u_scale + u_offset_x) * u_dpi,
    (u_resolution.y - a_quad.y * u_scale - a_quad.w * u_scale - u_offset_y) *
      u_dpi,
    a_quad.z * u_scale * u_dpi,
    a_quad.w * u_scale * u_dpi
  );
  v_quad = transformed_quad;

  bool is_nested = a_rect_type > 5.5;
  bool select_all = u_select_all > 0.5;

  // Used to check intersection.
  vec4 box = vec4(a_quad) * u_scale;
  box.x += u_offset_x;
  box.y += u_offset_y;

  v_intersecting =
    isIntersecting(box, u_select_rect) && (is_nested || select_all)
      ? 1.0
      : 0.0;

  v_color_default = u_color_field_default;
  v_color_active = u_color_field_active;
}
