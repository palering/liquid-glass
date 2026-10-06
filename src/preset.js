import { opticalFields, looks } from "./config.js";
import {normalizePerformance} from './performance.js';
// A portable preset contains settings, never image blobs, DOM, functions or URLs.
export const PRESET_VERSION = 2;
export function normalizeSettings(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("settings 必须是对象");
  const defaults = {
    backend: "auto",
    capture: "scene",
    theme: "light",
    background: "testchart",
    quality: "high",
    enabled: true,
    layered: false,
  };
  const enums = {
    backend: ["auto", "webgpu", "webgl", "svg", "css", "solid"],
    capture: ["scene", "native-dom"],
    theme: ["dark", "light"],
    background: ["grid", "gradient", "checker", "testchart", "image"],
    quality: ["high", "medium", "low"],
  };
  const settings = { ...defaults };
  for (const [key, values] of Object.entries(enums)) {
    if (input[key] === undefined) continue;
    if (!values.includes(input[key])) throw new Error(`无效选项：${key}`);
    settings[key] = input[key];
  }
  for (const key of ["enabled", "layered"])
    if (input[key] !== undefined) {
      if (typeof input[key] !== "boolean")
        throw new Error(`${key} 必须是布尔值`);
      settings[key] = input[key];
    }
  const controls = { ...looks.studio },
    raw = input.controls ?? {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("controls 必须是对象");
  for (const [key, , min, max] of opticalFields) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] !== "number" || !Number.isFinite(raw[key]))
      throw new Error(`无效数值：${key}`);
    controls[key] = Math.max(min, Math.min(max, raw[key]));
  }
  if (raw.blurEdge !== undefined) {
    if (typeof raw.blurEdge !== "boolean")
      throw new Error("blurEdge 必须是布尔值");
    controls.blurEdge = raw.blurEdge;
  }
  if (raw.tintColor !== undefined) {
    if (raw.tintColor !== "auto" && !/^#[0-9a-f]{6}$/i.test(raw.tintColor))
      throw new Error("tintColor 必须是 auto 或六位十六进制颜色");
    controls.tintColor = raw.tintColor.toLowerCase();
  }
  settings.controls = controls;
  settings.performance=normalizePerformance(input.performance??null);
  return settings;
}
export function createPreset(name, settings) {
  if (typeof name !== "string" || !name.trim() || name.length > 80)
    throw new Error("预设名称需要 1–80 个字符");
  return {
    schema: "workspace-liquid-glass",
    version: PRESET_VERSION,
    name: name.trim(),
    settings: normalizeSettings(settings),
  };
}
export function serializePreset(preset) {
  return JSON.stringify(parsePreset(preset), null, 2);
}
export function parsePreset(raw) {
  if (typeof raw === "string") {
    if (raw.length > 64000) throw new Error("预设超过 64 KB");
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      throw new Error(`JSON 格式错误：${e.message}`);
    }
  }
  if (
    !raw ||
    raw.schema !== "workspace-liquid-glass" ||
    ![1,PRESET_VERSION].includes(raw.version)
  )
    throw new Error("不支持的预设格式或版本");
  if(raw.version===1&&raw.settings!==undefined&&(!raw.settings||typeof raw.settings!=='object'||Array.isArray(raw.settings)))
    throw new Error("settings 必须是对象");
  // v1 did not define performance: ignore extensions there and restore legacy.
  return createPreset(raw.name,raw.version===1?{...raw.settings,performance:null}:raw.settings);
}
