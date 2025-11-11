<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ReservationCard from '$lib/components/ReservationCard/ReservationCard.svelte';
  import { reservationService } from '$lib/services/reservationService';
  import { bumpReservationUpdate } from '$lib/stores/reservationSync';

  export let reservation: any;

  const dispatch = createEventDispatcher<{ saved: { uid: string; res_date: string; price: number } }>();

  // Determine if editable: completed/done
  $: status = (reservation?.res_status || reservation?.status || '').toString().toLowerCase();
  $: isEditable = status === 'completed' || status === 'done' || status === 'confirmed';

  // Extract current price similar to ReservationCard pickPrice
  const pickPrice = (r: any): number | string | undefined => {
    if (!r) return undefined;
    const candidates = [r.price, r.total_price, r.totalPrice, r.amount, r.fee, r.cost];
    return candidates.find((v) => v !== undefined && v !== null);
  };
  $: currentPriceRaw = pickPrice(reservation);
  $: priceDisplay = (() => {
    if (currentPriceRaw === undefined || currentPriceRaw === null || currentPriceRaw === '') return '';
    const n = Number(currentPriceRaw);
    if (!isNaN(n) && isFinite(n)) return `P${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return String(currentPriceRaw);
  })();

  let editing = false;
  let priceInput: string = (() => {
    const n = Number(currentPriceRaw);
    return !isNaN(n) && isFinite(n) ? n.toFixed(2) : '';
  })();
  let saving = false;
  let error: string | null = null;

  function startEdit() {
    if (!isEditable) return;
    editing = true;
    error = null;
    // Initialize with current numeric value
    const n = Number(currentPriceRaw);
    priceInput = !isNaN(n) && isFinite(n) ? n.toFixed(2) : '';
  }

  async function savePrice() {
    error = null;
    const n = Number(String(priceInput).replace(/[^0-9.]/g, ''));
    if (isNaN(n) || !isFinite(n)) {
      error = 'Enter a valid number';
      return;
    }
    saving = true;
    try {
      const res = await reservationService.updateReservation(reservation.uid, reservation.res_date, { price: n });
      if (!res.success) {
        throw new Error(res.error || 'Failed to update price');
      }
      // Update local reservation price and exit edit
      reservation = { ...reservation, price: n };
      editing = false;
      dispatch('saved', { uid: reservation.uid, res_date: reservation.res_date, price: n });
      // Notify user-side to refresh total prices (no realtime)
      bumpReservationUpdate();
    } catch (e: any) {
      error = e?.message || 'Failed to update price';
    } finally {
      saving = false;
    }
  }

  function cancelEdit() {
    editing = false;
    error = null;
  }
</script>

<div class="card bg-base-100 border border-base-300 shadow-sm">
  <div class="card-body p-3 sm:p-4">
    <ReservationCard reservation={reservation} showPrice={true} clickable={false} priceBelowOnMobile={true}>
      <!-- Inject price/edit UI into ReservationCard's right-most price cell -->
      <div slot="price" class="flex items-end gap-2">
        <div class="flex items-center gap-2">
          {#if !editing}
            <span class="font-semibold text-slate-700 tabular-nums">
              {priceDisplay || '—'}
            </span>
            {#if isEditable}
              <button
                class="btn btn-ghost btn-xs"
                title="Edit price"
                on:click={startEdit}
                aria-label="Edit price"
              >
                <!-- Pencil icon -->
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 7.125L17.25 4.875" />
                </svg>
              </button>
            {/if}
          {:else}
            <label class="input input-sm input-bordered flex items-center gap-2 w-32">
              <span class="opacity-70">P</span>
              <input
                class="grow"
                type="text"
                inputmode="decimal"
                bind:value={priceInput}
                placeholder="0.00"
                aria-label="Price"
              />
            </label>
            <button class="btn btn-sm btn-primary" on:click={savePrice} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button class="btn btn-sm" on:click={cancelEdit} disabled={saving}>Cancel</button>
          {/if}
        </div>
        {#if editing && error}
          <div class="text-error text-xs text-right w-full">{error}</div>
        {/if}
      </div>
    </ReservationCard>
  </div>
</div>

<style>
  /* Keep styling minimal; rely on Tailwind/DaisyUI */
</style>
