import { writable, derived, get } from 'svelte/store';
import { reservationApi } from '../api/reservationApi';
import type { CompleteReservation, CreateReservationData, UpdateReservationData } from '../api/reservationApi';

// Store state interface
interface ReservationStoreState {
  reservations: CompleteReservation[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Initial state
const initialState: ReservationStoreState = {
  reservations: [],
  loading: false,
  error: null,
  lastUpdated: null
};

// Create the store
function createReservationStore() {
  const { subscribe, set, update } = writable<ReservationStoreState>(initialState);

  return {
    subscribe,
    
    // Reset store to initial state
    reset: () => set(initialState),

    // Set loading state
    setLoading: (loading: boolean) => update(state => ({ ...state, loading, error: null })),

    // Set error state
    setError: (error: string | null) => update(state => ({ ...state, error, loading: false })),

    // Set reservations data
    setReservations: (reservations: CompleteReservation[]) => update(state => ({
      ...state,
      reservations,
      loading: false,
      error: null,
      lastUpdated: new Date()
    })),

    // Add a single reservation
    addReservation: (reservation: CompleteReservation) => update(state => ({
      ...state,
      reservations: [...state.reservations, reservation],
      lastUpdated: new Date()
    })),

    // Update a single reservation
    updateReservationInStore: (uid: string, res_date: string, updatedReservation: CompleteReservation) => 
      update(state => ({
        ...state,
        reservations: state.reservations.map(r => 
          r.uid === uid && r.res_date === res_date ? updatedReservation : r
        ),
        lastUpdated: new Date()
      })),

    // Remove a single reservation
    removeReservationFromStore: (uid: string, res_date: string) => 
      update(state => ({
        ...state,
        reservations: state.reservations.filter(r => 
          !(r.uid === uid && r.res_date === res_date)
        ),
        lastUpdated: new Date()
      })),

    // Load reservations for a user
    loadUserReservations: async (uid: string) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      const result = await reservationApi.getReservations({ uid });
      
      if (result.success && result.data) {
        update(state => ({
          ...state,
          reservations: result.data!,
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
      } else {
        update(state => ({
          ...state,
          loading: false,
          error: result.error || 'Failed to load reservations'
        }));
      }
    },

    // Load upcoming reservations for a user
    loadUpcomingReservations: async (uid: string, limit: number = 10) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      const result = await reservationApi.getUpcomingReservations(uid, limit);
      
      if (result.success && result.data) {
        update(state => ({
          ...state,
          reservations: result.data!,
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
      } else {
        update(state => ({
          ...state,
          loading: false,
          error: result.error || 'Failed to load upcoming reservations'
        }));
      }
    },

    // Load past reservations for a user
    loadPastReservations: async (uid: string, limit: number = 10) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      const result = await reservationApi.getPastReservations(uid, limit);
      
      if (result.success && result.data) {
        update(state => ({
          ...state,
          reservations: result.data!,
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
      } else {
        update(state => ({
          ...state,
          loading: false,
          error: result.error || 'Failed to load past reservations'
        }));
      }
    },

    // Load reservations by status
    loadReservationsByStatus: async (status: 'pending' | 'confirmed' | 'rejected', limit: number = 50) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      const result = await reservationApi.getReservationsByStatus(status, { limit });
      
      if (result.success && result.data) {
        update(state => ({
          ...state,
          reservations: result.data!,
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
      } else {
        update(state => ({
          ...state,
          loading: false,
          error: result.error || 'Failed to load reservations by status'
        }));
      }
    },

    // Create a new reservation
    createReservation: async (uid: string, reservationData: CreateReservationData) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      const result = await reservationApi.createReservation(uid, reservationData);
      
      if (result.success && result.data) {
        update(state => ({
          ...state,
          reservations: [...state.reservations, result.data!],
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true, data: result.data };
      } else {
        update(state => ({
          ...state,
          loading: false,
          error: result.error || 'Failed to create reservation'
        }));
        return { success: false, error: result.error };
      }
    },

    // Update a reservation
    updateReservation: async (uid: string, res_date: string, updateData: UpdateReservationData) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      const result = await reservationApi.updateReservation(uid, res_date, updateData);
      
      if (result.success && result.data) {
        update(state => ({
          ...state,
          reservations: state.reservations.map(r => 
            r.uid === uid && r.res_date === res_date ? result.data! : r
          ),
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true, data: result.data };
      } else {
        update(state => ({
          ...state,
          loading: false,
          error: result.error || 'Failed to update reservation'
        }));
        return { success: false, error: result.error };
      }
    },

    // Delete a reservation
    deleteReservation: async (uid: string, res_date: string) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      const result = await reservationApi.deleteReservation(uid, res_date);
      
      if (result.success) {
        update(state => ({
          ...state,
          reservations: state.reservations.filter(r => 
            !(r.uid === uid && r.res_date === res_date)
          ),
          loading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true };
      } else {
        update(state => ({
          ...state,
          loading: false,
          error: result.error || 'Failed to delete reservation'
        }));
        return { success: false, error: result.error };
      }
    },

    // Update reservation status
    updateReservationStatus: async (
      uid: string, 
      res_date: string, 
      status: 'pending' | 'confirmed' | 'rejected'
    ) => {
      return store.updateReservation(uid, res_date, { res_status: status });
    },

    // Approve a reservation
    approveReservation: async (uid: string, res_date: string) => {
      return store.updateReservationStatus(uid, res_date, 'confirmed');
    },

    // Reject a reservation
    rejectReservation: async (uid: string, res_date: string) => {
      return store.updateReservationStatus(uid, res_date, 'rejected');
    },

    // Bulk update statuses
    bulkUpdateStatus: async (
      reservations: Array<{ uid: string; res_date: string }>,
      status: 'pending' | 'confirmed' | 'rejected'
    ) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      const result = await reservationApi.bulkUpdateStatus(reservations, status);
      
      if (result.success) {
        // Refresh the store to get updated data
        const currentState = get(store);
        if (currentState.reservations.length > 0) {
          const firstReservation = currentState.reservations[0];
          await store.loadUserReservations(firstReservation.uid);
        }
        return { success: true, data: result.data };
      } else {
        update(state => ({
          ...state,
          loading: false,
          error: result.error || 'Failed to bulk update reservations'
        }));
        return { success: false, error: result.error };
      }
    }
  };
}

// Create the store instance
const store = createReservationStore();
export const reservationStore = store;

// Derived stores for common use cases
export const upcomingReservations = derived(
  reservationStore,
  ($store) => {
    const now = new Date().toISOString();
    return $store.reservations
      .filter(r => r.res_date >= now)
      .sort((a, b) => new Date(a.res_date).getTime() - new Date(b.res_date).getTime());
  }
);

export const pastReservations = derived(
  reservationStore,
  ($store) => {
    const now = new Date().toISOString();
    return $store.reservations
      .filter(r => r.res_date < now)
      .sort((a, b) => new Date(b.res_date).getTime() - new Date(a.res_date).getTime());
  }
);

export const pendingReservations = derived(
  reservationStore,
  ($store) => $store.reservations.filter(r => r.res_status === 'pending')
);

export const confirmedReservations = derived(
  reservationStore,
  ($store) => $store.reservations.filter(r => r.res_status === 'confirmed')
);

export const rejectedReservations = derived(
  reservationStore,
  ($store) => $store.reservations.filter(r => r.res_status === 'rejected')
);

export const poolReservations = derived(
  reservationStore,
  ($store) => $store.reservations.filter(r => r.res_type === 'pool')
);

export const classroomReservations = derived(
  reservationStore,
  ($store) => $store.reservations.filter(r => r.res_type === 'classroom')
);

export const openWaterReservations = derived(
  reservationStore,
  ($store) => $store.reservations.filter(r => r.res_type === 'open_water')
);

// Store statistics
export const reservationStats = derived(
  reservationStore,
  ($store) => {
    const reservations = $store.reservations;
    return {
      total: reservations.length,
      pending: reservations.filter(r => r.res_status === 'pending').length,
      confirmed: reservations.filter(r => r.res_status === 'confirmed').length,
      rejected: reservations.filter(r => r.res_status === 'rejected').length,
      pool: reservations.filter(r => r.res_type === 'pool').length,
      classroom: reservations.filter(r => r.res_type === 'classroom').length,
      openWater: reservations.filter(r => r.res_type === 'open_water').length,
      upcoming: reservations.filter(r => r.res_date >= new Date().toISOString()).length,
      past: reservations.filter(r => r.res_date < new Date().toISOString()).length
    };
  }
);

// Export types
export type { CompleteReservation, CreateReservationData, UpdateReservationData };
