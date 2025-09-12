import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        divClass?: string | undefined;
        imgHeight?: string | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type ImagePlaceholderProps = typeof __propDef.props;
export type ImagePlaceholderEvents = typeof __propDef.events;
export type ImagePlaceholderSlots = typeof __propDef.slots;
export default class ImagePlaceholder extends SvelteComponentTyped<ImagePlaceholderProps, ImagePlaceholderEvents, ImagePlaceholderSlots> {
}
export {};
//# sourceMappingURL=ImagePlaceholder.svelte.d.ts.map