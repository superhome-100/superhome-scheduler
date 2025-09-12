import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        color?: "red" | "yellow" | "green" | "default" | "purple" | "blue" | "custom" | undefined;
    };
    events: {
        click: MouseEvent;
        contextmenu: MouseEvent;
    } & {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type TableBodyRowProps = typeof __propDef.props;
export type TableBodyRowEvents = typeof __propDef.events;
export type TableBodyRowSlots = typeof __propDef.slots;
export default class TableBodyRow extends SvelteComponentTyped<TableBodyRowProps, TableBodyRowEvents, TableBodyRowSlots> {
}
export {};
//# sourceMappingURL=TableBodyRow.svelte.d.ts.map