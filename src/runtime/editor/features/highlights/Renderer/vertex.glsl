#version 300 es

precision highp float;

// [x, y] position.
in vec2 a_position;
// The [x,y,width, height] of the quad the vertex belongs to.
in vec4 a_quad;
in float a_rect_id;
in vec3 a_color1;
in vec3 a_color2;
in float a_active;

// The global scaling applied to all quads.
uniform float u_scale;
uniform float u_dpi;
// The amount of pixels to offset on the x axis.
uniform float u_offset_x;
// The amount of pixels to offset on the y axis.
uniform float u_offset_y;
uniform vec2 u_resolution;

out vec4 v_quad;
out vec3 v_color1;
out vec3 v_color2;
out vec2 v_rect_size;
out vec2 v_rect_center;
out float v_border_factor;
out vec2 v_rect_size_artboard;
out float v_active;

void main() {
  v_active = a_active;
  // Define the increase size to prevent border clipping.
  float borderThickness = (2.0 + a_active * 1.5) * u_dpi;
  float increaseSize = max(borderThickness, 10.0) + 4.0;

  // Calculate the new dimensions of the quad.
  vec4 adjusted_quad = a_quad;
  adjusted_quad.z += 2.0 * increaseSize;
  adjusted_quad.w += 2.0 * increaseSize;

  // Adjust vertex positions to scale from the center of the rectangle.
  vec2 center = vec2(a_quad.x + a_quad.z / 2.0, a_quad.y + a_quad.w / 2.0);
  vec2 dummyCenter = vec2(a_quad.x + a_quad.z / 2.0, a_quad.y + a_quad.w / 2.0);
  vec2 vertexOffset = a_position - dummyCenter;
  vec2 newOffset =
    vertexOffset *
    (vec2(adjusted_quad.z, adjusted_quad.w) / vec2(a_quad.z, a_quad.w));
  vec2 newPosition = center + newOffset;

  // Apply global scale and offsets.
  vec2 offsetPosition = newPosition * u_scale;
  offsetPosition.x += u_offset_x;
  offsetPosition.y += u_offset_y;

  // Normalize position for rendering.
  vec2 normalizedPosition = offsetPosition / u_resolution;

  // Transform to screen space (-1 to 1).
  vec2 screenSpacePosition = normalizedPosition * 2.0 - vec2(1.0, 1.0);
  screenSpacePosition.y = -screenSpacePosition.y;

  // Output final position in clip space.
  gl_Position = vec4(screenSpacePosition, 0.0, 1.0) * u_dpi;

  // Pass the dimensions to fragment shader for SDF calculations.
  vec4 transformed_quad = vec4(
    (a_quad.x * u_scale + u_offset_x) * u_dpi,
    (u_resolution.y - a_quad.y * u_scale - a_quad.w * u_scale - u_offset_y) *
      u_dpi,
    a_quad.z * u_scale * u_dpi,
    a_quad.w * u_scale * u_dpi
  );
  v_quad = transformed_quad;

  v_color1 = a_color1;
  v_color2 = a_color2;
  v_rect_size = vec2(v_quad.z, v_quad.w);
  v_rect_center = vec2(v_quad.x + v_quad.z / 2.0, v_quad.y + v_quad.w / 2.0);

  // Calculate border factor based on scale.
  v_border_factor = smoothstep(0.5, 0.8, u_scale);

  // Artboard-space rect size for perimeter distance calculation.
  v_rect_size_artboard = vec2(a_quad.z, a_quad.w);
}
