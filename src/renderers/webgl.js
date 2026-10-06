import { GLImagePass } from "./blur-webgl.js";
import { glVertex, glFragment } from "../shaders.js";
import { surfaceUniforms, material } from "../policy.js";
export class WebGLRenderer {
  static async create(canvas, onFailure) {
    return new WebGLRenderer(canvas, onFailure);
  }
  constructor(canvas, onFailure) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL2 context 不可用");
    this.gl = gl;
    this.canvas = canvas;
    this.textures = new Map();
    this.disposed = false;
    this.lost = (e) => {
      e.preventDefault();
      if (!this.disposed) onFailure("WebGL context lost");
    };
    canvas.addEventListener("webglcontextlost", this.lost);
    const shaders = [];
    try {
      for (const [type, source] of [
        [gl.VERTEX_SHADER, glVertex],
        [gl.FRAGMENT_SHADER, glFragment],
      ]) {
        const s = gl.createShader(type);
        shaders.push(s);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(s));
      }
      this.program = gl.createProgram();
      for (const s of shaders) gl.attachShader(this.program, s);
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(this.program));
      this.locations = new Map();
      for (
        let i = 0;
        i < gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
        i++
      ) {
        const u = gl.getActiveUniform(this.program, i);
        this.locations.set(u.name, {
          type: u.type,
          loc: gl.getUniformLocation(this.program, u.name),
        });
      }
      this.imagePass = new GLImagePass(gl);
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      gl.useProgram(this.program);
      const loc = gl.getAttribLocation(this.program, "a_position");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
      );
    } catch (e) {
      this.dispose();
      throw e;
    } finally {
      for (const s of shaders) gl.deleteShader(s);
    }
  }
  upload(key, source, signature) {
    const g = this.gl;
    let item = this.textures.get(key);
    if (!item) {
      item = { texture: g.createTexture() };
      this.textures.set(key, item);
    }
    g.bindTexture(g.TEXTURE_2D, item.texture);
    if (item.signature !== signature) {
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, source);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      item.signature = signature;
    }
    return item.texture;
  }
  render(scene, surfaces, settings, dpr) {
    const g = this.gl,
      w = scene.canvas.width,
      h = scene.canvas.height;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    if (this.source !== scene) {
      this.source = scene;
      this.sourceId = (this.sourceId ?? 0) + 1;
    }
    const signature = `${this.sourceId}:${scene.version}`;
    const visible = surfaces.filter((s) => {
      const r = s.bounds;
      return (
        r.w > 0 &&
        r.h > 0 &&
        r.x < w / dpr &&
        r.y < h / dpr &&
        r.x + r.w > 0 &&
        r.y + r.h > 0
      );
    });
    this.imagePass.prune(
      new Set(
        visible.map((s) => String(material(s.kind, settings.controls).blur)),
      ),
    );
    g.activeTexture(g.TEXTURE0);
    const bg = this.upload("bg", scene.canvas, signature),
      layered = settings.layered && visible.length > 0;
    if (!layered && this.layers) {
      for (const t of this.layers) g.deleteTexture(t);
      this.layers = null;
    }
    if (
      layered &&
      (!this.layers || this.layerWidth !== w || this.layerHeight !== h)
    ) {
      for (const t of this.layers ?? []) g.deleteTexture(t);
      this.layers = [
        this.imagePass.texture(w, h),
        this.imagePass.texture(w, h),
      ];
      this.layerWidth = w;
      this.layerHeight = h;
    }
    this.imagePass.target(null, w, h);
    g.disable(g.SCISSOR_TEST);
    g.clearColor(0, 0, 0, 0);
    g.clear(g.COLOR_BUFFER_BIT);
    let input = bg,
      output;
    if (layered) {
      [input, output] = this.layers;
      this.imagePass.draw(bg, input, 0, 0, w, h);
    }
    for (const s of visible) {
      const r = s.bounds,
        blur = this.imagePass.blur(
          input,
          material(s.kind, settings.controls).blur,
          dpr,
          `${signature}:${dpr}`,
          w,
          h,
          layered,
        );
      if (layered) {
        this.imagePass.draw(input, output, 0, 0, w, h);
        this.imagePass.target(output, w, h);
      } else this.imagePass.target(null, w, h);
      g.useProgram(this.program);
      g.bindBuffer(g.ARRAY_BUFFER, this.buffer);
      const loc = g.getAttribLocation(this.program, "a_position");
      g.enableVertexAttribArray(loc);
      g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
      g.enable(g.BLEND);
      g.blendFuncSeparate(
        g.SRC_ALPHA,
        g.ONE_MINUS_SRC_ALPHA,
        g.ONE,
        g.ONE_MINUS_SRC_ALPHA,
      );
      g.enable(g.SCISSOR_TEST);
      g.activeTexture(g.TEXTURE0);
      g.bindTexture(g.TEXTURE_2D, input);
      g.activeTexture(g.TEXTURE1);
      g.bindTexture(g.TEXTURE_2D, blur);
      const uniforms = {
        ...surfaceUniforms(
          r,
          w,
          h,
          dpr,
          s.kind,
          settings.controls,
          settings.theme,
        ),
        u_bg: 0,
        u_blurredBg: 1,
      };
      for (const [name, value] of Object.entries(uniforms)) {
        const u = this.locations.get(name);
        if (!u) continue;
        if (u.type === g.FLOAT) g.uniform1f(u.loc, value);
        else if (u.type === g.FLOAT_VEC2) g.uniform2fv(u.loc, value);
        else if (u.type === g.FLOAT_VEC4) g.uniform4fv(u.loc, value);
        else g.uniform1i(u.loc, value);
      }
      const x = Math.max(0, Math.floor(r.x * dpr) - 2),
        y = Math.max(0, Math.floor(h - (r.y + r.h) * dpr) - 2);
      const sw = Math.min(w - x, Math.ceil((r.x + r.w) * dpr) + 2 - x),
        sh = Math.min(h - y, Math.ceil(h - r.y * dpr) + 2 - y);
      if (sw > 0 && sh > 0) {
        g.scissor(x, y, sw, sh);
        g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
      }
      if (layered) [input, output] = [output, input];
    }
    if (layered) this.imagePass.draw(input, null, 0, 0, w, h);
    g.disable(g.SCISSOR_TEST);
    const err = g.getError();
    if (err !== g.NO_ERROR) throw new Error(`WebGL draw failed: ${err}`);
  }
  lose() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.lost);
    for (const t of this.textures.values()) this.gl.deleteTexture(t.texture);
    this.textures.clear();
    this.imagePass?.dispose();
    for (const t of this.layers ?? []) this.gl.deleteTexture(t);
    if (this.buffer) this.gl.deleteBuffer(this.buffer);
    if (this.program) this.gl.deleteProgram(this.program);
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
