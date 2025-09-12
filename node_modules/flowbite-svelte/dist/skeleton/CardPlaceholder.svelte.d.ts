import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        divClass?: string | undefined;
        size?: string | number | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type CardPlaceholderProps = typeof __propDef.props;
export type CardPlaceholderEvents = typeof __propDef.events;
export type CardPlaceholderSlots = typeof __propDef.slots;
export default class CardPlaceholder extends SvelteComponentTyped<CardPlaceholderProps, CardPlaceholderEvents, CardPlaceholderSlots> {
}
export {};
//# sourceMappingURL=CardPlaceholder.svelte.d.ts.map