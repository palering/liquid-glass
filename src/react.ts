import type {ComponentPropsWithoutRef,ElementType,ReactNode,ReactElement} from 'react';
import type {Settings,State,SurfaceOptions} from './contracts.js';
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { GlassController } from "./controller.js";
const GlassContext = createContext<GlassController|null>(null);
export interface GlassProviderProps extends Omit<ComponentPropsWithoutRef<'div'>,'children'> {children?:ReactNode;settings?:Settings;onState?:(state:State)=>void}
export type GlassSurfaceProps<T extends ElementType='div'>=SurfaceOptions&{as?:T;children?:ReactNode}&Omit<ComponentPropsWithoutRef<T>,keyof SurfaceOptions|'as'|'children'>;
export function GlassProvider({ children, settings, className = "", onState, ...props }:GlassProviderProps):ReactElement {
  const ref = useRef<HTMLDivElement|null>(null),
    [controller, setController] = useState<GlassController|null>(null);
  const initial = useRef(settings);
  useEffect(() => {
    const c = new GlassController(ref.current as HTMLDivElement, initial.current);
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
export function GlassSurface<T extends ElementType="div">(props:GlassSurfaceProps<T>):ReactElement;
export function GlassSurface({
  children,
  kind = "card",
  radius = 20,
  className = "",
  as = "div",
  id,
  zIndex = 0,
  ...props
}:SurfaceOptions&{as?:ElementType;children?:ReactNode;className?:unknown}):ReactElement {
  const controller = useContext(GlassContext),
    ref = useRef<HTMLElement|null>(null);
  useEffect(
    () => controller?.register(ref.current as HTMLElement, { id, kind, radius, zIndex }),
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
  const [state, setState] = useState<State|null>(null);
  useEffect(() => c?.subscribe(setState), [c]);
  return { controller: c, state };
}
