<script lang="ts">
  import DiversGroupDisplay from "./DiversGroupDisplay.svelte";
  import type { AdminBuoyGroup } from "../../../../types/openWaterAdmin";
  import type { Buoy } from "../../../../services/openWaterService";

  export let buoyGroup: AdminBuoyGroup;
  export let availableBuoys: Buoy[];
  export let availableBoats: string[];
  export let onUpdateBuoy: (groupId: number, buoyName: string) => void;
  export let onUpdateBoat: (groupId: number, boatName: string) => void;
  // When true, render controls as disabled
  export let readOnly: boolean = false;
  export let currentUserId: string | undefined = undefined;
  export let onUpdateNote: (
    groupId: number,
    note: string | null,
  ) => void = () => {};

  let showCommentModal = false;
  let editingNote = buoyGroup.admin_note || "";
  let editingBuoy = buoyGroup.buoy_name || "";
  let isSavingNote = false;

  function openCommentModal() {
    if (readOnly) return;
    editingNote = buoyGroup.admin_note || "";
    editingBuoy = buoyGroup.buoy_name || "";
    showCommentModal = true;
  }

  async function handleSave() {
    if (isSavingNote) return;
    isSavingNote = true;
    try {
      // Update buoy if changed
      if (editingBuoy !== buoyGroup.buoy_name) {
        await onUpdateBuoy(buoyGroup.id, editingBuoy);
      }
      // Update note
      await onUpdateNote(buoyGroup.id, editingNote.trim() || null);
      showCommentModal = false;
    } catch (err) {
      console.error("Failed to save changes", err);
      alert("Failed to save changes");
    } finally {
      isSavingNote = false;
    }
  }

  // Find the max depth for the currently selected buoy
  $: selectedBuoy = availableBuoys.find(
    (b) => b.buoy_name === buoyGroup.buoy_name,
  );
  $: displayText = selectedBuoy
    ? readOnly
      ? selectedBuoy.buoy_name
      : `${selectedBuoy.buoy_name} (≤${selectedBuoy.max_depth}m)`
    : "Select";
</script>

<div
  class="flex hover:bg-base-100 border-b border-base-200 last:border-b-0"
  role="row"
>
  <div
    class="p-2 pr-3 w-20 flex-shrink-0 border-r border-base-300 hover:bg-base-200/50 transition-colors cursor-pointer group focus-visible:outline-primary"
    role="gridcell"
    data-column="buoy"
    on:click={openCommentModal}
    tabindex="0"
    on:keydown={(e) => e.key === "Enter" && openCommentModal()}
  >
    <div
      class="flex flex-col items-center justify-center w-full min-h-10 text-center relative"
    >
      <div
        class="text-sm font-semibold text-gray-700 group-hover:text-primary transition-colors"
      >
        {displayText}
      </div>
    </div>
  </div>
  <div
    class="p-2 px-3 w-20 flex-shrink-0 border-r border-base-300"
    role="gridcell"
    data-column="boat"
  >
    <div class="flex items-center justify-center w-full min-h-10">
      {#if readOnly}
        <span class="text-sm font-medium">
          {buoyGroup.boat && buoyGroup.boat.trim() !== ""
            ? buoyGroup.boat
            : "Not assigned"}
        </span>
      {:else}
        <select
          class="select select-bordered w-full bg-white rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
          bind:value={buoyGroup.boat}
          on:change={() => onUpdateBoat(buoyGroup.id, buoyGroup.boat)}
          disabled={readOnly}
        >
          <option value="">Select</option>
          {#each availableBoats as boat}
            <option value={boat}>{boat.replace("Boat ", "")}</option>
          {/each}
        </select>
      {/if}
    </div>
  </div>
  <div class="p-2 pl-3 flex-grow min-w-48" role="gridcell" data-column="divers">
    <section class="p-1">
      <DiversGroupDisplay
        {buoyGroup}
        {availableBuoys}
        {readOnly}
        {currentUserId}
        on:groupClick={openCommentModal}
        on:moveReservationToBuoy
        on:statusClick
      />
    </section>
  </div>
</div>

{#if showCommentModal}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
  >
    <div
      class="bg-base-100 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
    >
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-base-content">
            Buoy Group Comment
          </h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            on:click={() => (showCommentModal = false)}>✕</button
          >
        </div>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label
              for="buoy-select"
              class="text-sm font-semibold text-base-content/70"
            >
              Assign Buoy
            </label>
            <select
              id="buoy-select"
              class="select select-bordered w-full focus:select-primary"
              bind:value={editingBuoy}
              disabled={isSavingNote}
            >
              {#each availableBuoys as b}
                <option value={b.buoy_name}
                  >{b.buoy_name} (≤{b.max_depth}m)</option
                >
              {/each}
            </select>
          </div>

          <div class="flex flex-col gap-2">
            <label
              for="admin-note"
              class="text-sm font-semibold text-base-content/70"
            >
              Internal Comment
            </label>
            <textarea
              id="admin-note"
              class="textarea textarea-bordered h-32 focus:textarea-primary text-base"
              placeholder="Add a comment here..."
              bind:value={editingNote}
              disabled={isSavingNote}
            ></textarea>
            <p class="text-[10px] text-base-content/50">
              Only administrators and group members can see this comment.
            </p>
          </div>
        </div>

        <div class="flex gap-2 justify-end pt-2">
          <button
            type="button"
            class="btn btn-ghost"
            on:click={() => (showCommentModal = false)}
            disabled={isSavingNote}
          >
            Cancel
          </button>

          {#if editingNote}
            <button
              type="button"
              class="btn btn-ghost text-error"
              on:click={() => (editingNote = "")}
              disabled={isSavingNote}
            >
              Clear
            </button>
          {/if}

          <button
            type="button"
            class="btn btn-primary min-w-[100px]"
            on:click={handleSave}
            disabled={isSavingNote}
          >
            {#if isSavingNote}
              <span class="loading loading-spinner loading-xs"></span>
            {:else}
              Save
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
