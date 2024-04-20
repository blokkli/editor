precision mediump float;

// [x, y] position.
attribute vec2 a_position;
// The [x,y,width, height] of the quad the vertex belongs to.
attribute vec4 a_quad;
attribute float a_rect_id;
attribute float a_rect_type;
attribute vec4 a_rect_radius;

// The global scaling applied to all quads.
uniform float u_scale;
uniform float u_dpi;
// The amount of pixels to offset on the x axis.
uniform float u_offset_x;
// The amount of pixels to offset on the y axis.
uniform float u_offset_y;
uniform vec2 u_resolution;
uniform vec3 u_color_default;
uniform vec3 u_color_inverted;

// The transformed quad for the fragment shader.
varying vec4 v_quad;
varying vec3 v_color;
varying vec4 v_rect_radius;
varying float v_thickness;
varying vec2 v_rect_size;
varying vec2 v_rect_center;
varying float v_transition;

void main() {
  // Define the increase size in viewport terms (not affected by u_scale)
  float thickness = (0.5 + smoothstep(0.3, 1.0, u_scale) * 2.5) * u_dpi;
  float increaseSize = max(thickness, 15.0);

  // Calculate the new dimensions of the quad
  vec4 adjusted_quad = a_quad;
  adjusted_quad.z += 2.0 * increaseSize; // increase width by 20px
  adjusted_quad.w += 2.0 * increaseSize; // increase height by 20px

  // Adjust vertex positions to scale from the center of the rectangle
  // Calculate the center of the original quad
  vec2 center = vec2(a_quad.x + a_quad.z / 2.0, a_quad.y + a_quad.w / 2.0);

  // Adjust vertices to reflect new size
  // Calculate new offset from center based on original vertex position relative to center
  vec2 newOffset =
    (a_position - center) *
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

  vec4 transformed_quad = vec4(
    (a_quad.x * u_scale + u_offset_x) * u_dpi,
    (u_resolution.y - a_quad.y * u_scale - a_quad.w * u_scale - u_offset_y) *
      u_dpi,
    a_quad.z * u_scale * u_dpi,
    a_quad.w * u_scale * u_dpi
  );
  v_quad = transformed_quad;

  // Set color and other varying variables
  v_color = a_rect_type > 0.5 ? u_color_inverted : u_color_default;
  v_rect_radius = a_rect_radius * u_dpi;
  v_thickness = thickness;
  v_rect_size = vec2(v_quad.z, v_quad.w);
  v_rect_center = vec2(v_quad.x + v_quad.z / 2.0, v_quad.y + v_quad.w / 2.0); // The pixel-space rectangle center location
  v_transition = smoothstep(0.5, 0.8, u_scale);
}
