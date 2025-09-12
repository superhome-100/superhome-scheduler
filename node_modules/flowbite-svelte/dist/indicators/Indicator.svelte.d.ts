import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        color?: "gray" | "red" | "yellow" | "green" | "indigo" | "purple" | "blue" | "dark" | "none" | "teal" | undefined;
        rounded?: boolean | undefined;
        size?: "xs" | "sm" | "md" | "lg" | "xl" | undefined;
        border?: boolean | undefined;
        placement?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | undefined;
        offset?: boolean | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type IndicatorProps = typeof __propDef.props;
export type IndicatorEvents = typeof __propDef.events;
export type IndicatorSlots = typeof __propDef.slots;
export default class Indicator extends SvelteComponentTyped<IndicatorProps, IndicatorEvents, IndicatorSlots> {
}
export {};
//# sourceMappingURL=Indicator.svelte.d.ts.map