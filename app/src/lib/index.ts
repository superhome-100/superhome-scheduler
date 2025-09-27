// Central barrel exports for lib modules and components
// Paths mapped to actual locations under components/, utils/, and stores/

// Components (root-level files)
export { default as PullToRefresh } from './components/PullToRefresh.svelte';
export { default as LoadingSpinner } from './components/LoadingSpinner.svelte';
export { default as Login } from './components/Login.svelte';
export { default as AuthCallback } from './components/AuthCallback.svelte';

// Components (foldered)
export { default as Sidebar } from './components/Sidebar/Sidebar.svelte';
export { default as Dashboard } from './components/Dashboard/Dashboard.svelte';
export { default as AdminDashboard } from './components/AdminDashboard/AdminDashboard.svelte';
export { default as Reservation } from './components/Reservation/Reservation.svelte';
export { default as ReservationFormModal } from './components/ReservationFormModal/ReservationFormModal.svelte';
export { default as ReservationsListModal } from './components/ReservationsListModal/ReservationsListModal.svelte';
export { default as ReservationDetailsModal } from './components/ReservationDetailsModal/ReservationDetailsModal.svelte';

// Utils
export { supabase } from './utils/supabase';
export * as reservationData from './utils/reservationData';

// Stores
export { authStore, auth, type AuthState } from './stores/auth';
