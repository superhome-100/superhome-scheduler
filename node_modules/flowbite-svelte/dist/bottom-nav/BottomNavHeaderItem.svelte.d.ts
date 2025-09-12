import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        itemName?: string | undefined;
        active?: boolean | undefined;
        defaultClass?: string | undefined;
        activeClass?: string | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type BottomNavHeaderItemProps = typeof __propDef.props;
export type BottomNavHeaderItemEvents = typeof __propDef.events;
export type BottomNavHeaderItemSlots = typeof __propDef.slots;
export default class BottomNavHeaderItem extends SvelteComponentTyped<BottomNavHeaderItemProps, BottomNavHeaderItemEvents, BottomNavHeaderItemSlots> {
}
export {};
//# sourceMappingURL=BottomNavHeaderItem.svelte.d.ts.map