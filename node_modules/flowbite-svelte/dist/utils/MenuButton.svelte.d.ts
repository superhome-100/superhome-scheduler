import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        name?: string | undefined;
        vertical?: boolean | undefined;
    };
    events: {
        click: MouseEvent;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type MenuButtonProps = typeof __propDef.props;
export type MenuButtonEvents = typeof __propDef.events;
export type MenuButtonSlots = typeof __propDef.slots;
export default class MenuButton extends SvelteComponentTyped<MenuButtonProps, MenuButtonEvents, MenuButtonSlots> {
}
export {};
//# sourceMappingURL=MenuButton.svelte.d.ts.map