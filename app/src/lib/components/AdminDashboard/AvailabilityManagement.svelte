<script lang="ts">
  import { onMount } from 'svelte';
  import { availabilityService } from '../../services/availabilityService';
  import type { ReservationType } from '../../services/reservationService';
  import type { Database } from '../../database.types';

  type Availability = Database['public']['Tables']['availabilities']['Row'];

  // State
  let availabilities: Availability[] = [];
  let loading = false;
  let error = '';
  let showAddForm = false;
  let selectedAvailability: Availability | null = null;

  // Form data
  let formData = {
    date: '',
    res_type: 'pool' as ReservationType,
    category: '',
    available: true,
    reason: ''
  };

  // Reservation types
  const reservationTypes: { value: ReservationType; label: string }[] = [
    { value: 'pool', label: 'Pool' },
    { value: 'open_water', label: 'Open Water' },
    { value: 'classroom', label: 'Classroom' }
  ];

  onMount(() => {
    loadAvailabilities();
  });

  async function loadAvailabilities() {
    loading = true;
    error = '';
    try {
      // For now, we'll get all availabilities
      // In a real implementation, you might want pagination
      const { data, error: fetchError } = await supabase
        .from('availabilities')
        .select('*')
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;
      availabilities = data || [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load availabilities';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit() {
    if (!formData.date || !formData.res_type) {
      error = 'Date and reservation type are required';
      return;
    }

    loading = true;
    error = '';

    try {
      if (selectedAvailability) {
        // Update existing
        const result = await availabilityService.updateAvailabilityOverride(
          selectedAvailability.id,
          {
            date: formData.date,
            res_type: formData.res_type,
            category: formData.category || null,
            available: formData.available,
            reason: formData.reason || null
          }
        );

        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        // Create new
        const result = await availabilityService.createAvailabilityOverride({
          date: formData.date,
          res_type: formData.res_type,
          category: formData.category || null,
          available: formData.available,
          reason: formData.reason || null
        });

        if (!result.success) {
          throw new Error(result.error);
        }
      }

      await loadAvailabilities();
      resetForm();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save availability';
    } finally {
      loading = false;
    }
  }

  async function handleDelete(availability: Availability) {
    if (!confirm('Are you sure you want to delete this availability override?')) {
      return;
    }

    loading = true;
    error = '';

    try {
      const result = await availabilityService.deleteAvailabilityOverride(availability.id);
      if (!result.success) {
        throw new Error(result.error);
      }

      await loadAvailabilities();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete availability';
    } finally {
      loading = false;
    }
  }

  function editAvailability(availability: Availability) {
    selectedAvailability = availability;
    formData = {
      date: availability.date,
      res_type: availability.res_type as ReservationType,
      category: availability.category || '',
      available: availability.available,
      reason: availability.reason || ''
    };
    showAddForm = true;
  }

  function resetForm() {
    selectedAvailability = null;
    formData = {
      date: '',
      res_type: 'pool',
      category: '',
      available: true,
      reason: ''
    };
    showAddForm = false;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<div class="container mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-base-content mb-2">Availability Management</h1>
    <p class="text-base-content/70">
      Manage availability overrides for specific dates, types, and categories.
      By default, all dates are available unless specifically marked as unavailable.
    </p>
  </div>

  {#if error}
    <div class="alert alert-error mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{error}</span>
    </div>
  {/if}

  <div class="flex justify-between items-center mb-6">
    <h2 class="text-xl font-semibold">Availability Overrides</h2>
    <button 
      class="btn btn-primary"
      on:click={() => showAddForm = true}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add Override
    </button>
  </div>

  {#if showAddForm}
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h3 class="card-title">
          {selectedAvailability ? 'Edit' : 'Add'} Availability Override
        </h3>
        
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label for="date-input" class="label">
                <span class="label-text">Date</span>
              </label>
              <input
                id="date-input"
                type="date"
                class="input input-bordered"
                bind:value={formData.date}
                required
              />
            </div>

            <div class="form-control">
              <label for="res-type-select" class="label">
                <span class="label-text">Reservation Type</span>
              </label>
              <select id="res-type-select" class="select select-bordered" bind:value={formData.res_type} required>
                {#each reservationTypes as type}
                  <option value={type.value}>{type.label}</option>
                {/each}
              </select>
            </div>

            <div class="form-control">
              <label for="category-input" class="label">
                <span class="label-text">Category (Optional)</span>
              </label>
              <input
                id="category-input"
                type="text"
                class="input input-bordered"
                bind:value={formData.category}
                placeholder="e.g., course_coaching, maintenance"
              />
            </div>

            <div class="form-control">
              <label for="available-select" class="label">
                <span class="label-text">Available</span>
              </label>
              <select id="available-select" class="select select-bordered" bind:value={formData.available}>
                <option value={true}>Available</option>
                <option value={false}>Unavailable</option>
              </select>
            </div>
          </div>

          <div class="form-control">
            <label for="reason-textarea" class="label">
              <span class="label-text">Reason (Optional)</span>
            </label>
            <textarea
              id="reason-textarea"
              class="textarea textarea-bordered"
              bind:value={formData.reason}
              placeholder="e.g., Maintenance day, Equipment issue"
              rows="3"
            ></textarea>
          </div>

          <div class="card-actions justify-end">
            <button type="button" class="btn btn-ghost" on:click={resetForm}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={loading}>
              {#if loading}
                <span class="loading loading-spinner loading-sm"></span>
              {/if}
              {selectedAvailability ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  {#if loading && !showAddForm}
    <div class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if availabilities.length === 0}
    <div class="text-center py-8">
      <p class="text-base-content/70">No availability overrides found.</p>
      <p class="text-sm text-base-content/50 mt-2">
        All dates are available by default unless specifically marked as unavailable.
      </p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each availabilities as availability}
            <tr>
              <td>{formatDate(availability.date)}</td>
              <td>
                <span class="badge badge-outline">
                  {availability.res_type.replace('_', ' ').toUpperCase()}
                </span>
              </td>
              <td>
                {availability.category || '-'}
              </td>
              <td>
                <span class="badge {availability.available ? 'badge-success' : 'badge-error'}">
                  {availability.available ? 'Available' : 'Unavailable'}
                </span>
              </td>
              <td>{availability.reason || '-'}</td>
              <td>
                <div class="flex gap-2">
                  <button
                    class="btn btn-sm btn-outline"
                    on:click={() => editAvailability(availability)}
                  >
                    Edit
                  </button>
                  <button
                    class="btn btn-sm btn-error btn-outline"
                    on:click={() => handleDelete(availability)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
  }
</style>
