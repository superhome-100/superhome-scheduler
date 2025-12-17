<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/auth';
  import { reservationStore, upcomingReservations, pastReservations, reservationStats } from '../../stores/reservationStore';
  import { reservationApi } from '../../api/reservationApi';
  import type { CreateReservationData, CompleteReservation, UpdateReservationData } from '../../api/reservationApi';
  import { now } from '../../utils/dateUtils';
  import { showLoading, hideLoading } from '../../stores/ui';
  import Toast from '../Toast.svelte';

  // Component state
  let showCreateForm = false;
  let selectedReservation: CompleteReservation | null = null;
  let showEditForm = false;
  let activeTab: 'upcoming' | 'past' | 'all' = 'upcoming';

  // Toast state for error notifications
  let toastOpen = false;
  let toastMessage = '';
  const showErrorToast = (msg: string) => {
    toastMessage = msg;
    toastOpen = true;
    scrollToTop();
  };

  // Scroll helper for page-level component
  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // no-op
    }
  };

  // Get current datetime for min attribute
  const currentDateTime = now().format('YYYY-MM-DDTHH:mm');

  // Form data
  let createFormData: CreateReservationData = {
    res_type: 'pool',
    res_date: '',
    pool: {
      start_time: '',
      end_time: '',
      note: ''
    }
  };

  let editFormData: UpdateReservationData = {};

  // Reactive stores
  $: currentReservations = activeTab === 'upcoming' ? $upcomingReservations : 
                          activeTab === 'past' ? $pastReservations : 
                          $reservationStore.reservations;

  // Load reservations on mount
  onMount(async () => {
    if ($authStore.user) {
      await reservationStore.loadUserReservations($authStore.user.id);
    }
  });

  // Create reservation
  const handleCreateReservation = async () => {
    if (!$authStore.user) return;
    showLoading('Creating reservation...');
    const result = await reservationStore.createReservation($authStore.user.id, createFormData);
    
    if (result.success) {
      showCreateForm = false;
      resetCreateForm();
      // Show success message
      console.log('Reservation created successfully');
    } else {
      console.error('Failed to create reservation:', result.error);
      if (result.error && result.error.startsWith('Already have a reservation for ')) {
        showErrorToast(result.error);
      }
      // Ensure the user sees the error immediately
      scrollToTop();
    }
    hideLoading();
  };

  // Update reservation
  const handleUpdateReservation = async () => {
    if (!$authStore.user || !selectedReservation) return;
    showLoading('Updating reservation...');
    const result = await reservationStore.updateReservation(
      selectedReservation.uid,
      selectedReservation.res_date,
      editFormData
    );

    if (result.success) {
      showEditForm = false;
      selectedReservation = null;
      resetEditForm();
      console.log('Reservation updated successfully');
    } else {
      console.error('Failed to update reservation:', result.error);
    }
    hideLoading();
  };

  // Delete reservation
  const handleDeleteReservation = async (reservation: CompleteReservation) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return;
    showLoading('Deleting reservation...');
    const result = await reservationStore.deleteReservation(reservation.uid, reservation.res_date);
    
    if (result.success) {
      console.log('Reservation deleted successfully');
    } else {
      console.error('Failed to delete reservation:', result.error);
    }
    hideLoading();
  };

  // Update reservation status
  const handleUpdateStatus = async (reservation: CompleteReservation, status: 'confirmed' | 'rejected') => {
    showLoading(status === 'confirmed' ? 'Approving reservation...' : 'Rejecting reservation...');
    const result = await reservationStore.updateReservationStatus(
      reservation.uid,
      reservation.res_date,
      status
    );

    if (result.success) {
      console.log(`Reservation ${status} successfully`);
    } else {
      console.error(`Failed to ${status} reservation:`, result.error);
    }
    hideLoading();
  };

  // Form helpers
  const resetCreateForm = () => {
    createFormData = {
      res_type: 'pool',
      res_date: '',
      pool: {
        start_time: '',
        end_time: '',
        note: ''
      }
    };
  };

  const resetEditForm = () => {
    editFormData = {};
  };

  const openEditForm = (reservation: CompleteReservation) => {
    selectedReservation = reservation;
    editFormData = {
      reservation_id: typeof reservation.reservation_id === 'number'
        ? reservation.reservation_id
        : (reservation.reservation_id != null ? Number(reservation.reservation_id) : undefined),
      res_type: reservation.res_type,
      res_date: reservation.res_date,
      res_status: reservation.res_status
    };

    // Set type-specific data
    if (reservation.res_type === 'pool' && reservation.res_pool) {
      editFormData.pool = { ...reservation.res_pool };
    } else if (reservation.res_type === 'classroom' && reservation.res_classroom) {
      editFormData.classroom = { ...reservation.res_classroom };
    } else if (reservation.res_type === 'open_water' && reservation.res_openwater) {
      editFormData.openwater = { ...reservation.res_openwater };
    }

    showEditForm = true;
  };

  const closeEditForm = () => {
    showEditForm = false;
    selectedReservation = null;
    resetEditForm();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge class
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'confirmed': return 'badge-success';
      case 'rejected': return 'badge-error';
      default: return 'badge-neutral';
    }
  };

  // Get type badge class
  const getTypeClass = (type: string) => {
    switch (type) {
      case 'pool': return 'badge-info';
      case 'classroom': return 'badge-secondary';
      case 'open_water': return 'badge-accent';
      default: return 'badge-neutral';
    }
  };
</script>

<div class="reservation-crud-container">
  <!-- Header with stats -->
  <div class="mb-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Reservation Management</h2>
      <button 
        class="btn btn-primary"
        on:click={() => showCreateForm = true}
      >
        Create Reservation
      </button>
    </div>

    <!-- Stats -->
    <div class="stats shadow">
      <div class="stat">
        <div class="stat-title">Total</div>
        <div class="stat-value text-primary">{$reservationStats.total}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Pending</div>
        <div class="stat-value text-warning">{$reservationStats.pending}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Confirmed</div>
        <div class="stat-value text-success">{$reservationStats.confirmed}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Upcoming</div>
        <div class="stat-value text-info">{$reservationStats.upcoming}</div>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs tabs-boxed mb-4">
    <button 
      class="tab"
      class:tab-active={activeTab === 'upcoming'}
      on:click={() => activeTab = 'upcoming'}
    >
      Upcoming ({$reservationStats.upcoming})
    </button>
    <button 
      class="tab"
      class:tab-active={activeTab === 'past'}
      on:click={() => activeTab = 'past'}
    >
      Past ({$reservationStats.past})
    </button>
    <button 
      class="tab"
      class:tab-active={activeTab === 'all'}
      on:click={() => activeTab = 'all'}
    >
      All ({$reservationStats.total})
    </button>
  </div>

  <!-- Loading state -->
  {#if $reservationStore.loading}
    <div class="flex justify-center items-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
      <span class="ml-2">Loading reservations...</span>
    </div>
  {:else if $reservationStore.error}
    <div class="alert alert-error">
      <span>{$reservationStore.error}</span>
    </div>
  {:else}
    <!-- Reservations list -->
    <div class="grid gap-4">
      {#each currentReservations as reservation (reservation.uid + reservation.res_date)}
        <div class="card bg-base-100 shadow-md">
          <div class="card-body">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="card-title">
                  {reservation.res_type.replace('_', ' ').toUpperCase()}
                  <div class="badge {getStatusClass(reservation.res_status)}">
                    {reservation.res_status}
                  </div>
                </h3>
                <p class="text-sm text-gray-600">
                  {formatDate(reservation.res_date)}
                </p>
                
                <!-- Type-specific details -->
                {#if reservation.res_type === 'pool' && reservation.res_pool}
                  <p class="text-sm">
                    <strong>Time:</strong> {reservation.res_pool.start_time} - {reservation.res_pool.end_time}
                    {#if reservation.res_pool.lane}
                      | <strong>Lane:</strong> {reservation.res_pool.lane}
                    {/if}
                  </p>
                {:else if reservation.res_type === 'classroom' && reservation.res_classroom}
                  <p class="text-sm">
                    <strong>Time:</strong> {reservation.res_classroom.start_time} - {reservation.res_classroom.end_time}
                    {#if reservation.res_classroom.room}
                      | <strong>Room:</strong> {reservation.res_classroom.room}
                    {/if}
                  </p>
                {:else if reservation.res_type === 'open_water' && reservation.res_openwater}
                  <p class="text-sm">
                    <strong>Period:</strong> {reservation.res_openwater.time_period}
                    {#if reservation.res_openwater.depth_m}
                      | <strong>Depth:</strong> {reservation.res_openwater.depth_m}m
                    {/if}
                    {#if reservation.res_openwater.buoy}
                      | <strong>Buoy:</strong> {reservation.res_openwater.buoy}
                    {/if}
                  </p>
                {/if}

                {#if reservation.res_pool?.note || reservation.res_classroom?.note || reservation.res_openwater?.note}
                  <p class="text-sm text-gray-500 mt-1">
                    <strong>Note:</strong> {reservation.res_pool?.note || reservation.res_classroom?.note || reservation.res_openwater?.note}
                  </p>
                {/if}
              </div>

              <!-- Actions -->
              <div class="flex gap-2">
                {#if reservation.res_status === 'pending'}
                  <button 
                    class="btn btn-sm btn-success"
                    on:click={() => handleUpdateStatus(reservation, 'confirmed')}
                  >
                    Approve
                  </button>
                  <button 
                    class="btn btn-sm btn-error"
                    on:click={() => handleUpdateStatus(reservation, 'rejected')}
                  >
                    Reject
                  </button>
                {/if}
                
                <button 
                  class="btn btn-sm btn-outline"
                  on:click={() => openEditForm(reservation)}
                >
                  Edit
                </button>
                
                <button 
                  class="btn btn-sm btn-error"
                  on:click={() => handleDeleteReservation(reservation)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      {/each}

      {#if currentReservations.length === 0}
        <div class="text-center py-8 text-gray-500">
          No reservations found
        </div>
      {/if}
    </div>
  {/if}

  <!-- Create Reservation Modal -->
  {#if showCreateForm}
    <div class="modal modal-open p-2 sm:p-3">
      <div class="modal-box w-full max-w-sm sm:max-w-md max-h-[100svh] overflow-visible">
        <h3 class="font-bold text-base mb-3">Create New Reservation</h3>
        
        <form on:submit|preventDefault={handleCreateReservation}>
          <div class="form-control mb-3">
            <label class="label" for="create-res-type">
              <span class="label-text">Category Type</span>
            </label>
            <select 
              class="select select-bordered select-sm w-full"
              id="create-res-type"
              bind:value={createFormData.res_type}
            >
              <option value="pool">Pool</option>
              <option value="classroom">Classroom</option>
              <option value="open_water">Open Water</option>
            </select>
          </div>

          <div class="form-control mb-3">
            <label class="label" for="create-res-datetime">
              <span class="label-text">Date & Time</span>
            </label>
            <input 
              type="datetime-local"
              class="input input-bordered input-sm w-full"
              id="create-res-datetime"
              bind:value={createFormData.res_date}
              min={currentDateTime}
              required
            />
          </div>

          <!-- Pool-specific fields -->
          {#if createFormData.res_type === 'pool'}
            <div class="form-control mb-3">
              <label class="label" for="create-pool-start">
                <span class="label-text">Start Time</span>
              </label>
              <input 
                type="time"
                class="input input-bordered input-sm w-full"
                id="create-pool-start"
                bind:value={createFormData.pool!.start_time}
                required
              />
            </div>
            <div class="form-control mb-3">
              <label class="label" for="create-pool-end">
                <span class="label-text">End Time</span>
              </label>
              <input 
                type="time"
                class="input input-bordered input-sm w-full"
                id="create-pool-end"
                bind:value={createFormData.pool!.end_time}
                required
              />
            </div>
            <div class="form-control mb-3">
              <label class="label" for="create-pool-lane">
                <span class="label-text">Lane (optional)</span>
              </label>
              <input 
                type="text"
                class="input input-bordered input-sm w-full"
                id="create-pool-lane"
                bind:value={createFormData.pool!.lane}
                placeholder="Lane assignment"
              />
            </div>

            <div class="form-control mb-3">
              <label class="label" for="create-pool-notes">
                <span class="label-text">Notes (optional)</span>
              </label>
              <textarea 
                class="textarea textarea-bordered textarea-sm w-full"
                id="create-pool-notes"
                bind:value={createFormData.pool!.note}
                placeholder="Additional notes..."
              ></textarea>
            </div>
          {/if}

          <div class="modal-action mt-1">
            <button type="button" class="btn btn-ghost btn-sm" on:click={() => showCreateForm = false}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary btn-sm" disabled={$reservationStore.loading}>
              Create Reservation
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Edit Reservation Modal -->
  {#if showEditForm && selectedReservation}
    <div class="modal modal-open p-2 sm:p-3">
      <div class="modal-box w-full max-w-sm sm:max-w-md max-h-[100svh] overflow-visible">
        <h3 class="font-bold text-base mb-3">Edit Reservation</h3>
        
        <form on:submit|preventDefault={handleUpdateReservation}>
          <div class="form-control mb-3">
            <label class="label" for="edit-status">
              <span class="label-text">Status</span>
            </label>
            <select 
              class="select select-bordered select-sm w-full"
              id="edit-status"
              bind:value={editFormData.res_status}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div class="form-control mb-3">
            <label class="label" for="edit-res-datetime">
              <span class="label-text">Date & Time</span>
            </label>
            <input 
              type="datetime-local"
              class="input input-bordered input-sm w-full"
              id="edit-res-datetime"
              bind:value={editFormData.res_date}
              min={currentDateTime}
              required
            />
          </div>

          <!-- Type-specific fields would go here -->
          <!-- Similar to create form but for editing -->

          <div class="modal-action mt-1">
            <button type="button" class="btn btn-ghost btn-sm" on:click={closeEditForm}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary btn-sm" disabled={$reservationStore.loading}>
              Update Reservation
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<!-- Global toast for error notifications (duplicate/conflict) -->
<Toast type="error" bind:open={toastOpen} message={toastMessage} />

<style>
  .reservation-crud-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }
</style>
