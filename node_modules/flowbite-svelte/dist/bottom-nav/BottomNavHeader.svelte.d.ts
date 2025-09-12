import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        outerClass?: string | undefined;
        innerClass?: string | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type BottomNavHeaderProps = typeof __propDef.props;
export type BottomNavHeaderEvents = typeof __propDef.events;
export type BottomNavHeaderSlots = typeof __propDef.slots;
export default class BottomNavHeader extends SvelteComponentTyped<BottomNavHeaderProps, BottomNavHeaderEvents, BottomNavHeaderSlots> {
}
export {};
//# sourceMappingURL=BottomNavHeader.svelte.d.ts.map