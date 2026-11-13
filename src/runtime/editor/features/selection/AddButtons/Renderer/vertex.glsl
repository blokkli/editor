#version 300 es

precision highp float;

// A corner of a placeholder quad. z is the corner: 0 top left, 1 top right,
// 2 bottom right, 3 bottom left.
in vec3 a_position;
in float a_rect_id;

// The viewport in CSS pixels.
uniform vec2 u_resolution;

// Per shape: x, y, width and height in screen CSS pixels.
uniform vec4 u_shape_rect[__MAX_SHAPES__];
// Per shape: type (0 = unused slot), side, hovered, alpha.
uniform vec4 u_shape_style[__MAX_SHAPES__];

flat out vec4 v_rect;
flat out vec4 v_style;
// The position in screen CSS pixels.
out vec2 v_position;

// Room around a shape for anti-aliasing and the white halos.
const float PADDING = 3.0;

void main() {
  int index = int(a_rect_id);
  vec4 style = u_shape_style[index];

  // Collapse unused slots.
  if (style.x < 0.5) {
    gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
    return;
  }

  vec4 rect = u_shape_rect[index];
  int corner = int(a_position.z + 0.5);
  bool isRight = corner == 1 || corner == 2;
  bool isBottom = corner >= 2;

  vec2 position = vec2(
    isRight ? rect.x + rect.z + PADDING : rect.x - PADDING,
    isBottom ? rect.y + rect.w + PADDING : rect.y - PADDING
  );

  v_rect = rect;
  v_style = style;
  v_position = position;

  vec2 clip = position / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
