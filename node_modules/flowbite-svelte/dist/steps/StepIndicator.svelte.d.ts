import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: any;
        steps?: string[] | undefined;
        currentStep?: number | undefined;
        size?: string | undefined;
        color?: "gray" | "red" | "yellow" | "green" | "indigo" | "purple" | "pink" | "blue" | undefined;
        glow?: boolean | undefined;
        hideLabel?: boolean | undefined;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type StepIndicatorProps = typeof __propDef.props;
export type StepIndicatorEvents = typeof __propDef.events;
export type StepIndicatorSlots = typeof __propDef.slots;
export default class StepIndicator extends SvelteComponentTyped<StepIndicatorProps, StepIndicatorEvents, StepIndicatorSlots> {
}
export {};
//# sourceMappingURL=StepIndicator.svelte.d.ts.map