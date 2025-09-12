import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        padding?: string | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type TableHeadCellProps = typeof __propDef.props;
export type TableHeadCellEvents = typeof __propDef.events;
export type TableHeadCellSlots = typeof __propDef.slots;
export default class TableHeadCell extends SvelteComponentTyped<TableHeadCellProps, TableHeadCellEvents, TableHeadCellSlots> {
}
export {};
//# sourceMappingURL=TableHeadCell.svelte.d.ts.map