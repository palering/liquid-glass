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
glass.subscribe((state) => [state.activeBackend, state.geometryMode, state.sceneReason]);
glass.setGeometryProvider(() => ({
  width: 400, height: 300,
  surfaces: new Map([["card", { x: 10, y: 20, w: 100, h: 80, scale: 0.5 }]])
}));
glass.setGeometryProvider();
glass.setScenePainter((context, frame) => context.fillRect(0, 0, frame.width, frame.height));
glass.setScenePainter(null);
glass.invalidateScene();
void glass.setSettings(parsePreset(createPreset("sample", settings)).settings);
void glass.setSettings({performance:{preset:'custom',overrides:{dprCap:1,textureBudgetMiB:32},adaptive:false}});
const profile = glass.getState().performance;
if (profile) console.log(profile.estimatedTextureBytes,profile.adjustmentReasons);
createElement(GlassProvider, { settings, style: { height: 400 } });
GlassSurface({ as: "button", kind: "control", onClick: () => {}, zIndex: 2 });
// @ts-expect-error Unknown backend must not silently enter a public typed configuration.
const invalid: Settings = { backend: "webgl1" };
void invalid;

// Generated React declarations must retain the same nominal controller identity.
import {useGlass} from '@workspace/liquid-glass/react';
const hookController:GlassController|null=useGlass().controller;
void hookController;
GlassSurface({as:'a',href:'/example',kind:'card'});
// @ts-expect-error button does not accept href.
GlassSurface({as:'button',href:'/example'});
// @ts-expect-error Scene painter receives typed dimensions, never a string width.
glass.setScenePainter((_context,frame)=>{const width:string=frame.width;void width;});
// @ts-expect-error Adaptive performance is deliberately not implemented.
void glass.setSettings({performance:{preset:'balanced',adaptive:true}});
// @ts-expect-error Native bridge experimental auto is not a public Capture option.
void glass.setSettings({capture:'auto'});
