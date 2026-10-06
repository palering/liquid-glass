// Shared fullscreen image pass. Original implementation in this project.
@vertex
fn main(@builtin(vertex_index) id: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 4>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(1, 1),
  );
  return vec4f(positions[id], 0, 1);
}
