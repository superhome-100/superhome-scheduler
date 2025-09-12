import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        id?: string | undefined;
        position?: "static" | "fixed" | "absolute" | "relative" | "sticky" | undefined;
        dismissable?: boolean | undefined;
        bannerType?: "default" | "custom" | "bottom" | "cta" | "signup" | "info" | undefined;
        divDefault?: string | undefined;
        insideDiv?: string | undefined;
    };
    events: {
        click: MouseEvent;
        change: CustomEvent<any>;
        keydown: CustomEvent<any>;
        keyup: CustomEvent<any>;
        focus: CustomEvent<any>;
        blur: CustomEvent<any>;
        mouseenter: CustomEvent<any>;
        mouseleave: CustomEvent<any>;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        header: {};
        default: {};
    };
};
export type BannerProps = typeof __propDef.props;
export type BannerEvents = typeof __propDef.events;
export type BannerSlots = typeof __propDef.slots;
export default class Banner extends SvelteComponentTyped<BannerProps, BannerEvents, BannerSlots> {
}
export {};
//# sourceMappingURL=Banner.svelte.d.ts.map