<script lang="ts">
    import dayjs from "dayjs";
    import { createEventDispatcher } from "svelte";
    import { settingsApi } from "../../api/settingsApi";
    import type { SettingsUpdate } from "../../types/settings";
    import { showLoading, hideLoading } from "../../stores/ui";

    const dispatch = createEventDispatcher();

    let updates: SettingsUpdate[] = [];
    let loading = false;
    let error: string | null = null;

    export async function load() {
        error = null;
        loading = true;
        const res = await settingsApi.listUpdates();
        loading = false;
        if (!res.success) {
            error = res.error ?? "Failed to load settings updates";
            updates = [];
            return;
        }
        updates = res.data;
    }

    function edit(row: SettingsUpdate) {
        // "Copy to form" basically
        dispatch("edit", { row });
    }

    async function remove(id: string) {
        if (
            !confirm(
                "Are you sure you want to delete this setting version? This cannot be undone.",
            )
        )
            return;
        loading = true;
        showLoading("Deleting setting version...");
        const res = await settingsApi.remove(id);
        loading = false;
        hideLoading();
        if (!res.success) {
            error = res.error ?? "Failed to delete setting version";
            return;
        }
        await load();
        dispatch("deleted");
    }
</script>

{#if error}
    <div class="alert alert-error text-xs mb-2"><span>{error}</span></div>
{/if}

<div class="w-full">
    <!-- Desktop Table View -->
    <div
        class="hidden md:block overflow-x-auto card bg-base-100 border border-base-300"
    >
        <table class="table table-zebra table-xs w-full">
            <thead>
                <tr>
                    <th>Created</th>
                    <th>Name</th>
                    <th>Res CutOff OW</th>
                    <th>Cancel CutOff OW</th>
                    <th>Res CutOff Pool</th>
                    <th>Cancel CutOff Pool</th>
                    <th>Lead Time</th>
                    <th>Max OW/Mo</th>
                    <th>Pool Slots</th>
                    <th>Pool Label</th>
                    <th>Class Slots</th>
                    <th>Class Label</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {#if updates.length === 0}
                    <tr>
                        <td colspan="13" class="text-center">
                            <div
                                class="pt-6 pb-4 text-base-content/60 font-medium"
                            >
                                No settings history found
                            </div>
                        </td>
                    </tr>
                {:else}
                    {#each updates as u}
                        <tr>
                            <td
                                >{dayjs(u.created_at).format(
                                    "YYYY-MM-DD HH:mm",
                                )}</td
                            >
                            <td>{u.settings_name}</td>
                            <td>{u.reservationCutOffTimeOW}</td>
                            <td>{u.cancelationCutOffTimeOW}m</td>
                            <td>{u.reservationCutOffTimePOOL}m</td>
                            <td>{u.cancelationCutOffTimePOOL}m</td>
                            <td>{u.reservationLeadTimeDays}d</td>
                            <td>{u.maxChargeableOWPerMonth}</td>
                            <td
                                class="max-w-[80px] truncate"
                                title={u.availablePoolSlots}
                                >{u.availablePoolSlots}</td
                            >
                            <td>{u.poolLable}</td>
                            <td
                                class="max-w-[80px] truncate"
                                title={u.availableClassrooms}
                                >{u.availableClassrooms}</td
                            >
                            <td>{u.classroomLable}</td>
                            <td class="whitespace-nowrap">
                                <div class="flex gap-2 justify-end">
                                    <button
                                        class="btn btn-ghost btn-xs"
                                        on:click={() => edit(u)}>Load</button
                                    >
                                    <button
                                        class="btn btn-outline btn-error btn-xs"
                                        on:click={() => remove(u.id)}
                                        disabled={loading}>Delete</button
                                    >
                                </div>
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>

    <!-- Mobile Card View -->
    <div class="md:hidden space-y-3">
        {#if updates.length === 0}
            <div
                class="text-center p-6 bg-base-100 rounded-lg border border-base-300 text-base-content/60"
            >
                No settings history found
            </div>
        {:else}
            {#each updates as u}
                <div class="card bg-base-100 shadow-sm border border-base-200">
                    <div class="card-body p-4 text-xs">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-bold text-sm">
                                    {u.settings_name}
                                </h4>
                                <div class="text-base-content/60">
                                    {dayjs(u.created_at).format(
                                        "YYYY-MM-DD HH:mm",
                                    )}
                                </div>
                            </div>
                            <div class="flex gap-1">
                                <button
                                    class="btn btn-neutral btn-xs"
                                    on:click={() => edit(u)}>Load</button
                                >
                                <button
                                    class="btn btn-outline btn-error btn-xs"
                                    on:click={() => remove(u.id)}
                                    disabled={loading}>Del</button
                                >
                            </div>
                        </div>

                        <div
                            class="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 bg-base-200/50 p-2 rounded"
                        >
                            <div class="flex justify-between">
                                <span>Lead Time:</span>
                                <span class="font-medium"
                                    >{u.reservationLeadTimeDays}d</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span>Max OW:</span>
                                <span class="font-medium"
                                    >{u.maxChargeableOWPerMonth}</span
                                >
                            </div>
                        </div>

                        <div
                            class="mt-2 text-[10px] uppercase font-bold text-base-content/40 tracking-wider"
                        >
                            Open Water
                        </div>
                        <div
                            class="grid grid-cols-2 gap-x-2 gap-y-1 border-l-2 border-primary/30 pl-2"
                        >
                            <div class="flex justify-between">
                                <span>Res Cutoff:</span>
                                <span class="font-medium"
                                    >{u.reservationCutOffTimeOW}</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span>Cancel Cutoff:</span>
                                <span class="font-medium"
                                    >{u.cancelationCutOffTimeOW}m</span
                                >
                            </div>
                        </div>

                        <div
                            class="mt-2 text-[10px] uppercase font-bold text-base-content/40 tracking-wider"
                        >
                            Pool & Class
                        </div>
                        <div
                            class="grid grid-cols-2 gap-x-2 gap-y-1 border-l-2 border-secondary/30 pl-2"
                        >
                            <div class="flex justify-between">
                                <span>Pool Res:</span>
                                <span class="font-medium"
                                    >{u.reservationCutOffTimePOOL}m</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span>Pool Cancel:</span>
                                <span class="font-medium"
                                    >{u.cancelationCutOffTimePOOL}m</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span>Class Res:</span>
                                <span class="font-medium"
                                    >{u.reservationCutOffTimeCLASSROOM}m</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span>Class Cancel:</span>
                                <span class="font-medium"
                                    >{u.cancelationCutOffTimeCLASSROOM}m</span
                                >
                            </div>
                        </div>

                        <div
                            class="mt-2 text-[10px] uppercase font-bold text-base-content/40 tracking-wider"
                        >
                            Resources
                        </div>
                        <div
                            class="grid grid-cols-2 gap-x-2 gap-y-1 border-l-2 border-accent/30 pl-2"
                        >
                            <div class="flex justify-between">
                                <span>Pool Slots:</span>
                                <span
                                    class="font-medium truncate max-w-[100px]"
                                    title={u.availablePoolSlots}
                                    >{u.availablePoolSlots}</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span>Pool Label:</span>
                                <span class="font-medium">{u.poolLable}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Class Slots:</span>
                                <span
                                    class="font-medium truncate max-w-[100px]"
                                    title={u.availableClassrooms}
                                    >{u.availableClassrooms}</span
                                >
                            </div>
                            <div class="flex justify-between">
                                <span>Class Label:</span>
                                <span class="font-medium"
                                    >{u.classroomLable}</span
                                >
                            </div>
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>
