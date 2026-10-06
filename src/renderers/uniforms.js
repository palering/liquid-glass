// Offsets and scalar kinds come from the validated WGSL module, not hand-written
// CPU indices. The same layout packs WebGPU and WebGL2 uniform buffers.
export function uniformData(layout) {
  const buffer = new ArrayBuffer(layout.size);
  return { buffer, bytes: new Uint8Array(buffer), f32: new Float32Array(buffer), i32: new Int32Array(buffer), u32: new Uint32Array(buffer) };
}
export function bindUniformBlock(gl, program, layout, point) {
  const block = gl.getUniformBlockIndex(program, layout.block);
  if (block === gl.INVALID_INDEX) throw new Error(`Missing uniform block: ${layout.block}`);
  const size = gl.getActiveUniformBlockParameter(program, block, gl.UNIFORM_BLOCK_DATA_SIZE);
  if (size !== layout.size) throw new Error(`Uniform layout size mismatch: ${size} != ${layout.size}`);
  const indices = gl.getActiveUniformBlockParameter(program, block, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES);
  const offsets = gl.getActiveUniforms(program, indices, gl.UNIFORM_OFFSET);
  for (let i = 0; i < indices.length; i++) {
    const name = gl.getActiveUniform(program, indices[i]).name.split('.').at(-1);
    const field = layout.fields[name];
    if (field && field.offset !== offsets[i]) throw new Error(`Uniform offset mismatch: ${name}`);
  }
  gl.uniformBlockBinding(program, block, point);
}
