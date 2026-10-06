import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { GlassController } from "./controller.js";
const GlassContext = createContext(null);
export function GlassProvider({ children, settings, className = "", onState, ...props }) {
  const ref = useRef(null),
    [controller, setController] = useState(null);
  const initial = useRef(settings);
  useEffect(() => {
    const c = new GlassController(ref.current, initial.current);
    setController(c);
    return () => c.dispose();
  }, []);
  useEffect(() => {
    if (controller && settings) void controller.setSettings(settings);
  }, [controller, settings]);
  useEffect(
    () => (controller && onState ? controller.subscribe(onState) : undefined),
    [controller, onState],
  );
  return createElement(
    "div",
    { ...props, ref, className: `lg-stage ${className}` },
    createElement(GlassContext.Provider, { value: controller }, children),
  );
}
export function GlassSurface({
  children,
  kind = "card",
  radius = 20,
  className = "",
  as = "div",
  id,
  zIndex = 0,
  ...props
}) {
  const controller = useContext(GlassContext),
    ref = useRef(null);
  useEffect(
    () => controller?.register(ref.current, { id, kind, radius, zIndex }),
    [controller, id, kind, radius, zIndex],
  );
  return createElement(
    as,
    { ...props, ref, className: `lg-surface ${className}` },
    createElement(
      as === "button" ? "span" : "div",
      { className: "lg-content" },
      children,
    ),
  );
}
export function useGlass() {
  const c = useContext(GlassContext);
  const [state, setState] = useState(null);
  useEffect(() => c?.subscribe(setState), [c]);
  return { controller: c, state };
}
