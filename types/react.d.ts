// Generated from src by npm run types:generate. Do not edit.
import { ComponentPropsWithoutRef, ReactNode, ReactElement, ElementType } from 'react';
import { Settings, State, SurfaceOptions, GlassController } from './core.js';

interface GlassProviderProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
    children?: ReactNode;
    settings?: Settings;
    onState?: (state: State) => void;
}
type GlassSurfaceProps<T extends ElementType = 'div'> = SurfaceOptions & {
    as?: T;
    children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, keyof SurfaceOptions | 'as' | 'children'>;
declare function GlassProvider({ children, settings, className, onState, ...props }: GlassProviderProps): ReactElement;
declare function GlassSurface<T extends ElementType = "div">(props: GlassSurfaceProps<T>): ReactElement;
declare function useGlass(): {
    controller: GlassController | null;
    state: State | null;
};

export { GlassProvider, GlassSurface, useGlass };
export type { GlassProviderProps, GlassSurfaceProps };
