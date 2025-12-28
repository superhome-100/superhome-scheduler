<script lang="ts">
    import { onMount } from "svelte";
    import SettingsConfigForm from "./SettingsConfigForm.svelte";
    import SettingsConfigList from "./SettingsConfigList.svelte";
    import type { SettingsUpdate } from "../../types/settings";
    import { showLoading, hideLoading } from "../../stores/ui";

    let listRef: SettingsConfigList | null = null;
    let listLoading = false;
    let error: string | null = null;
    let editing: SettingsUpdate | null = null;
    let isModalOpen = false;

    function onEdit(e: CustomEvent<{ row: SettingsUpdate }>) {
        editing = e.detail.row;
        isModalOpen = true;
    }

    function onSaved() {
        refreshAll();
        isModalOpen = false;
        // Do not clear editing so user thinks it's done.
        // Actually, create implies new.
    }

    function onCancelEdit() {
        editing = null;
        isModalOpen = false;
    }

    function openNewConfig() {
        editing = null;
        isModalOpen = true;
    }

    async function refreshAll() {
        error = null;
        listLoading = true;
        showLoading("Refreshing settings...");
        await listRef?.load?.();
        listLoading = false;
        hideLoading();
    }

    onMount(refreshAll);
</script>

<div
    class="card bg-base-100 shadow-lg border border-base-300 mt-6 text-xs w-full max-w-full overflow-hidden"
>
    <div class="card-body p-4 w-full">
        <div class="flex items-center justify-between mb-4">
            <h2 class="card-title text-sm">Settings Config</h2>
            <div class="flex gap-2">
                <button class="btn btn-primary btn-xs" on:click={openNewConfig}>
                    + New Configuration
                </button>
                <button
                    class="btn btn-ghost btn-xs"
                    on:click={refreshAll}
                    disabled={listLoading}
                    aria-busy={listLoading}
                >
                    Refresh
                </button>
            </div>
        </div>

        {#if error}
            <div class="alert alert-error text-xs mb-2">
                <span>{error}</span>
            </div>
        {/if}

        <!-- List -->
        <h3 class="text-xs font-bold mt-2 mb-2">History of Settings Updates</h3>
        <SettingsConfigList
            bind:this={listRef}
            on:edit={onEdit}
            on:deleted={refreshAll}
        />
    </div>
</div>

<!-- Modal -->
<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog class="modal" class:modal-open={isModalOpen}>
    <div class="modal-box w-11/12 max-w-5xl bg-base-100">
        <form method="dialog">
            <button
                class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                on:click={() => (isModalOpen = false)}>✕</button
            >
        </form>

        <div id="settings-config-form-container">
            <SettingsConfigForm
                {editing}
                on:saved={onSaved}
                on:error={(e) => (error = e.detail.message)}
                on:cancelEdit={onCancelEdit}
            />
        </div>
    </div>
    <form method="dialog" class="modal-backdrop">
        <button on:click={() => (isModalOpen = false)}>close</button>
    </form>
</dialog>
