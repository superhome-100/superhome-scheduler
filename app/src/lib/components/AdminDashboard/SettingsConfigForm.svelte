<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { settingsApi } from "../../api/settingsApi";
    import type { SettingsUpdate } from "../../types/settings";
    import { showLoading, hideLoading } from "../../stores/ui";
    import "../../styles/inputs.css";

    const dispatch = createEventDispatcher();

    export let editing: SettingsUpdate | null = null;

    let form = {
        settings_name: "default",
        reservationCutOffTimeOW: "18:00",
        cancelationCutOffTimeOW: 60,
        reservationCutOffTimePOOL: 30,
        cancelationCutOffTimePOOL: 60,
        reservationCutOffTimeCLASSROOM: 30,
        cancelationCutOffTimeCLASSROOM: 60,
        reservationLeadTimeDays: 30,
        maxChargeableOWPerMonth: 12,
        availablePoolSlots: "1,2,3,4,5,6,7,8",
        availableClassrooms: "1,2,3",
        poolLabel: "Lane",
        classroomLabel: "Room",
    };

    $: if (editing) {
        form = {
            settings_name: editing.settings_name || "default",
            reservationCutOffTimeOW: editing.reservationCutOffTimeOW,
            cancelationCutOffTimeOW: editing.cancelationCutOffTimeOW,
            reservationCutOffTimePOOL: editing.reservationCutOffTimePOOL,
            cancelationCutOffTimePOOL: editing.cancelationCutOffTimePOOL,
            reservationCutOffTimeCLASSROOM:
                editing.reservationCutOffTimeCLASSROOM,
            cancelationCutOffTimeCLASSROOM:
                editing.cancelationCutOffTimeCLASSROOM,
            reservationLeadTimeDays: editing.reservationLeadTimeDays,
            maxChargeableOWPerMonth: editing.maxChargeableOWPerMonth,
            availablePoolSlots: editing.availablePoolSlots,
            availableClassrooms: editing.availableClassrooms,
            poolLabel: editing.poolLabel,
            classroomLabel: editing.classroomLabel,
        };
    }

    function reset() {
        form = {
            settings_name: "default",
            reservationCutOffTimeOW: "18:00",
            cancelationCutOffTimeOW: 60,
            reservationCutOffTimePOOL: 30,
            cancelationCutOffTimePOOL: 60,
            reservationCutOffTimeCLASSROOM: 30,
            cancelationCutOffTimeCLASSROOM: 60,
            reservationLeadTimeDays: 30,
            maxChargeableOWPerMonth: 12,
            availablePoolSlots: "1,2,3,4,5,6,7,8",
            availableClassrooms: "1,2,3",
            poolLabel: "Lane",
            classroomLabel: "Room",
        };
        dispatch("cancelEdit");
    }

    async function save() {
        // Always Create New Version
        showLoading("Creating new settings version...");
        try {
            const payload = { ...form } as any;
            // We do not send ID so that backend generates a new one (Create)
            // Even if we "edited" an existing one, we are creating a new version.
            const res = await settingsApi.create(payload);
            if (!res.success) {
                dispatch("error", {
                    message: res.error || "Failed to save settings",
                });
                return;
            }
            dispatch("saved", { data: res.data });
            // Keep form filled so user sees what was saved
        } finally {
            hideLoading();
        }
    }
</script>

<div class="bg-base-100 p-4 rounded-box border border-base-300 mb-6">
    <div class="flex items-center gap-2 mb-4">
        <h4 class="text-sm font-bold">New Configuration</h4>
        <span class="text-xs text-base-content/60"
            >- Saving will create a new version history entry.</span
        >
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- General -->
        <div class="form-control">
            <label class="label py-1" for="set-name"
                ><span class="label-text text-xs">Settings Name</span></label
            >
            <input
                id="set-name"
                class="input input-bordered input-sm w-full"
                type="text"
                bind:value={form.settings_name}
            />
        </div>

        <div class="form-control">
            <label class="label py-1" for="set-lead"
                ><span class="label-text text-xs">Lead Time (Days)</span></label
            >
            <input
                id="set-lead"
                class="input input-bordered input-sm w-full no-spinner"
                type="number"
                bind:value={form.reservationLeadTimeDays}
            />
        </div>

        <div class="hidden lg:block">
            <!-- Spacer -->
        </div>

        <!-- OW -->
        <div class="form-control">
            <label class="label py-1" for="set-ow-res"
                ><span class="label-text text-xs">OW Res Cutoff (Time)</span
                ></label
            >
            <input
                id="set-ow-res"
                class="input input-bordered input-sm w-full"
                type="text"
                placeholder="e.g. 18:00"
                bind:value={form.reservationCutOffTimeOW}
            />
        </div>
        <div class="form-control">
            <label class="label py-1" for="set-ow-cancel"
                ><span class="label-text text-xs">OW Cancel Cutoff (Min)</span
                ></label
            >
            <input
                id="set-ow-cancel"
                class="input input-bordered input-sm w-full no-spinner"
                type="number"
                bind:value={form.cancelationCutOffTimeOW}
            />
        </div>
        <div class="form-control">
            <label class="label py-1" for="set-ow-max"
                ><span class="label-text text-xs">Max OW Chargeable/Mo</span
                ></label
            >
            <input
                id="set-ow-max"
                class="input input-bordered input-sm w-full no-spinner"
                type="number"
                bind:value={form.maxChargeableOWPerMonth}
            />
        </div>

        <!-- Pool -->
        <div class="form-control">
            <label class="label py-1" for="set-pool-res"
                ><span class="label-text text-xs">Pool Res Cutoff (Min)</span
                ></label
            >
            <input
                id="set-pool-res"
                class="input input-bordered input-sm w-full no-spinner"
                type="number"
                bind:value={form.reservationCutOffTimePOOL}
            />
        </div>
        <div class="form-control">
            <label class="label py-1" for="set-pool-cancel"
                ><span class="label-text text-xs">Pool Cancel Cutoff (Min)</span
                ></label
            >
            <input
                id="set-pool-cancel"
                class="input input-bordered input-sm w-full no-spinner"
                type="number"
                bind:value={form.cancelationCutOffTimePOOL}
            />
        </div>
        <div class="hidden lg:block">
            <!-- Spacer -->
        </div>

        <!-- Classroom -->
        <div class="form-control">
            <label class="label py-1" for="set-room-res"
                ><span class="label-text text-xs">Class Res Cutoff (Min)</span
                ></label
            >
            <input
                id="set-room-res"
                class="input input-bordered input-sm w-full no-spinner"
                type="number"
                bind:value={form.reservationCutOffTimeCLASSROOM}
            />
        </div>
        <div class="form-control">
            <label class="label py-1" for="set-room-cancel"
                ><span class="label-text text-xs"
                    >Class Cancel Cutoff (Min)</span
                ></label
            >
            <input
                id="set-room-cancel"
                class="input input-bordered input-sm w-full no-spinner"
                type="number"
                bind:value={form.cancelationCutOffTimeCLASSROOM}
            />
        </div>
        <div class="hidden lg:block">
            <!-- Spacer -->
        </div>

        <!-- Resources -->
        <div class="form-control">
            <label class="label py-1" for="set-pool-slots"
                ><span class="label-text text-xs"
                    >Available Pool Slots (csv)</span
                ></label
            >
            <input
                id="set-pool-slots"
                class="input input-bordered input-sm w-full"
                type="text"
                bind:value={form.availablePoolSlots}
            />
        </div>
        <div class="form-control">
            <label class="label py-1" for="set-pool-label"
                ><span class="label-text text-xs">Pool Label</span></label
            >
            <input
                id="set-pool-label"
                class="input input-bordered input-sm w-full"
                type="text"
                bind:value={form.poolLabel}
            />
        </div>
        <div class="hidden lg:block">
            <!-- Spacer -->
        </div>

        <div class="form-control">
            <label class="label py-1" for="set-room-slots"
                ><span class="label-text text-xs"
                    >Available Classrooms (csv)</span
                ></label
            >
            <input
                id="set-room-slots"
                class="input input-bordered input-sm w-full"
                type="text"
                bind:value={form.availableClassrooms}
            />
        </div>
        <div class="form-control">
            <label class="label py-1" for="set-room-label"
                ><span class="label-text text-xs">Classroom Label</span></label
            >
            <input
                id="set-room-label"
                class="input input-bordered input-sm w-full"
                type="text"
                bind:value={form.classroomLabel}
            />
        </div>
    </div>

    <div class="flex justify-end gap-2 mt-6 border-t border-base-200 pt-4">
        <button class="btn btn-primary btn-sm min-w-[100px]" on:click={save}
            >Save New Version</button
        >
        <button class="btn btn-ghost btn-sm" on:click={reset}
            >Reset to Defaults</button
        >
    </div>
</div>
