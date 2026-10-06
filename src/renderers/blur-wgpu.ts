import type {BlurItem} from '../contracts.js';
import { gpuImageVertex as vertex, gpuImageFragment as fragment, imageBindings } from '../shaders.js';
import { uniformData } from './uniforms.js';
import { packImageU } from '../shaders/generated/packers.js';
type Item=BlurItem<GPUTexture,{texture:GPUTexture;buffer:GPUBuffer}>&{x:GPUBuffer;y:GPUBuffer};
export class GPUImagePass {
 declare device:GPUDevice;
 declare items:Map<string,Item>;
 declare blits:Map<string,GPUBuffer>;
 declare groups:WeakMap<GPUBuffer,{input:GPUTexture;pipeline:GPURenderPipeline;group:GPUBindGroup}>;
 declare views:WeakMap<GPUTexture,GPUTextureView>;
 // Assigned by init before create returns; constructor is internal to the factory.
 declare blurPipeline:GPURenderPipeline;
 declare screenPipeline:GPURenderPipeline;
 declare sampler:GPUSampler;
  static async create(device:GPUDevice, outputFormat:GPUTextureFormat) {
    const r = new GPUImagePass(device);
    await r.init(outputFormat);
    return r;
  }
  private constructor(device:GPUDevice) {
    this.device = device;
    this.items = new Map();
    this.blits = new Map();
    this.groups = new WeakMap();
    this.views = new WeakMap();
  }
  async init(format:GPUTextureFormat) {
    const d = this.device,
      vs = d.createShaderModule({ code: vertex }),
      fs = d.createShaderModule({ code: fragment });
    for (const m of [vs, fs]) {
      const e = (await m.getCompilationInfo()).messages.filter(
        (x) => x.type === "error",
      );
      if (e.length) throw new Error(e.map((x) => x.message).join("\n"));
    }
    const make = (target:GPUTextureFormat) =>
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
  texture(w:number, h:number) {
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
  params(x:number, y:number, w:number, h:number, sigma = 1, mode = 0) {
    const b = this.device.createBuffer({
      size: imageBindings.uniforms.u.size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(
      b,
      0,
      packImageU(uniformData(imageBindings.uniforms.u), { step: [x, y], size: [w, h], sigma, mode }),
    );
    return b;
  }
  view(texture:GPUTexture) {
    let view = this.views.get(texture);
    if (!view) { view = texture.createView(); this.views.set(texture, view); }
    return view;
  }
  draw(encoder:GPUCommandEncoder, input:GPUTexture, view:GPUTextureView, pipeline:GPURenderPipeline, buffer:GPUBuffer) {
    let cached = this.groups.get(buffer);
    if (!cached || cached.input !== input || cached.pipeline !== pipeline) {
    const group = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.view(input) },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: { buffer } },
      ],
    });
    cached = {input, pipeline, group};
    this.groups.set(buffer, cached);
    }
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
    pass.setBindGroup(0, cached.group);
    pass.draw(4);
    pass.end();
  }
  blur(encoder:GPUCommandEncoder, input:GPUTexture, radius:number, dpr:number, signature:string, w:number, h:number, force = false) {
    if (radius <= 0) return input;
    const key = String(radius);
    let item:Item|null|undefined = this.items.get(key);
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
          this.view(level.texture),
          this.blurPipeline,
          level.buffer,
        );
        downsampled = level.texture;
      }
      this.draw(
        encoder,
        downsampled,
        this.view(item.a),
        this.blurPipeline,
        item.x,
      );
      this.draw(
        encoder,
        item.a,
        this.view(item.b),
        this.blurPipeline,
        item.y,
      );
      item.signature = signature;
    }
    return item.b;
  }
  blit(encoder:GPUCommandEncoder, input:GPUTexture, view:GPUTextureView, w:number, h:number) {
    const key = `${w}:${h}`;
    if (!this.blits.has(key)) {
      for (const b of this.blits.values()) b.destroy();
      this.blits.clear();
      this.blits.set(key, this.params(0, 0, w, h, 1, 1));
    }
    this.draw(encoder, input, view, this.screenPipeline, this.blits.get(key) as GPUBuffer);
  }
  prune(radii:Set<string>) {
    for (const [k, item] of this.items)
      if (!radii.has(k)) {
        this.destroyItem(item);
        this.items.delete(k);
      }
  }
  destroyItem(item:Item) {
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
    this.groups = new WeakMap();
    this.views = new WeakMap();
  }
}
