import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        color?: "gray" | "red" | "yellow" | "green" | "indigo" | "default" | "purple" | "pink" | "blue" | "dark" | undefined;
        name?: string | undefined;
        ariaLabel?: string | undefined;
        size?: "xs" | "sm" | "md" | "lg" | undefined;
        href?: string | undefined;
    };
    events: {
        click: MouseEvent;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {
            svgSize: string;
        };
    };
};
export type ToolbarButtonProps = typeof __propDef.props;
export type ToolbarButtonEvents = typeof __propDef.events;
export type ToolbarButtonSlots = typeof __propDef.slots;
export default class ToolbarButton extends SvelteComponentTyped<ToolbarButtonProps, ToolbarButtonEvents, ToolbarButtonSlots> {
}
export {};
//# sourceMappingURL=ToolbarButton.svelte.d.ts.map