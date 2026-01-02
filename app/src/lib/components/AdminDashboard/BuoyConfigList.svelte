<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import { buoyService } from "../../services/buoyService";
    import type { Buoy } from "../../types/buoy";
    import { showLoading, hideLoading } from "../../stores/ui";
    import BuoyConfigForm from "./BuoyConfigForm.svelte";
    import ConfirmModal from "../ConfirmModal.svelte";

    const dispatch = createEventDispatcher();

    let buoys: Buoy[] = [];
    let editingBuoy: Buoy | null = null;
    let error: string | null = null;

    let isModalOpen = false;
    let isDeleteModalOpen = false;
    let buoyToDelete: string | null = null;

    export async function loadBuoys() {
        showLoading("Loading buoys...");
        try {
            const res = await buoyService.getBuoys();
            if (res.error) {
                error = res.error;
            } else {
                buoys = res.data || [];
            }
        } finally {
            hideLoading();
        }
    }

    onMount(() => {
        loadBuoys();
    });

    function handleEdit(buoy: Buoy) {
        editingBuoy = buoy;
        isModalOpen = true;
    }

    function handleNew() {
        editingBuoy = null;
        isModalOpen = true;
    }

    function openDeleteModal(buoy_name: string) {
        buoyToDelete = buoy_name;
        isDeleteModalOpen = true;
    }

    async function handleDelete() {
        if (!buoyToDelete) return;

        const name = buoyToDelete;
        isDeleteModalOpen = false;
        buoyToDelete = null;

        showLoading("Deleting buoy...");
        try {
            const res = await buoyService.deleteBuoy(name);
            if (!res.success) {
                dispatch("error", {
                    message: res.error || "Failed to delete buoy",
                });
                return;
            }
            await loadBuoys();
        } finally {
            hideLoading();
        }
    }

    function handleSaved() {
        editingBuoy = null;
        isModalOpen = false;
        loadBuoys();
    }

    function handleCancel() {
        editingBuoy = null;
        isModalOpen = false;
    }

    function handleError(event: CustomEvent<{ message: string }>) {
        error = event.detail.message;
        setTimeout(() => {
            error = null;
        }, 5000);
    }
</script>

<div class="space-y-6">
    <div class="flex justify-between items-center">
        <h3 class="text-lg font-bold">Buoy Configuration</h3>
        <div class="flex gap-2">
            <button class="btn btn-primary btn-sm" on:click={handleNew}>
                + Add New Buoy
            </button>
            <button class="btn btn-ghost btn-sm" on:click={loadBuoys}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
                Refresh
            </button>
        </div>
    </div>

    {#if error}
        <div class="alert alert-error shadow-sm text-sm py-2">
            <span>{error}</span>
        </div>
    {/if}

    <dialog class="modal" class:modal-open={isModalOpen}>
        <div class="modal-box w-11/12 max-w-2xl bg-base-100 p-0">
            <form method="dialog">
                <button
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
                    on:click={handleCancel}>✕</button
                >
            </form>
            <div class="p-0">
                <BuoyConfigForm
                    editing={editingBuoy}
                    on:saved={handleSaved}
                    on:cancel={handleCancel}
                    on:error={handleError}
                />
            </div>
        </div>
        <form method="dialog" class="modal-backdrop">
            <button on:click={handleCancel}>close</button>
        </form>
    </dialog>

    <ConfirmModal
        bind:open={isDeleteModalOpen}
        title="Delete Buoy"
        message={`Are you sure you want to delete buoy "${buoyToDelete}"? This action cannot be undone.`}
        confirmText="Delete"
        on:confirm={handleDelete}
        on:cancel={() => (buoyToDelete = null)}
    />

    <div class="bg-base-100 rounded-box border border-base-300 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="table table-zebra w-full table-sm">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Max Depth</th>
                        <th class="text-center">Pulley</th>
                        <th class="text-center">Plate</th>
                        <th class="text-center">Large</th>
                        <th class="text-center">Deep FIM</th>
                        <th class="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each buoys as buoy}
                        <tr>
                            <td class="font-semibold">{buoy.buoy_name}</td>
                            <td>{buoy.max_depth}m</td>
                            <td class="text-center">
                                {#if buoy.pulley}
                                    <div class="badge badge-success badge-xs">
                                        ✓
                                    </div>
                                {:else}
                                    <div
                                        class="badge badge-ghost badge-xs opacity-30"
                                    >
                                        ✗
                                    </div>
                                {/if}
                            </td>
                            <td class="text-center">
                                {#if buoy.bottom_plate}
                                    <div class="badge badge-success badge-xs">
                                        ✓
                                    </div>
                                {:else}
                                    <div
                                        class="badge badge-ghost badge-xs opacity-30"
                                    >
                                        ✗
                                    </div>
                                {/if}
                            </td>
                            <td class="text-center">
                                {#if buoy.large_buoy}
                                    <div class="badge badge-success badge-xs">
                                        ✓
                                    </div>
                                {:else}
                                    <div
                                        class="badge badge-ghost badge-xs opacity-30"
                                    >
                                        ✗
                                    </div>
                                {/if}
                            </td>
                            <td class="text-center">
                                {#if buoy.deep_fim_training}
                                    <div class="badge badge-success badge-xs">
                                        ✓
                                    </div>
                                {:else}
                                    <div
                                        class="badge badge-ghost badge-xs opacity-30"
                                    >
                                        ✗
                                    </div>
                                {/if}
                            </td>
                            <td class="text-right flex justify-end gap-1">
                                <button
                                    class="btn btn-ghost btn-xs text-primary"
                                    on:click={() => handleEdit(buoy)}
                                    >Edit</button
                                >
                                <button
                                    class="btn btn-ghost btn-xs text-error"
                                    on:click={() =>
                                        openDeleteModal(buoy.buoy_name)}
                                    >Delete</button
                                >
                            </td>
                        </tr>
                    {:else}
                        <tr>
                            <td
                                colspan="7"
                                class="text-center py-8 text-base-content/50"
                                >No buoys configured</td
                            >
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>
