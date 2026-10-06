// Shared separable Gaussian blur and blit passes. No DOM capture or CPU blur.
const vertex = `@vertex fn main(@builtin(vertex_index) id:u32)->@builtin(position) vec4f { let p=array<vec2f,4>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(1,1)); return vec4f(p[id],0,1); }`;
const fragment = `struct U { step:vec2f, size:vec2f, sigma:f32, mode:f32, pad:vec2f }; @group(0) @binding(0) var image:texture_2d<f32>; @group(0) @binding(1) var sampling:sampler; @group(0) @binding(2) var<uniform> u:U;
@fragment fn main(@builtin(position) p:vec4f)->@location(0) vec4f {
 let uv=p.xy/u.size;
 if(u.mode==1.0){return textureSampleLevel(image,sampling,uv,0);}
 if(u.mode==2.0){return (textureSampleLevel(image,sampling,uv+u.step,0)+textureSampleLevel(image,sampling,uv-u.step,0)+textureSampleLevel(image,sampling,uv+vec2f(u.step.x,-u.step.y),0)+textureSampleLevel(image,sampling,uv+vec2f(-u.step.x,u.step.y),0))*.25;}
 var c=textureSampleLevel(image,sampling,uv,0);var total=1.0;
 for(var i=1;i<=12;i++){let t=f32(i);let weight=exp(-.5*t*t/(u.sigma*u.sigma));let delta=u.step*t;c+=(textureSampleLevel(image,sampling,uv+delta,0)+textureSampleLevel(image,sampling,uv-delta,0))*weight;total+=2.0*weight;}
 return c/total;
}`;
export class GPUImagePass {
  static async create(device, outputFormat) {
    const r = new GPUImagePass(device);
    await r.init(outputFormat);
    return r;
  }
  constructor(device) {
    this.device = device;
    this.items = new Map();
    this.blits = new Map();
  }
  async init(format) {
    const d = this.device,
      vs = d.createShaderModule({ code: vertex }),
      fs = d.createShaderModule({ code: fragment });
    for (const m of [vs, fs]) {
      const e = (await m.getCompilationInfo()).messages.filter(
        (x) => x.type === "error",
      );
      if (e.length) throw new Error(e.map((x) => x.message).join("\n"));
    }
    const make = (target) =>
      d.createRenderPipelineAsync({
        layout: "auto",
        vertex: { module: vs, entryPoint: "main" },
        fragment: {
          module: fs,
          entryPoint: "main",
          targets: [{ format: target }],
        },
        primitive: { topology: "triangle-strip" },
      });
    this.blurPipeline = await make("rgba8unorm");
    this.screenPipeline = await make(format);
    this.sampler = d.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
  }
  texture(w, h) {
    return this.device.createTexture({
      size: [w, h],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST,
    });
  }
  params(x, y, w, h, sigma = 1, mode = 0) {
    const b = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(
      b,
      0,
      new Float32Array([x, y, w, h, sigma, mode, 0, 0]),
    );
    return b;
  }
  draw(encoder, input, view, pipeline, buffer) {
    const group = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: input.createView() },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: { buffer } },
      ],
    });
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.draw(4);
    pass.end();
  }
  blur(encoder, input, radius, dpr, signature, w, h, force = false) {
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
          buffer: this.params(0.5 / tw, 0.5 / th, nw, nh, 1, 2),
        });
        tw = nw;
        th = nh;
        scale *= 2;
      }
      const sigma = Math.max(0.1, (radius * dpr) / scale);
      item = {
        w,
        h,
        dpr,
        pyramid,
        a: this.texture(tw, th),
        b: this.texture(tw, th),
        x: this.params(1 / tw, 0, tw, th, sigma),
        y: this.params(0, 1 / th, tw, th, sigma),
      };
      this.items.set(key, item);
    }
    if (force || item.signature !== signature) {
      let downsampled = input;
      for (const level of item.pyramid) {
        this.draw(
          encoder,
          downsampled,
          level.texture.createView(),
          this.blurPipeline,
          level.buffer,
        );
        downsampled = level.texture;
      }
      this.draw(
        encoder,
        downsampled,
        item.a.createView(),
        this.blurPipeline,
        item.x,
      );
      this.draw(
        encoder,
        item.a,
        item.b.createView(),
        this.blurPipeline,
        item.y,
      );
      item.signature = signature;
    }
    return item.b;
  }
  blit(encoder, input, view, w, h) {
    const key = `${w}:${h}`;
    if (!this.blits.has(key)) {
      for (const b of this.blits.values()) b.destroy();
      this.blits.clear();
      this.blits.set(key, this.params(0, 0, w, h, 1, 1));
    }
    this.draw(encoder, input, view, this.screenPipeline, this.blits.get(key));
  }
  prune(radii) {
    for (const [k, item] of this.items)
      if (!radii.has(k)) {
        this.destroyItem(item);
        this.items.delete(k);
      }
  }
  destroyItem(item) {
    for (const level of item.pyramid) {
      level.texture.destroy();
      level.buffer.destroy();
    }
    item.a.destroy();
    item.b.destroy();
    item.x.destroy();
    item.y.destroy();
  }
  dispose() {
    for (const item of this.items.values()) this.destroyItem(item);
    for (const b of this.blits.values()) b.destroy();
    this.items.clear();
    this.blits.clear();
  }
}
