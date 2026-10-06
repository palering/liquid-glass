import { glImageVertex as vs, glImageFragment as fs, imageBindings } from '../shaders.js';
import { uniformData, bindUniformBlock } from './uniforms.js';
import { packImageU } from '../shaders/generated/packers.js';
export class GLImagePass {
  constructor(gl) {
    this.gl = gl;
    this.items = new Map();
    const shaders = [];
    try {
      for (const [type, source] of [
        [gl.VERTEX_SHADER, vs],
        [gl.FRAGMENT_SHADER, fs],
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
      this.image = gl.getUniformLocation(this.program, imageBindings.textures.image.name);
      bindUniformBlock(gl, this.program, imageBindings.uniforms.u, 1);
      this.params = uniformData(imageBindings.uniforms.u);
      this.paramsBuffer = gl.createBuffer();
      gl.bindBuffer(gl.UNIFORM_BUFFER, this.paramsBuffer);
      this.fbo = gl.createFramebuffer();
    } catch (e) {
      this.dispose();
      throw e;
    } finally {
      for (const s of shaders) gl.deleteShader(s);
    }
  }
  texture(w, h) {
    const g = this.gl,
      t = g.createTexture();
    g.bindTexture(g.TEXTURE_2D, t);
    g.texImage2D(
      g.TEXTURE_2D,
      0,
      g.RGBA,
      w,
      h,
      0,
      g.RGBA,
      g.UNSIGNED_BYTE,
      null,
    );
    for (const [key, value] of [
      [g.TEXTURE_MIN_FILTER, g.LINEAR],
      [g.TEXTURE_MAG_FILTER, g.LINEAR],
      [g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE],
      [g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE],
    ])
      g.texParameteri(g.TEXTURE_2D, key, value);
    return t;
  }
  target(texture, w, h) {
    const g = this.gl;
    g.bindFramebuffer(g.FRAMEBUFFER, texture ? this.fbo : null);
    if (texture) {
      g.framebufferTexture2D(
        g.FRAMEBUFFER,
        g.COLOR_ATTACHMENT0,
        g.TEXTURE_2D,
        texture,
        0,
      );
      if (g.checkFramebufferStatus(g.FRAMEBUFFER) !== g.FRAMEBUFFER_COMPLETE)
        throw new Error("WebGL blur framebuffer incomplete");
    }
    g.viewport(0, 0, w, h);
  }
  draw(input, target, x, y, w, h, sigma = 1, mode = 1) {
    const g = this.gl;
    this.target(target, w, h);
    g.disable(g.SCISSOR_TEST);
    g.disable(g.BLEND);
    g.useProgram(this.program);
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, input);
    g.uniform1i(this.image, 0);
    g.bindBuffer(g.UNIFORM_BUFFER, this.paramsBuffer);
    packImageU(this.params, { step: [x, y], size: [w, h], sigma, mode });
    g.bufferData(g.UNIFORM_BUFFER, this.params.bytes, g.STREAM_DRAW);
    g.bindBufferBase(g.UNIFORM_BUFFER, 1, this.paramsBuffer);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
  }
  blur(input, radius, dpr, signature, w, h, force = false) {
    if (radius <= 0) return input;
    const key = String(radius);
    let item = this.items.get(key);
    if (item && (item.w !== w || item.h !== h || item.dpr !== dpr)) {
      this.destroyItem(item);
      this.items.delete(key);
      item = null;
    }
    if (!item) {
      let tw = w,
        th = h,
        scale = 1;
      const pyramid = [];
      while ((radius * dpr) / scale > 3 && tw > 2 && th > 2) {
        const nw = Math.max(1, Math.ceil(tw / 2)),
          nh = Math.max(1, Math.ceil(th / 2));
        pyramid.push({
          texture: this.texture(nw, nh),
          w: nw,
          h: nh,
          x: 0.5 / tw,
          y: 0.5 / th,
        });
        tw = nw;
        th = nh;
        scale *= 2;
      }
      item = {
        w,
        h,
        dpr,
        tw,
        th,
        scale,
        pyramid,
        a: this.texture(tw, th),
        b: this.texture(tw, th),
      };
      this.items.set(key, item);
    }
    if (force || item.signature !== signature) {
      let downsampled = input;
      for (const level of item.pyramid) {
        this.draw(
          downsampled,
          level.texture,
          level.x,
          level.y,
          level.w,
          level.h,
          1,
          2,
        );
        downsampled = level.texture;
      }
      const sigma = Math.max(0.1, (radius * dpr) / item.scale);
      this.draw(
        downsampled,
        item.a,
        1 / item.tw,
        0,
        item.tw,
        item.th,
        sigma,
        0,
      );
      this.draw(item.a, item.b, 0, 1 / item.th, item.tw, item.th, sigma, 0);
      item.signature = signature;
    }
    return item.b;
  }
  prune(radii) {
    for (const [k, item] of this.items)
      if (!radii.has(k)) {
        this.destroyItem(item);
        this.items.delete(k);
      }
  }
  destroyItem(item) {
    for (const level of item.pyramid) this.gl.deleteTexture(level.texture);
    this.gl.deleteTexture(item.a);
    this.gl.deleteTexture(item.b);
  }
  dispose() {
    const g = this.gl;
    for (const item of this.items.values()) this.destroyItem(item);
    this.items.clear();
    if (this.program) g.deleteProgram(this.program);
    if (this.paramsBuffer) g.deleteBuffer(this.paramsBuffer);
    if (this.fbo) g.deleteFramebuffer(this.fbo);
  }
}
