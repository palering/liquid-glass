import { GPUImagePass } from "./blur-wgpu.js";
import { gpuVertex, gpuFragment } from "../shaders.js";
import { surfaceUniforms, material } from "../policy.js";
export class WebGPURenderer {
  static async create(canvas, onFailure) {
    if (!navigator.gpu) throw new Error("WebGPU API 未开放");
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("没有可用的 GPU adapter");
    const device = await adapter.requestDevice();
    const r = new WebGPURenderer(canvas, device, onFailure);
    try {
      await r.init();
      return r;
    } catch (e) {
      r.dispose();
      throw e;
    }
  }
  constructor(canvas, device, onFailure) {
    this.canvas = canvas;
    this.device = device;
    this.textures = new Map();
    this.buffers = new Map();
    this.disposed = false;
    this.fail = onFailure;
    device.lost.then((info) => {
      if (!this.disposed)
        onFailure(`GPU device lost: ${info.message || info.reason}`);
    });
    this.error = (e) => {
      if (!this.disposed) onFailure(e.error.message);
    };
    device.addEventListener("uncapturederror", this.error);
  }
  async init() {
    const d = this.device;
    this.context = this.canvas.getContext("webgpu");
    if (!this.context) throw new Error("WebGPU canvas context 不可用");
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: d,
      format: this.format,
      alphaMode: "premultiplied",
    });
    d.pushErrorScope("validation");
    let scoped = false;
    try {
      const vs = d.createShaderModule({ code: gpuVertex }),
        fs = d.createShaderModule({ code: gpuFragment });
      for (const module of [vs, fs]) {
        const info = await module.getCompilationInfo();
        const errors = info.messages.filter((x) => x.type === "error");
        if (errors.length)
          throw new Error(errors.map((e) => e.message).join("\n"));
      }
      const makePipeline = (format) =>
        d.createRenderPipelineAsync({
          layout: "auto",
          vertex: {
            module: vs,
            entryPoint: "vs_main",
            buffers: [
              {
                arrayStride: 8,
                attributes: [
                  { shaderLocation: 0, offset: 0, format: "float32x2" },
                ],
              },
            ],
          },
          fragment: {
            module: fs,
            entryPoint: "fs_main",
            targets: [
              {
                format,
                blend: {
                  color: {
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha",
                  },
                  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
                },
              },
            ],
          },
          primitive: { topology: "triangle-strip" },
        });
      this.pipeline = await makePipeline(this.format);
      this.layerPipeline = await makePipeline("rgba8unorm");
      this.imagePass = await GPUImagePass.create(d, this.format);
      this.vertex = d.createBuffer({
        size: 32,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      d.queue.writeBuffer(
        this.vertex,
        0,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      );
      this.sampler = d.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      const err = await d.popErrorScope();
      scoped = true;
      if (err) throw new Error(err.message);
    } finally {
      if (!scoped) await d.popErrorScope();
    }
  }
  upload(key, source, signature) {
    const d = this.device;
    let item = this.textures.get(key);
    if (!item || item.w !== source.width || item.h !== source.height) {
      item?.texture.destroy();
      item = {
        texture: d.createTexture({
          size: [source.width, source.height],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.COPY_SRC |
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.RENDER_ATTACHMENT,
        }),
        w: source.width,
        h: source.height,
      };
      this.textures.set(key, item);
    }
    if (item.signature !== signature) {
      d.queue.copyExternalImageToTexture(
        { source },
        { texture: item.texture },
        [source.width, source.height],
      );
      item.signature = signature;
    }
    return item.texture;
  }
  uniform(id, u) {
    let b = this.buffers.get(id);
    if (!b) {
      b = this.device.createBuffer({
        size: 160,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.buffers.set(id, b);
    }
    const data = new ArrayBuffer(160),
      f = new Float32Array(data),
      i = new Int32Array(data);
    f.set(u.u_resolution, 0);
    f[2] = u.u_dpr;
    f.set(u.u_mouseSpring, 6);
    f[8] = u.u_shapeWidth;
    f[9] = u.u_shapeHeight;
    f[10] = u.u_shapeRadius;
    f[11] = u.u_shapeRoundness;
    f[12] = u.u_mergeRate;
    f[13] = u.u_glareAngle;
    i[21] = u.u_showShape1;
    i[23] = u.u_blurEdge;
    f.set(u.u_tint, 24);
    for (const [n, index] of [
      ["u_refThickness", 28],
      ["u_refFactor", 29],
      ["u_refDispersion", 30],
      ["u_refFresnelRange", 31],
      ["u_refFresnelHardness", 32],
      ["u_refFresnelFactor", 33],
      ["u_glareRange", 34],
      ["u_glareHardness", 35],
      ["u_glareConvergence", 36],
      ["u_glareOppositeFactor", 37],
      ["u_glareFactor", 38],
      ["u_refDistance", 39],
    ])
      f[index] = u[n];
    this.device.queue.writeBuffer(b, 0, data);
    return b;
  }
  render(scene, surfaces, settings, dpr) {
    const d = this.device,
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
    const surfaceIds = new Set(visible.map((s) => s.id));
    for (const [k, b] of this.buffers)
      if (!surfaceIds.has(k)) {
        b.destroy();
        this.buffers.delete(k);
      }
    const radii = new Set(
      visible.map((s) => String(material(s.kind, settings.controls).blur)),
    );
    this.imagePass.prune(radii);
    const bg = this.upload("bg", scene.canvas, signature),
      encoder = d.createCommandEncoder();
    const layered = settings.layered && visible.length > 0;
    if (!layered && this.layers) {
      for (const t of this.layers) t.destroy();
      this.layers = null;
    }
    if (
      layered &&
      (!this.layers || this.layerWidth !== w || this.layerHeight !== h)
    ) {
      for (const t of this.layers ?? []) t.destroy();
      this.layers = [
        this.imagePass.texture(w, h),
        this.imagePass.texture(w, h),
      ];
      this.layerWidth = w;
      this.layerHeight = h;
    }
    const drawSurface = (
      s,
      input,
      blur,
      view,
      loadOp,
      pipeline,
      sharedPass = null,
    ) => {
      const r = s.bounds;
      const buffer = this.uniform(
        s.id,
        surfaceUniforms(
          r,
          w,
          h,
          dpr,
          s.kind,
          settings.controls,
          settings.theme,
        ),
      );
      const group = d.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer } },
          { binding: 1, resource: blur.createView() },
          { binding: 2, resource: input.createView() },
          { binding: 3, resource: this.sampler },
        ],
      });
      const pass =
        sharedPass ??
        encoder.beginRenderPass({
          colorAttachments: [
            {
              view,
              loadOp,
              storeOp: "store",
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
            },
          ],
        });
      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, this.vertex);
      pass.setBindGroup(0, group);
      const x = Math.max(0, Math.floor(r.x * dpr) - 2),
        y = Math.max(0, Math.floor(r.y * dpr) - 2);
      const sw = Math.min(w - x, Math.ceil((r.x + r.w) * dpr) + 2 - x),
        sh = Math.min(h - y, Math.ceil((r.y + r.h) * dpr) + 2 - y);
      if (sw > 0 && sh > 0) {
        pass.setScissorRect(x, y, sw, sh);
        pass.draw(4);
      }
      if (!sharedPass) pass.end();
    };
    const screen = this.context.getCurrentTexture().createView();
    if (layered) {
      let input = this.layers[0],
        output = this.layers[1];
      encoder.copyTextureToTexture({ texture: bg }, { texture: input }, [w, h]);
      for (const s of visible) {
        const blur = this.imagePass.blur(
          encoder,
          input,
          material(s.kind, settings.controls).blur,
          dpr,
          signature,
          w,
          h,
          true,
        );
        encoder.copyTextureToTexture({ texture: input }, { texture: output }, [
          w,
          h,
        ]);
        drawSurface(
          s,
          input,
          blur,
          output.createView(),
          "load",
          this.layerPipeline,
        );
        [input, output] = [output, input];
      }
      this.imagePass.blit(encoder, input, screen, w, h);
    } else {
      // Blur work finishes before opening the shared surface pass.
      const prepared = visible.map((s) => ({
        s,
        blur: this.imagePass.blur(
          encoder,
          bg,
          material(s.kind, settings.controls).blur,
          dpr,
          `${signature}:${dpr}`,
          w,
          h,
        ),
      }));
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: screen,
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
          },
        ],
      });
      for (const { s, blur } of prepared)
        drawSurface(s, bg, blur, screen, "load", this.pipeline, pass);
      pass.end();
    }
    d.queue.submit([encoder.finish()]);
  }
  lose() {
    this.device.destroy();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.device.removeEventListener("uncapturederror", this.error);
    for (const t of this.textures.values()) t.texture.destroy();
    for (const b of this.buffers.values()) b.destroy();
    this.imagePass?.dispose();
    for (const t of this.layers ?? []) t.destroy();
    this.vertex?.destroy();
    this.textures.clear();
    this.buffers.clear();
    this.context?.unconfigure();
    this.device.destroy();
  }
}
