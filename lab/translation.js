import { copy } from "./copy.js";

export const languages = ["en", "zh-CN"];
export function resolveLanguage(query, saved) {
  return languages.includes(query) ? query : languages.includes(saved) ? saved : "en";
}
const fragments = [
  [" · 表面 ", " · surfaces "],
  ["本地预设未读取：", "Could not load saved presets: "],
  ["保存失败：", "Save failed: "], ["导入失败：", "Import failed: "],
  ["导出失败：", "Export failed: "], ["复制未完成：", "Copy failed: "],
  ["，可从文本框手动复制。", ". Copy the text manually."],
  ["已应用；本地保存失败：", "Applied; local save failed: "],
  ["JSON 格式错误：", "Invalid JSON: "], ["无效选项：", "Invalid option: "],
  ["无效数值：", "Invalid number: "], ["必须是布尔值", "must be a boolean"],
  ["图片加载失败：", "Image failed to load: "], ["，已回退网格", "; using the grid"],
  ["已添加示例审核步骤 · ", "Example review step added · "],
  ["点击 ", "Clicks "], ["切换后端 ", "Switch backend "],
  ["已挂载 · ", "Mounted · "], ["已卸载 · ", "Unmounted · "],
  [" 个可观察 controller · ", " observed controllers · "],
  [" 已释放", " disposed"], [" · 10 次完成", " · 10 cycles complete"],
  ["归档采样 ", "Archived run "], [" · 采样结束", " · sampling complete"],
  [" · 测试中，请保留当前标签页", " · running; keep this tab active"],
  [" 失败 / ", " failed / "], [" 跳过", " skipped"],
  ["，挂载 / 卸载 / 更新 / 输入契约。", ", mount / unmount / update / input contracts."],
];

// Translate only lab-owned text. No schema keys, URLs, numeric values or core APIs
// are changed. Exact aliases also allow in-place language changes of runtime copy.
export function createTranslator(initial = "en") {
  let language = resolveLanguage(initial);
  const rows = [...copy, ...fragments.map(([zh, en]) => [zh, en, zh])];
  const variants = new Map();
  for (const row of rows) for (const value of new Set(row)) variants.set(value, row);
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp([...variants.keys()].sort((a, b) => b.length - a.length).map(escape).join("|"), "g");
  const rendered = new Map();
  const translate = (value) => {
    const input = String(value ?? "");
    const canonical = rendered.get(input) ?? input;
    const trimmed = canonical.trim();
    const exact = variants.get(trimmed);
    const output = exact
      ? canonical.replace(trimmed, exact[language === "en" ? 1 : 2])
      : canonical.replace(pattern, (part) => variants.get(part)[language === "en" ? 1 : 2]);
    if (output !== canonical) {
      if (rendered.size >= 4096) rendered.clear();
      rendered.set(output, canonical);
    }
    return output;
  };
  return {
    t: translate,
    setLanguage(value) { language = resolveLanguage(value); },
    get language() { return language; },
  };
}
