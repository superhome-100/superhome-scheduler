import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        btnName?: string | undefined;
        appBtnPosition?: "custom" | "left" | "middle" | "right" | undefined;
        btnDefault?: string | undefined;
        spanDefault?: string | undefined;
    };
    events: {
        click: MouseEvent;
        change: Event;
        keydown: KeyboardEvent;
        keyup: KeyboardEvent;
        focus: FocusEvent;
        blur: FocusEvent;
        mouseenter: MouseEvent;
        mouseleave: MouseEvent;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type BottomNavItemProps = typeof __propDef.props;
export type BottomNavItemEvents = typeof __propDef.events;
export type BottomNavItemSlots = typeof __propDef.slots;
export default class BottomNavItem extends SvelteComponentTyped<BottomNavItemProps, BottomNavItemEvents, BottomNavItemSlots> {
}
export {};
//# sourceMappingURL=BottomNavItem.svelte.d.ts.map