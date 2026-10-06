// Native HTML-in-Canvas bridge. Experimental; never substitutes DOM screenshots.
export function nativeCapability() {
  return (
    typeof CanvasRenderingContext2D !== "undefined" &&
    typeof CanvasRenderingContext2D.prototype.drawElementImage === "function" &&
    typeof HTMLCanvasElement.prototype.requestPaint === "function"
  );
}
export async function createNativeSource(w, h, dpr, onPaint) {
  if (!nativeCapability()) throw new Error("原生 HTML-in-Canvas API 未开放");
  const canvas = document.createElement("canvas");
  canvas.className = "native-source";
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  if ("content" in HTMLCanvasElement.prototype)
    canvas.setAttribute("content", "drawable");
  else canvas.setAttribute("layoutsubtree", "");
  const host = document.createElement("div");
  host.setAttribute("drawable", "");
  host.style.cssText = `width:${w}px;height:${h}px;background:linear-gradient(115deg,#253342,#8d683f);color:white;padding:34px;font:16px system-ui;box-sizing:border-box;`;
  host.innerHTML =
    '<p style="font-size:12px;letter-spacing:3px">NATIVE HTML SOURCE</p><h2 style="font-size:66px;margin-top:140px">Live DOM.</h2><button type="button" style="padding:12px 20px">HTML button · 0</button>';
  let count = 0;
  host.querySelector("button").onclick = (e) => {
    e.currentTarget.textContent = `HTML button · ${++count}`;
    canvas.requestPaint();
  };
  canvas.append(host);
  const ctx = canvas.getContext("2d");
  let disposed = false;
  let firstResolve, firstReject;
  const first = new Promise((r, j) => {
    firstResolve = r;
    firstReject = j;
  });
  const draw = () => {
    if (disposed) return;
    try {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const result = ctx.drawElementImage(host, 0, 0);
      // Chrome 155+ updates DOM geometry automatically; legacy returns a matrix.
      if (
        !("content" in HTMLCanvasElement.prototype) &&
        typeof result?.a === "number"
      )
        host.style.transform = result.toString();
      firstResolve();
      onPaint(canvas);
    } catch (e) {
      firstReject(e);
    }
  };
  canvas.addEventListener("paint", draw);
  const timer = setTimeout(
    () => firstReject(new Error("原生 DOM 首帧超时")),
    1800,
  );
  return {
    canvas,
    host,
    ready: first.finally(() => clearTimeout(timer)),
    start() {
      canvas.requestPaint();
    },
    dispose() {
      disposed = true;
      firstReject(new Error("原生采集已取消"));
      clearTimeout(timer);
      canvas.removeEventListener("paint", draw);
      canvas.remove();
    },
  };
}
