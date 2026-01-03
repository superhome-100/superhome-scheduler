<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { buoyService } from "../../services/buoyService";
    import type { Buoy } from "../../types/buoy";
    import { showLoading, hideLoading } from "../../stores/ui";
    import "../../styles/inputs.css";

    const dispatch = createEventDispatcher();

    export let editing: Buoy | null = null;

    let error: string | null = null;
    let success: string | null = null;

    let form: Partial<Buoy> & { new_buoy_name?: string } = {
        buoy_name: "",
        max_depth: 30,
        pulley: false,
        bottom_plate: false,
        large_buoy: false,
        deep_fim_training: false,
    };

    $: if (editing) {
        error = null;
        success = null;
        form = {
            buoy_name: editing.buoy_name,
            max_depth: editing.max_depth,
            pulley: editing.pulley,
            bottom_plate: editing.bottom_plate,
            large_buoy: editing.large_buoy,
            deep_fim_training: editing.deep_fim_training,
        };
    } else {
        error = null;
        success = null;
        resetFields();
    }

    function cancel() {
        error = null;
        success = null;
        dispatch("cancel");
    }

    async function save() {
        error = null;
        if (!form.buoy_name) {
            error = "Buoy name is required";
            return;
        }

        showLoading("Updating buoy...");
        try {
            const updates: any = { ...form };
            updates.max_depth = Number(updates.max_depth);

            if (editing && form.buoy_name !== editing.buoy_name) {
                updates.new_buoy_name = form.buoy_name;
            }
            delete updates.buoy_name;

            const res = await buoyService.updateBuoy(
                editing?.buoy_name || "",
                updates,
            );

            if (!res.success) {
                error = res.error || "Failed to update buoy";
                dispatch("error", { message: error });
                return;
            }

            success = "Buoy updated successfully";
            setTimeout(() => dispatch("saved"), 800);
        } finally {
            hideLoading();
        }
    }

    async function saveNew() {
        error = null;
        if (!form.buoy_name) {
            error = "Buoy name is required";
            return;
        }

        showLoading("Creating new buoy...");
        try {
            const payload = { ...form };
            payload.max_depth = Number(payload.max_depth);

            const res = await buoyService.createBuoy(payload);

            if (!res.success) {
                error = res.error || "Failed to create buoy";
                dispatch("error", { message: error });
                return;
            }

            success = "New buoy created successfully";
            setTimeout(() => {
                dispatch("saved");
                resetFields();
            }, 800);
        } finally {
            hideLoading();
        }
    }

    function resetFields() {
        form = {
            buoy_name: "",
            max_depth: 30,
            pulley: false,
            bottom_plate: false,
            large_buoy: false,
            deep_fim_training: false,
        };
    }
</script>

<div class="p-6">
    <div class="flex items-center justify-between mb-6">
        <h4 class="text-lg font-bold">
            {editing ? "Edit Buoy" : "Add New Buoy"}
        </h4>
    </div>

    {#if error}
        <div class="alert alert-error mb-6 shadow-sm">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                /></svg
            >
            <span>{error}</span>
        </div>
    {/if}

    {#if success}
        <div class="alert alert-success mb-6 shadow-sm">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2l4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                /></svg
            >
            <span>{success}</span>
        </div>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="form-control">
            <label class="label py-1" for="buoy-name">
                <span
                    class="label-text text-xs font-bold opacity-70 uppercase tracking-wider"
                    >Buoy Name</span
                >
            </label>
            <input
                id="buoy-name"
                class="input input-bordered w-full h-12"
                type="text"
                placeholder="e.g. Buoy A"
                bind:value={form.buoy_name}
            />
        </div>

        <div class="form-control">
            <label class="label py-1" for="max-depth">
                <span
                    class="label-text text-xs font-bold opacity-70 uppercase tracking-wider"
                    >Max Depth (m)</span
                >
            </label>
            <input
                id="max-depth"
                class="input input-bordered w-full h-12"
                type="number"
                bind:value={form.max_depth}
            />
        </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <div
            class="form-control bg-base-200/50 p-3 rounded-xl border border-base-300/50 hover:bg-base-200 transition-colors"
        >
            <label class="label cursor-pointer justify-between">
                <span class="label-text font-medium">Pulley System</span>
                <input
                    type="checkbox"
                    class="checkbox checkbox-primary"
                    bind:checked={form.pulley}
                />
            </label>
        </div>
        <div
            class="form-control bg-base-200/50 p-3 rounded-xl border border-base-300/50 hover:bg-base-200 transition-colors"
        >
            <label class="label cursor-pointer justify-between">
                <span class="label-text font-medium">Bottom Plate</span>
                <input
                    type="checkbox"
                    class="checkbox checkbox-primary"
                    bind:checked={form.bottom_plate}
                />
            </label>
        </div>
        <div
            class="form-control bg-base-200/50 p-3 rounded-xl border border-base-300/50 hover:bg-base-200 transition-colors"
        >
            <label class="label cursor-pointer justify-between">
                <span class="label-text font-medium">Large Buoy</span>
                <input
                    type="checkbox"
                    class="checkbox checkbox-primary"
                    bind:checked={form.large_buoy}
                />
            </label>
        </div>
        <div
            class="form-control bg-base-200/50 p-3 rounded-xl border border-base-300/50 hover:bg-base-200 transition-colors"
        >
            <label class="label cursor-pointer justify-between">
                <span class="label-text font-medium">Deep FIM Training</span>
                <input
                    type="checkbox"
                    class="checkbox checkbox-primary"
                    bind:checked={form.deep_fim_training}
                />
            </label>
        </div>
    </div>

    <div
        class="flex flex-col sm:flex-row justify-end gap-3 mt-10 pt-6 border-t border-base-300"
    >
        {#if editing}
            <button class="btn btn-ghost order-2 sm:order-1" on:click={cancel}
                >Cancel</button
            >
            <button
                class="btn btn-primary px-8 order-1 sm:order-2"
                on:click={save}
            >
                Update Buoy
            </button>
        {:else}
            <button class="btn btn-primary px-8" on:click={saveNew}>
                Save New Buoy
            </button>
        {/if}
    </div>
</div>
