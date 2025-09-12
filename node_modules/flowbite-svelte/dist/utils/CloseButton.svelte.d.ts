import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        name?: string | undefined;
    };
    events: {
        click: MouseEvent;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type CloseButtonProps = typeof __propDef.props;
export type CloseButtonEvents = typeof __propDef.events;
export type CloseButtonSlots = typeof __propDef.slots;
export default class CloseButton extends SvelteComponentTyped<CloseButtonProps, CloseButtonEvents, CloseButtonSlots> {
}
export {};
//# sourceMappingURL=CloseButton.svelte.d.ts.map