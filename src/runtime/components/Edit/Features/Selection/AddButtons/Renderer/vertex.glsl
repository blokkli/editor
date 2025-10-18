precision highp float;

// [x, y] position.
attribute vec2 a_position;
// The [x,y,width, height] of the quad the vertex belongs to.
attribute vec4 a_quad;
attribute float a_rect_id;

// The global scaling applied to all quads.
uniform float u_scale;
uniform float u_dpi;
// The amount of pixels to offset on the x axis.
uniform float u_offset_x;
// The amount of pixels to offset on the y axis.
uniform float u_offset_y;
uniform vec2 u_resolution;

// Circle positions (10 vec2s = 20 floats)
uniform vec2 u_circle_positions[10];
// Circle visibility (10 floats)
uniform float u_circle_visible[10];
// Hovered circle index (-1 for none)
uniform float u_hovered_circle;
// Button radius in pixels
uniform float u_radius;

// The transformed quad for the fragment shader.
varying vec4 v_quad;
varying vec2 v_circle_center;
varying float v_visible;
varying float v_is_hovered;
varying float v_scale_fade;
varying float v_rect_id;

void main() {
  int rectId = int(a_rect_id);

  // Get circle position and visibility for this rect
  vec2 circlePos = u_circle_positions[rectId];
  v_visible = u_circle_visible[rectId];
  v_is_hovered = (float(rectId) == u_hovered_circle) ? 1.0 : 0.0;
  v_rect_id = a_rect_id;

  // Calculate fade factor based on scale (fade from 1.0 at 0.5 to 0.0 at 0.4)
  v_scale_fade = 1.0;
  if (u_scale < 0.5) {
    // Interpolate from 1.0 (at scale 0.5) to 0.0 (at scale 0.4)
    v_scale_fade = (u_scale - 0.4) / (0.5 - 0.4);
    v_scale_fade = clamp(v_scale_fade, 0.0, 1.0);
  }

  // Border width in pixels (must match fragment shader)
  float borderWidth = 4.0;

  // Circle radius in artboard space - apply inverse scaling to keep constant size
  // Then multiply by fade factor
  // Add border width to the radius so the border renders outside
  float radius = ((u_radius + borderWidth) / u_scale) * v_scale_fade;

  // Calculate quad bounds centered on circle position
  float left = circlePos.x - radius;
  float top = circlePos.y - radius;
  float width = radius * 2.0;
  float height = radius * 2.0;

  // Determine which corner of the quad this vertex represents
  // Normalize position within the dummy quad (0.0 to 1.0)
  vec2 quadCorner = vec2(
    (a_position.x - a_quad.x) / a_quad.z,
    (a_position.y - a_quad.y) / a_quad.w
  );

  // Calculate actual vertex position in artboard space
  vec2 vertexPos = vec2(
    left + quadCorner.x * width,
    top + quadCorner.y * height
  );

  // Apply global scale and offsets
  vec2 offsetPosition = vertexPos * u_scale;
  offsetPosition.x += u_offset_x;
  offsetPosition.y += u_offset_y;

  // Normalize position for rendering
  vec2 normalizedPosition = offsetPosition / u_resolution;

  // Transform to screen space (-1 to 1)
  vec2 screenSpacePosition = normalizedPosition * 2.0 - vec2(1.0, 1.0);
  screenSpacePosition.y = -screenSpacePosition.y;

  // Output final position in clip space
  gl_Position = vec4(screenSpacePosition, 0.0, 1.0) * u_dpi;

  // Calculate transformed quad for fragment shader
  v_quad = vec4(
    (left * u_scale + u_offset_x) * u_dpi,
    (u_resolution.y - top * u_scale - height * u_scale - u_offset_y) * u_dpi,
    width * u_scale * u_dpi,
    height * u_scale * u_dpi
  );
  v_circle_center = vec2(v_quad.x + v_quad.z / 2.0, v_quad.y + v_quad.w / 2.0);
}
