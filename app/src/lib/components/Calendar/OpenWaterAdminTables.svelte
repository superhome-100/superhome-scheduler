<script lang="ts">
  export let availableBoats: string[];
  export let availableBuoys: { buoy_name: string; max_depth: number }[];
  export let buoyGroups: any[];
  export let loading: boolean;
  export let onUpdateBuoy: (groupId: number, buoyName: string) => void;
  export let onUpdateBoat: (groupId: number, boatName: string) => void;

  let isResizing = false;
  let currentColumn: string | null = null;
  let startX = 0;
  let startWidth = 0;

  // Initialize boat capacity arrays
  let amBoatCapacity = [];
  let pmBoatCapacity = [];
  
  // Calculate boat capacity and assignments for each time period
  $: if (buoyGroups && availableBoats) {
    amBoatCapacity = calculateBoatCapacity('AM');
    pmBoatCapacity = calculateBoatCapacity('PM');
  }
  
  function calculateBoatCapacity(timePeriod: 'AM' | 'PM') {
    const boatStats = [];
    
    // Create numbered boats (1-4)
    for (let i = 1; i <= 4; i++) {
      const boatName = `Boat ${i}`;
      boatStats.push({
        name: boatName,
        totalDivers: 0,
        isAssigned: false
      });
    }
    
    // Safety check - ensure we have valid data
    if (!buoyGroups || !Array.isArray(buoyGroups)) {
      return boatStats;
    }
    
    // Count divers for each boat in the specified time period
    buoyGroups
      .filter(group => group && group.time_period === timePeriod)
      .forEach(group => {
        if (group.boat && group.boat.trim() !== '') {
          // Try exact match first
          let boatIndex = availableBoats.indexOf(group.boat);
          
          // If no exact match, try to find by boat number
          if (boatIndex === -1) {
            const boatNumber = group.boat.match(/\d+/)?.[0];
            if (boatNumber) {
              boatIndex = availableBoats.indexOf(`Boat ${boatNumber}`);
            }
          }
          
          if (boatIndex !== -1 && boatIndex < boatStats.length) {
            const boatStat = boatStats[boatIndex];
            // Count actual divers assigned to this boat
            const diverCount = group.member_names?.filter(name => name && name.trim() !== '').length || 0;
            boatStat.totalDivers += diverCount;
            boatStat.isAssigned = true;
          }
        }
      });
    
    return boatStats;
  }

  function handleMouseDown(event: MouseEvent, column: string) {
    if (event.target instanceof HTMLElement && event.target.classList.contains('resize-handle')) {
      isResizing = true;
      currentColumn = column;
      startX = event.clientX;
      startWidth = (event.target.closest('th') as HTMLElement)?.offsetWidth || 0;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      event.preventDefault();
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isResizing || !currentColumn) return;
    const deltaX = event.clientX - startX;
    const newWidth = Math.max(50, startWidth + deltaX);
    const tables = document.querySelectorAll('.reservation-table table');
    tables.forEach((table) => {
      const headers = table.querySelectorAll(`th[data-column="${currentColumn}"]`);
      headers.forEach((header) => {
        (header as HTMLElement).style.width = `${newWidth}px`;
      });
    });
  }

  function handleMouseUp() {
    isResizing = false;
    currentColumn = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
</script>

<!-- Reservation Tables Section -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
  <!-- AM Reservations -->
  <div class="card bg-base-100 shadow-sm border border-base-300 rounded-lg reservation-card">
    <div class="card-body p-0">
      <h3 class="card-title text-lg font-semibold text-base-content p-4 bg-base-200 border-b border-base-300 m-0 flex justify-between items-center">
        <span>AM Reservations</span>
        <div class="grid grid-cols-4 gap-1 text-sm font-medium">
          {#each amBoatCapacity as boat, index}
            <div class="flex items-center justify-center">
              <span class="bg-primary/10 text-primary px-2 py-1 rounded-md w-full text-center">
                {boat.name} - {boat.totalDivers}
              </span>
              {#if index < amBoatCapacity.length - 1}
                <span class="text-base-content/40 ml-1">|</span>
              {/if}
            </div>
          {/each}
        </div>
      </h3>
      {#if loading}
        <div class="p-4 text-center text-base-content/70">Loading buoy assignments...</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table table-fixed w-full">
            <thead>
              <tr class="bg-primary/10">
                <th class="resizable-header w-36 min-w-28" data-column="buoy" on:mousedown={(e) => handleMouseDown(e, 'buoy')}>
                  <div class="flex items-center justify-center w-full h-full px-4 py-3 relative">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                      </svg>
                      <span class="font-semibold text-primary">BUOY</span>
                    </div>
                    <div class="resize-handle absolute right-0"></div>
                  </div>
                </th>
                <th class="resizable-header w-40 min-w-32" data-column="boat" on:mousedown={(e) => handleMouseDown(e, 'boat')}>
                  <div class="flex items-center justify-center w-full h-full px-4 py-3 relative">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 18H4V16H2V18M4 20H6V18H4V20M6 18H8V16H6V18M8 20H10V18H8V20M10 18H12V16H10V18M12 20H14V18H12V20M14 18H16V16H14V18M16 20H18V18H16V20M18 18H20V16H18V18M20 20H22V18H20V20M2 14H4V12H2V14M4 16H6V14H4V16M6 14H8V12H6V14M8 16H10V14H8V16M10 14H12V12H10V14M12 16H14V14H12V16M14 14H16V12H14V14M16 16H18V14H16V16M18 14H20V12H18V14M20 16H22V14H20V16M2 10H4V8H2V10M4 12H6V10H4V12M6 10H8V8H6V10M8 12H10V10H8V12M10 10H12V8H10V10M12 12H14V10H12V12M14 10H16V8H14V10M16 12H18V10H16V12M18 10H20V8H18V10M20 12H22V10H20V12M2 6H4V4H2V6M4 8H6V6H4V8M6 6H8V4H6V6M8 8H10V6H8V8M10 6H12V4H10V6M12 8H14V6H12V8M14 6H16V4H14V6M16 8H18V6H16V8M18 6H20V4H18V6M20 8H22V6H20V8Z"/>
                      </svg>
                      <span class="font-semibold text-primary">BOAT</span>
                    </div>
                    <div class="resize-handle absolute right-0"></div>
                  </div>
                </th>
                <th class="resizable-header w-auto min-w-48" data-column="divers" on:mousedown={(e) => handleMouseDown(e, 'divers')}>
                  <div class="flex items-center justify-center w-full h-full px-4 py-3 relative">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 4C18.2 4 20 5.8 20 8S18.2 12 16 12 12 10.2 12 8 13.8 4 16 4M16 13C18.67 13 24 14.33 24 17V20H8V17C8 14.33 13.33 13 16 13M8 12C10.2 12 12 10.2 12 8S10.2 4 8 4 4 5.8 4 8 5.8 12 8 12M8 13C5.33 13 0 14.33 0 17V20H6V17C6 15.9 6.45 14.9 7.2 14.1C5.73 13.4 4.8 13 8 13Z"/>
                      </svg>
                      <span class="font-semibold text-primary">DIVERS</span>
                    </div>
                    <div class="resize-handle absolute right-0"></div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {#each buoyGroups.filter((bg) => bg.time_period === 'AM') as buoyGroup}
                <tr class="hover:bg-base-100">
                  <td class="p-2 pr-3">
                    <div class="flex items-center justify-center w-full min-h-10">
                      <select
                        class="select select-bordered w-full bg-white rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        bind:value={buoyGroup.buoy_name}
                        on:change={() => onUpdateBuoy(buoyGroup.id, buoyGroup.buoy_name)}
                      >
                        {#each availableBuoys as b}
                          <option value={b.buoy_name}>{b.buoy_name} (≤{b.max_depth}m)</option>
                        {/each}
                      </select>
                    </div>
                  </td>
                  <td class="p-2 px-3">
                    <div class="flex items-center justify-center w-full min-h-10">
                      <select
                        class="select select-bordered w-full bg-white rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        bind:value={buoyGroup.boat}
                        on:change={() => onUpdateBoat(buoyGroup.id, buoyGroup.boat)}
                      >
                        <option value="">Select Boat</option>
                        {#each availableBoats as boat}
                          <option value={boat}>{boat}</option>
                        {/each}
                      </select>
                    </div>
                  </td>
                  <td class="p-2 pl-3">
                    {#if buoyGroup.member_names?.length}
                      <div class="bg-base-100 border border-gray-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 divers-group-box">
                        <div class="space-y-1 flex flex-col items-center">
                          {#each buoyGroup.member_names as n}
                            <div class="flex items-center gap-2 text-sm justify-center">
                              <div class="w-2 h-2 bg-gray-500 rounded-full flex-shrink-0"></div>
                              <span class="font-medium text-gray-800">{n || 'Unknown'}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {:else}
                      <div class="flex justify-center">
                        <span class="text-sm text-base-content/70">No members</span>
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>

  <!-- PM Reservations -->
  <div class="card bg-base-100 shadow-sm border border-base-300 rounded-lg reservation-card">
    <div class="card-body p-0">
      <h3 class="card-title text-lg font-semibold text-base-content p-4 bg-base-200 border-b border-base-300 m-0 flex justify-between items-center">
        <span>PM Reservations</span>
        <div class="grid grid-cols-4 gap-1 text-sm font-medium">
          {#each pmBoatCapacity as boat, index}
            <div class="flex items-center justify-center">
              <span class="bg-primary/10 text-primary px-2 py-1 rounded-md w-full text-center">
                {boat.name} - {boat.totalDivers}
              </span>
              {#if index < pmBoatCapacity.length - 1}
                <span class="text-base-content/40 ml-1">|</span>
              {/if}
            </div>
          {/each}
        </div>
      </h3>
      {#if loading}
        <div class="p-4 text-center text-base-content/70">Loading buoy assignments...</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="table table-fixed w-full">
            <thead>
              <tr class="bg-primary/10">
                <th class="resizable-header w-36 min-w-28" data-column="buoy" on:mousedown={(e) => handleMouseDown(e, 'buoy')}>
                  <div class="flex items-center justify-center w-full h-full px-4 py-3 relative">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                      </svg>
                      <span class="font-semibold text-primary">BUOY</span>
                    </div>
                    <div class="resize-handle absolute right-0"></div>
                  </div>
                </th>
                <th class="resizable-header w-40 min-w-32" data-column="boat" on:mousedown={(e) => handleMouseDown(e, 'boat')}>
                  <div class="flex items-center justify-center w-full h-full px-4 py-3 relative">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 18H4V16H2V18M4 20H6V18H4V20M6 18H8V16H6V18M8 20H10V18H8V20M10 18H12V16H10V18M12 20H14V18H12V20M14 18H16V16H14V18M16 20H18V18H16V20M18 18H20V16H18V18M20 20H22V18H20V20M2 14H4V12H2V14M4 16H6V14H4V16M6 14H8V12H6V14M8 16H10V14H8V16M10 14H12V12H10V14M12 16H14V14H12V16M14 14H16V12H14V14M16 16H18V14H16V16M18 14H20V12H18V14M20 16H22V14H20V16M2 10H4V8H2V10M4 12H6V10H4V12M6 10H8V8H6V10M8 12H10V10H8V12M10 10H12V8H10V10M12 12H14V10H12V12M14 10H16V8H14V10M16 12H18V10H16V12M18 10H20V8H18V10M20 12H22V10H20V12M2 6H4V4H2V6M4 8H6V6H4V8M6 6H8V4H6V6M8 8H10V6H8V8M10 6H12V4H10V6M12 8H14V6H12V8M14 6H16V4H14V6M16 8H18V6H16V8M18 6H20V4H18V6M20 8H22V6H20V8Z"/>
                      </svg>
                      <span class="font-semibold text-primary">BOAT</span>
                    </div>
                    <div class="resize-handle absolute right-0"></div>
                  </div>
                </th>
                <th class="resizable-header w-auto min-w-48" data-column="divers" on:mousedown={(e) => handleMouseDown(e, 'divers')}>
                  <div class="flex items-center justify-center w-full h-full px-4 py-3 relative">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 4C18.2 4 20 5.8 20 8S18.2 12 16 12 12 10.2 12 8 13.8 4 16 4M16 13C18.67 13 24 14.33 24 17V20H8V17C8 14.33 13.33 13 16 13M8 12C10.2 12 12 10.2 12 8S10.2 4 8 4 4 5.8 4 8 5.8 12 8 12M8 13C5.33 13 0 14.33 0 17V20H6V17C6 15.9 6.45 14.9 7.2 14.1C5.73 13.4 4.8 13 8 13Z"/>
                      </svg>
                      <span class="font-semibold text-primary">DIVERS</span>
                    </div>
                    <div class="resize-handle absolute right-0"></div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {#each buoyGroups.filter((bg) => bg.time_period === 'PM') as buoyGroup}
                <tr class="hover:bg-base-100">
                  <td class="p-2 pr-3">
                    <div class="flex items-center justify-center w-full min-h-10">
                      <select
                        class="select select-bordered w-full bg-white rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        bind:value={buoyGroup.buoy_name}
                        on:change={() => onUpdateBuoy(buoyGroup.id, buoyGroup.buoy_name)}
                      >
                        {#each availableBuoys as b}
                          <option value={b.buoy_name}>{b.buoy_name} (≤{b.max_depth}m)</option>
                        {/each}
                      </select>
                    </div>
                  </td>
                  <td class="p-2 px-3">
                    <div class="flex items-center justify-center w-full min-h-10">
                      <select
                        class="select select-bordered w-full bg-white rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        bind:value={buoyGroup.boat}
                        on:change={() => onUpdateBoat(buoyGroup.id, buoyGroup.boat)}
                      >
                        <option value="">Select Boat</option>
                        {#each availableBoats as boat}
                          <option value={boat}>{boat}</option>
                        {/each}
                      </select>
                    </div>
                  </td>
                  <td class="p-2 pl-3">
                    {#if buoyGroup.member_names?.length}
                      <div class="bg-base-100 border border-gray-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 divers-group-box">
                        <div class="space-y-1 flex flex-col items-center">
                          {#each buoyGroup.member_names as n}
                            <div class="flex items-center gap-2 text-sm justify-center">
                              <div class="w-2 h-2 bg-gray-500 rounded-full flex-shrink-0"></div>
                              <span class="font-medium text-gray-800">{n || 'Unknown'}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {:else}
                      <div class="flex justify-center">
                        <span class="text-sm text-base-content/70">No members</span>
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div>
<style>
  /* Custom styles for resizable table functionality that can't be replicated with Tailwind/DaisyUI */
  .resizable-header {
    position: relative;
    user-select: none;
  }

  .resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: transparent;
    cursor: col-resize;
    transition: background-color 0.2s ease;
  }

  .resize-handle:hover {
    background: #3b82f6;
  }

  .resizable-header:hover .resize-handle {
    background: #e2e8f0;
  }

  .resizable-header:hover .resize-handle:hover {
    background: #3b82f6;
  }

  /* Mobile responsive adjustments for table columns */
  @media (max-width: 640px) {
    .resizable-header.w-36 {
      width: 5rem;
      min-width: 4rem;
    }

    .resizable-header.w-40 {
      width: 5.5rem;
      min-width: 4.5rem;
    }

    .resizable-header.w-auto {
      min-width: 14rem;
    }

    /* Optimize dropdown text size for mobile */
    .resizable-header select {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }

    /* Ensure divers group boxes have more space on mobile */
    .divers-group-box {
      min-height: 2.5rem;
    }
  }


  /* Ensure balanced card heights and consistent styling */
  .reservation-card {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .reservation-card .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .reservation-card .overflow-x-auto {
    flex: 1;
  }

  /* Ensure tables fill available space */
  .reservation-card .table {
    height: 100%;
  }

  /* Mobile responsive adjustments for reservation cards */
  @media (max-width: 1024px) {
    .reservation-card {
      min-height: 300px;
    }
  }

  /* Extra small mobile devices - maintain 2x2 grid layout */
  @media (max-width: 480px) {
    .card-title .grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.0625rem;
    }

    .card-title .grid > div {
      justify-content: center;
      gap: 0.03125rem;
    }

    .card-title .grid span {
      font-size: 0.45rem;
      padding: 0.0625rem 0.125rem;
      min-width: fit-content;
    }

    .card-title .grid span:not(.bg-primary\/10) {
      font-size: 0.35rem;
    }
  }

  /* Ensure rounded corners are properly displayed for divers group boxes */
  .divers-group-box {
    border-radius: 0.5rem !important;
    overflow: hidden;
  }

  /* Add spacing between table columns */
  .table td {
    border-left: 1px solid transparent;
    border-right: 1px solid transparent;
  }

  .table td:not(:last-child) {
    border-right: 1px solid #e5e7eb;
  }

  /* Enhanced mobile spacing */
  @media (max-width: 640px) {
    .table td {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
    
    .table td:first-child {
      padding-left: 0.75rem;
    }
    
    .table td:last-child {
      padding-right: 0.75rem;
    }

    /* Mobile responsive boat capacity display */
    .card-title .flex {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .card-title .grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.125rem;
      width: 100%;
    }

    .card-title .grid > div {
      flex-direction: row;
      gap: 0.0625rem;
      align-items: center;
      justify-content: center;
    }

    .card-title .grid span {
      font-size: 0.55rem;
      padding: 0.125rem 0.1875rem;
      white-space: nowrap;
    }

    .card-title .grid span:not(.bg-primary\/10) {
      font-size: 0.45rem;
      margin: 0;
    }
  }

  /* Desktop spacing */
  @media (min-width: 641px) {
    .table td {
      padding-left: 0.75rem;
      padding-right: 0.75rem;
    }
    
    .table td:first-child {
      padding-left: 1rem;
    }
    
    .table td:last-child {
      padding-right: 1rem;
    }
  }

</style>
