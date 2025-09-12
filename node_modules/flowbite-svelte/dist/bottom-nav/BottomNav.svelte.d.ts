import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        position?: "static" | "fixed" | "absolute" | "relative" | "sticky" | undefined;
        navType?: "default" | "border" | "custom" | "group" | "application" | "pagination" | "card" | "meeting" | "video" | undefined;
        outerDefault?: string | undefined;
        innerDefault?: string | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        header: {};
        default: {};
    };
};
export type BottomNavProps = typeof __propDef.props;
export type BottomNavEvents = typeof __propDef.events;
export type BottomNavSlots = typeof __propDef.slots;
export default class BottomNav extends SvelteComponentTyped<BottomNavProps, BottomNavEvents, BottomNavSlots> {
}
export {};
//# sourceMappingURL=BottomNav.svelte.d.ts.map