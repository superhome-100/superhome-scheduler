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

<div class="boat-capacity-grid">
  <h3>Boat Capacity</h3>
  <div class="capacity-grid">
    {#each availableBoats as boatName}
      <div class="boat-slot">
        <div class="boat-number">{boatName}</div>
      </div>
    {/each}
  </div>
 </div>

<div class="reservation-columns">
<div class="reservation-table">
  <h3>AM Reservations</h3>
  {#if loading}
    <div class="loading">Loading buoy assignments...</div>
  {:else}
    <table>
      <thead>
        <tr>
          <th class="resizable-header" data-column="buoy" on:mousedown={(e) => handleMouseDown(e, 'buoy')}>
            <div class="header-content">
              <span>Buoy</span>
              <div class="resize-handle"></div>
            </div>
          </th>
          <th class="resizable-header" data-column="boat" on:mousedown={(e) => handleMouseDown(e, 'boat')}>
            <div class="header-content">
              <span>Boat</span>
              <div class="resize-handle"></div>
            </div>
          </th>
          <th class="resizable-header" data-column="divers" on:mousedown={(e) => handleMouseDown(e, 'divers')}>
            <div class="header-content">
              <span>Divers</span>
              <div class="resize-handle"></div>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each buoyGroups.filter((bg) => bg.time_period === 'AM') as buoyGroup}
          <tr>
            <td class="buoy-cell">
              <div class="cell-content">
                <select
                  class="select select-xs select-bordered"
                  bind:value={buoyGroup.buoy_name}
                  on:change={() => onUpdateBuoy(buoyGroup.id, buoyGroup.buoy_name)}
                >
                  {#each availableBuoys as b}
                    <option value={b.buoy_name}>{b.buoy_name} (≤{b.max_depth}m)</option>
                  {/each}
                </select>
              </div>
            </td>
            <td class="boat-cell">
              <div class="cell-content">
                <select
                  class="select select-xs select-bordered"
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
            <td class="divers-cell">
              <div class="diver-list">
                {#if buoyGroup.member_names?.length}
                  {#each buoyGroup.member_names as n}
                    <div class="diver-item">
                      <span class="diver-name">{n || 'Unknown'}</span>
                    </div>
                  {/each}
                {:else}
                  <span class="unassigned">No members</span>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
 </div>

 <div class="reservation-table">
  <h3>PM Reservations</h3>
  {#if loading}
    <div class="loading">Loading buoy assignments...</div>
  {:else}
    <table>
      <thead>
        <tr>
          <th class="resizable-header" data-column="buoy" on:mousedown={(e) => handleMouseDown(e, 'buoy')}>
            <div class="header-content">
              <span>Buoy</span>
              <div class="resize-handle"></div>
            </div>
          </th>
          <th class="resizable-header" data-column="boat" on:mousedown={(e) => handleMouseDown(e, 'boat')}>
            <div class="header-content">
              <span>Boat</span>
              <div class="resize-handle"></div>
            </div>
          </th>
          <th class="resizable-header" data-column="divers" on:mousedown={(e) => handleMouseDown(e, 'divers')}>
            <div class="header-content">
              <span>Divers</span>
              <div class="resize-handle"></div>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each buoyGroups.filter((bg) => bg.time_period === 'PM') as buoyGroup}
          <tr>
            <td class="buoy-cell">
              <div class="cell-content">
                <select
                  class="select select-xs select-bordered"
                  bind:value={buoyGroup.buoy_name}
                  on:change={() => onUpdateBuoy(buoyGroup.id, buoyGroup.buoy_name)}
                >
                  {#each availableBuoys as b}
                    <option value={b.buoy_name}>{b.buoy_name} (≤{b.max_depth}m)</option>
                  {/each}
                </select>
              </div>
            </td>
            <td class="boat-cell">
              <div class="cell-content">
                <select
                  class="select select-xs select-bordered"
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
            <td class="divers-cell">
              <div class="diver-list">
                {#if buoyGroup.member_names?.length}
                  {#each buoyGroup.member_names as n}
                    <div class="diver-item">
                      <span class="diver-name">{n || 'Unknown'}</span>
                    </div>
                  {/each}
                {:else}
                  <span class="unassigned">No members</span>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>


</div>
<style>
  .boat-capacity-grid {
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    padding: 1.5rem;
  }

  .boat-capacity-grid h3 {
    margin: 0 0 1rem 0;
    color: #1e293b;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .capacity-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .boat-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
  }

  .boat-number {
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.5rem;
  }

  .reservation-table {
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .reservation-columns {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 1024px) {
    .reservation-columns {
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
  }

  .reservation-table h3 {
    margin: 0;
    padding: 1rem 1.5rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .reservation-table table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .reservation-table th[data-column="buoy"],
  .reservation-table td.buoy-cell {
    width: 150px;
    min-width: 120px;
  }

  .reservation-table th[data-column="boat"],
  .reservation-table td.boat-cell {
    width: 160px;
    min-width: 140px;
  }

  .reservation-table th[data-column="divers"],
  .reservation-table td.divers-cell {
    width: auto;
    min-width: 200px;
  }

  .reservation-table th,
  .reservation-table td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  .reservation-table th {
    background: #f8fafc;
    font-weight: 600;
    color: #475569;
    position: relative;
  }

  .resizable-header {
    position: relative;
    user-select: none;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
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

  .reservation-table td {
    color: #64748b;
  }

  .diver-name {
    color: #000000;
    font-weight: 500;
  }

  .unassigned {
    color: #000000;
    font-weight: 400;
  }

  .cell-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 40px;
  }

  .cell-content select {
    width: 100%;
    max-width: 100%;
    margin: 0;
    border-radius: 6px;
    border: 2px solid #000000;
    background: white;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.5;
    color: #000000;
    padding: 0.5rem 2.5rem 0.5rem 0.75rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 1rem;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cell-content select:focus {
    outline: 2px solid #000000;
    outline-offset: 2px;
    border-color: #000000;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
    color: #000000;
    background: white;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.5;
  }

  .cell-content select:hover {
    border-color: #000000;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
    color: #000000;
    background: white;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.5;
  }

  .cell-content select option {
    color: #000000;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.5;
    background: white;
    padding: 0.25rem 0.5rem;
  }

  /* Mobile-first compact layout for Open Water tables */
  @media (max-width: 640px) {
    .reservation-table th,
    .reservation-table td {
      padding: 0.5rem 0.5rem;
    }

    .buoy-cell {
      min-width: 70px;
      width: 120px;
    }

    .boat-cell {
      min-width: 120px;
      width: 140px;
    }

    .divers-cell {
      min-width: 180px;
      width: auto;
    }
  }
</style>
