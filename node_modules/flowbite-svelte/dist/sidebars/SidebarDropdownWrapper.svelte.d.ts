import { SvelteComponentTyped } from "svelte";
import type { TransitionTypes, TransitionParamTypes } from '../types';
declare const __propDef: {
    props: {
        [x: string]: any;
        btnClass?: string | undefined;
        label?: string | undefined;
        spanClass?: string | undefined;
        ulClass?: string | undefined;
        transitionType?: TransitionTypes | undefined;
        transitionParams?: TransitionParamTypes | undefined;
        isOpen?: boolean | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        icon: {};
        arrowup: {};
        arrowdown: {};
        default: {};
    };
};
export type SidebarDropdownWrapperProps = typeof __propDef.props;
export type SidebarDropdownWrapperEvents = typeof __propDef.events;
export type SidebarDropdownWrapperSlots = typeof __propDef.slots;
export default class SidebarDropdownWrapper extends SvelteComponentTyped<SidebarDropdownWrapperProps, SidebarDropdownWrapperEvents, SidebarDropdownWrapperSlots> {
}
export {};
//# sourceMappingURL=SidebarDropdownWrapper.svelte.d.ts.map