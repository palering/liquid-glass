import type {PortableSettings} from './contracts.js';
import { opticalFields, looks } from "./config.js";
import {normalizePerformance} from './performance.js';
// A portable preset contains settings, never image blobs, DOM, functions or URLs.
export const PRESET_VERSION = 2;
export function normalizeSettings(input: unknown = {}): PortableSettings {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("settings 必须是对象");
  const inputValues = input as Record<string,unknown>;
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
  const settings: Record<string,unknown> = { ...defaults };
  for (const [key, values] of Object.entries(enums)) {
    if (inputValues[key] === undefined) continue;
    if (!values.includes(inputValues[key] as string)) throw new Error(`无效选项：${key}`);
    settings[key] = inputValues[key];
  }
  for (const key of ["enabled", "layered"])
    if (inputValues[key] !== undefined) {
      if (typeof inputValues[key] !== "boolean")
        throw new Error(`${key} 必须是布尔值`);
      settings[key] = inputValues[key];
    }
  const controls = { ...looks.studio },
    raw = inputValues.controls ?? {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("controls 必须是对象");
  const rawControls = raw as Record<string,unknown>;
  for (const [key, , min, max] of opticalFields) {
    if (rawControls[key] === undefined) continue;
    if (typeof rawControls[key] !== "number" || !Number.isFinite(rawControls[key]))
      throw new Error(`无效数值：${key}`);
    controls[key] = Math.max(min, Math.min(max, rawControls[key]));
  }
  if (rawControls.blurEdge !== undefined) {
    if (typeof rawControls.blurEdge !== "boolean")
      throw new Error("blurEdge 必须是布尔值");
    controls.blurEdge = rawControls.blurEdge;
  }
  if (rawControls.tintColor !== undefined) {
    if (rawControls.tintColor !== "auto" && !/^#[0-9a-f]{6}$/i.test(rawControls.tintColor as string))
      throw new Error("tintColor 必须是 auto 或六位十六进制颜色");
    controls.tintColor = (rawControls.tintColor as string).toLowerCase() as typeof controls.tintColor;
  }
  settings.controls = controls;
  settings.performance=normalizePerformance(inputValues.performance??null);
  return settings as PortableSettings;
}
export function createPreset(name: string, settings: unknown) {
  if (typeof name !== "string" || !name.trim() || name.length > 80)
    throw new Error("预设名称需要 1–80 个字符");
  return {
    schema: "workspace-liquid-glass" as const,
    version: PRESET_VERSION,
    name: name.trim(),
    settings: normalizeSettings(settings),
  };
}
export function serializePreset(preset: unknown) {
  return JSON.stringify(parsePreset(preset), null, 2);
}
export function parsePreset(raw: unknown) {
  if (typeof raw === "string") {
    if (raw.length > 64000) throw new Error("预设超过 64 KB");
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      throw new Error(`JSON 格式错误：${(e as Error).message}`);
    }
  }
  const value = raw as {schema?: unknown;version?: unknown;name: string;settings?: unknown} | null;
  if (
    !value ||
    value.schema !== "workspace-liquid-glass" ||
    ![1,PRESET_VERSION].includes(value.version as number)
  )
    throw new Error("不支持的预设格式或版本");
  if(value.version===1&&value.settings!==undefined&&(!value.settings||typeof value.settings!=='object'||Array.isArray(value.settings)))
    throw new Error("settings 必须是对象");
  // v1 did not define performance: ignore extensions there and restore legacy.
  return createPreset(value.name,value.version===1?{...(value.settings as Record<string,unknown> | undefined),performance:null}:value.settings);
}
