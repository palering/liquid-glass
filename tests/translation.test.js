import test from "node:test";
import assert from "node:assert/strict";
import { createTranslator, resolveLanguage } from "../lab/translation.js";
import { opticalFields } from "../src/config.js";

test("explicit locale wins, saved locale follows, invalid values use English", () => {
  assert.equal(resolveLanguage("zh-CN", "en"), "zh-CN");
  assert.equal(resolveLanguage("en", "zh-CN"), "en");
  assert.equal(resolveLanguage("invalid", "zh-CN"), "zh-CN");
  assert.equal(resolveLanguage("invalid", "invalid"), "en");
});
test("every optical label has English copy without changing field identifiers", () => {
  const { t } = createTranslator("en");
  for (const field of opticalFields) {
    assert.doesNotMatch(t(field[1]), /[\u3400-\u9fff]/);
    assert.equal(t(field[0]), field[0]);
  }
});
test("dynamic status switches both directions and retains opaque diagnostic details", () => {
  const translator = createTranslator("en");
  const english = translator.t("导入失败：JSON 格式错误：Unexpected token at position 7");
  assert.equal(english, "Import failed: Invalid JSON: Unexpected token at position 7");
  translator.setLanguage("zh-CN");
  assert.equal(translator.t(english), "导入失败：JSON 格式错误：Unexpected token at position 7");
  assert.equal(translator.t("Clicks 3"), "点击 3");
});
test("translation is idempotent for runtime copy and keeps counters", () => {
  const { t } = createTranslator("en");
  const message = t("已卸载 · 11 个可观察 controller · 11 已释放 · 10 次完成");
  assert.equal(message, "Unmounted · 11 observed controllers · 11 disposed · 10 cycles complete");
  assert.equal(t(message), message);
});
