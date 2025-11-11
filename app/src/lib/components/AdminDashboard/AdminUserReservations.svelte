<script lang="ts">
  /* No modal dispatch needed here */
  import dayjs from '$lib/utils/dateUtils';
  import { supabase } from '$lib/utils/supabase';
  import ReservationCard from '$lib/components/ReservationCard/ReservationCard.svelte';
  import AdminUserReservationRow from './AdminUserReservationRow.svelte';

  export let reservations: any[] = [];

  // No event dispatch; clicking a card should not open a modal

  // UI state
  let searchTerm = '';
  let monthValue = '' as string; // format: YYYY-MM
  let typeValue: 'all' | 'pool' | 'open_water' | 'classroom' = 'all';
  let selectedUserId: string | null = null;
  let selectedUserName: string | null = null;
  let suggestions: Array<{ id: string; name: string }> = [];
  let showSuggestions = false;
  let searchInputEl: HTMLInputElement | null = null;

  // Controlled search with debounce to avoid excessive filtering
  // Suggestion fetch debounce
  let suggestTimer: any;
  $: {
    clearTimeout(suggestTimer);
    const typed = searchTerm.trim();
    if (typed.length === 0) {
      // Cleared input: reset all
      selectedUserId = null;
      selectedUserName = null;
      suggestions = [];
      showSuggestions = false;
    } else if (selectedUserName && typed === selectedUserName) {
      // Text matches selected user exactly: keep selection and hide suggestions
      suggestions = [];
      showSuggestions = false;
    } else {
      // Different text: clear selection and fetch suggestions as needed
      selectedUserId = null;
      selectedUserName = null;
      if (typed.length >= 2) {
        suggestTimer = setTimeout(fetchSuggestions, 250);
      } else {
        suggestions = [];
        showSuggestions = false;
      }
    }
  }

  function onSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      // Do not accept Enter-to-confirm; require explicit click selection
      e.preventDefault();
      return;
    } else if (e.key === 'ArrowDown') {
      // Focus first suggestion button if exists
      const first = document.querySelector<HTMLButtonElement>('#user-suggest-list button');
      first?.focus();
    }
  }

  function hideSuggestWithDelay() {
    // Delay to allow click selection
    setTimeout(() => (showSuggestions = false), 100);
  }

  async function fetchSuggestions() {
    const q = searchTerm.trim();
    if (q.length < 2) return;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('uid,name')
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(10);
    if (!error) {
      suggestions = (data || [])
        .filter((d) => !!d.name && !!d.uid)
        .map((d) => ({ id: d.uid as string, name: d.name as string }));
      showSuggestions = suggestions.length > 0;
    } else {
      suggestions = [];
      showSuggestions = false;
      console.error('Suggestion fetch error:', error);
    }
  }

  // Helper: normalize user name
  const getUserName = (r: any): string => {
    return (
      r?.user_profiles?.name || r?.user?.name || r?.user_name || ''
    ).toString();
  };

  // Helper: normalize type
  const getType = (r: any): 'pool' | 'open_water' | 'classroom' | '' => {
    const t = (r?.res_type || r?.type || '').toString().toLowerCase();
    if (t === 'open water') return 'open_water';
    if (t === 'pool' || t === 'open_water' || t === 'classroom') return t as any;
    return '';
  };

  // Helper: normalize date (YYYY-MM-DD) and compare month
  const isInMonth = (r: any, ym: string): boolean => {
    if (!ym) return true;
    const d = dayjs.utc(r?.res_date || r?.date);
    if (!d.isValid()) return false;
    return d.format('YYYY-MM') === ym;
  };

  // Derived filtered list
  // Strict behavior: results only after a specific user is selected from suggestions

  $: filtered = (
    selectedUserId
      ? (reservations || []).filter((r) => {
          // Require user match
          if (r?.uid !== selectedUserId) return false;
          // Month filter
          if (!isInMonth(r, monthValue)) return false;
          // Type filter
          const t = getType(r);
          if (typeValue !== 'all' && t !== typeValue) return false;
          return true;
        })
      : []
  )
    // Sort most recent first by res_date, fallback to created_at if available
    .sort((a, b) => {
      const da = dayjs.utc(a?.res_date || a?.created_at);
      const db = dayjs.utc(b?.res_date || b?.created_at);
      if (!da.isValid() && !db.isValid()) return 0;
      if (!da.isValid()) return 1;
      if (!db.isValid()) return -1;
      return db.valueOf() - da.valueOf();
    });

  // Clicking reservations is disabled in this view per requirements

  const clearFilters = () => {
    searchTerm = '';
    monthValue = '';
    typeValue = 'all';
    selectedUserId = null;
    selectedUserName = null;
    suggestions = [];
    showSuggestions = false;
  };

  function selectSuggestion(s: { id: string; name: string }) {
    selectedUserId = s.id;
    selectedUserName = s.name;
    searchTerm = s.name;
    showSuggestions = false;
    // Blur the input to finalize selection and prevent suggestion re-open
    searchInputEl?.blur();
  }
</script>

<!-- Header + Filters Row -->
<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body p-4 sm:p-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <h2 class="text-lg sm:text-xl font-semibold">User Reservations</h2>
      <!-- Search + Filters -->
      <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
        <!-- Search with autosuggest -->
        <div class="relative w-full sm:w-64">
          <label class="input input-sm input-bordered flex items-center gap-2 w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 opacity-70">
              <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 0 1 5.364 10.842l3.272 3.272a.75.75 0 1 1-1.06 1.06l-3.272-3.271A6.75 6.75 0 1 1 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 0 10.5 0 5.25 5.25 0 0 0-10.5 0Z" clip-rule="evenodd" />
            </svg>
            <input
              type="text"
              class="grow"
              placeholder="Search user"
              bind:value={searchTerm}
              bind:this={searchInputEl}
              on:keydown={onSearchKeydown}
              on:focus={() => (showSuggestions = suggestions.length > 0)}
              on:blur={hideSuggestWithDelay}
              aria-label="Search user"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              aria-controls="user-suggest-list"
            />
          </label>
          {#if showSuggestions}
            <ul id="user-suggest-list" class="menu menu-sm bg-white text-slate-800 rounded-box shadow border border-base-300 absolute z-20 mt-1 w-full max-h-60 overflow-auto">
              {#each suggestions as s}
                <li>
                  <button
                    type="button"
                    class="justify-start rounded-md transition-colors hover:bg-neutral hover:text-neutral-content focus:bg-neutral focus:text-neutral-content active:bg-neutral active:text-neutral-content hover:shadow-md focus:shadow-md active:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral"
                    on:mousedown|preventDefault={() => selectSuggestion(s)}
                    on:click={() => selectSuggestion(s)}
                  >
                    {s.name}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <!-- Month filter -->
        <label class="form-control">
          <div class="label py-0">
            <span class="label-text text-xs">Month</span>
          </div>
          <input type="month" class="input input-sm input-bordered w-full sm:w-40" bind:value={monthValue} aria-label="Filter by month" />
        </label>

        <!-- Type filter -->
        <label class="form-control">
          <div class="label py-0">
            <span class="label-text text-xs">Type</span>
          </div>
          <select class="select select-sm select-bordered w-full sm:w-44" bind:value={typeValue} aria-label="Filter by reservation type">
            <option value="all">All</option>
            <option value="pool">Pool</option>
            <option value="open_water">Open Water</option>
            <option value="classroom">Classroom</option>
          </select>
        </label>

        <button class="btn btn-sm" on:click={clearFilters} title="Clear filters">Clear</button>
      </div>
    </div>

    <!-- Results -->
    {#if filtered.length === 0}
      <div class="mt-4 text-base-content/70">{selectedUserId ? 'No reservations found.' : 'Search a user to view reservations.'}</div>
    {:else}
      <div class="mt-4 grid gap-3">
        {#each filtered as r (r.uid + '-' + r.res_date)}
          <AdminUserReservationRow
            reservation={r}
            on:saved={(e) => {
              const { uid, res_date, price } = e.detail;
              // Update the backing reservations array so any other consumers show the new price
              const idx = reservations.findIndex((it) => it.uid === uid && it.res_date === res_date);
              if (idx !== -1) {
                reservations[idx] = { ...reservations[idx], price };
              }
              // Also update the filtered reference item
              Object.assign(r, { price });
            }}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Keep styles minimal; rely on TailwindCSS + DaisyUI */
</style>
