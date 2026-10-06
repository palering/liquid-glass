import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactElement,
  ReactNode,
} from "react";
import type {
  GlassController,
  Settings,
  State,
  SurfaceOptions,
} from "./core.js";
export interface GlassProviderProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  children?: ReactNode;
  settings?: Settings;
  onState?: (state: State) => void;
}
export function GlassProvider(props: GlassProviderProps): ReactElement;
export type GlassSurfaceProps<T extends ElementType = "div"> =
  SurfaceOptions & { as?: T; children?: ReactNode } & Omit<
      ComponentPropsWithoutRef<T>,
      keyof SurfaceOptions | "as" | "children"
    >;
export function GlassSurface<T extends ElementType = "div">(
  props: GlassSurfaceProps<T>,
): ReactElement;
export function useGlass(): {
  controller: GlassController | null;
  state: State | null;
};
