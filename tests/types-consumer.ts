import {
  GlassController,
  createPreset,
  parsePreset,
  looks,
  type Settings,
} from "@workspace/liquid-glass";
import { GlassProvider, GlassSurface } from "@workspace/liquid-glass/react";
import { createElement } from "react";
const settings: Settings = { backend: "auto", controls: looks.frosted };
const glass = new GlassController(document.createElement("div"), settings);
glass.register(document.createElement("button"), {
  kind: "control",
  zIndex: 2,
});
glass.subscribe((state) => state.activeBackend);
void glass.setSettings(parsePreset(createPreset("sample", settings)).settings);
createElement(GlassProvider, { settings, style: { height: 400 } });
GlassSurface({ as: "button", kind: "control", onClick: () => {}, zIndex: 2 });
// @ts-expect-error Unknown backend must not silently enter a public typed configuration.
const invalid: Settings = { backend: "webgl1" };
void invalid;
