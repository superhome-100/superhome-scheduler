import { SvelteComponentTyped } from "svelte";
import type { ImgType } from '../types';
declare const __propDef: {
    props: {
        [x: string]: any;
        items?: ImgType[] | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type GalleryProps = typeof __propDef.props;
export type GalleryEvents = typeof __propDef.events;
export type GallerySlots = typeof __propDef.slots;
export default class Gallery extends SvelteComponentTyped<GalleryProps, GalleryEvents, GallerySlots> {
}
export {};
//# sourceMappingURL=Gallery.svelte.d.ts.map