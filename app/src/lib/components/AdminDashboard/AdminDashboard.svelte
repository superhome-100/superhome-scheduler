<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../utils/supabase';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import PullToRefresh from '../PullToRefresh.svelte';
  import PendingReservations from './PendingReservations.svelte';
  import UserManagement from './UserManagement.svelte';
  import AdminCalendar from './AdminCalendar.svelte';
  import ReservationDetailsModal from '../ReservationDetailsModal/ReservationDetailsModal.svelte';
  import SingleDayView from '../Calendar/SingleDayView.svelte';
  import { reservationApi } from '../../api/reservationApi';
  import { userAdminService } from '../../services/userAdminService';
  import { ReservationType } from '../../types/reservations';

  let users: any[] = [];
  let reservations: any[] = [];
  let pendingReservations: any[] = [];
  let loading = true;
  let refreshing = false;
  let error: string | null = null;

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    try {
      refreshing = true;
      await loadAdminData();
    } catch (error) {
      console.error('Admin refresh error:', error);
    } finally {
      refreshing = false;
    }
  };

  // Bulk update pending reservations via Edge Function, then trigger pull-to-refresh
  // This wires the bulk operation to the same refresh flow as PullToRefresh
  async function bulkUpdatePendingReservations(status: 'pending' | 'confirmed' | 'rejected') {
    try {
      // Show the same visual state used by PullToRefresh
      refreshing = true;

      const reservations = (pendingReservations || []).map((r) => ({ uid: r.uid, res_date: r.res_date }));
      if (reservations.length === 0) {
        // Nothing to update; still run refresh to be consistent
        await handleRefresh();
        return;
      }

      const result = await reservationApi.bulkUpdateStatus(reservations, status);
      if (!result.success) {
        console.error('Bulk update failed:', result.error);
      }

      // After Edge Function completes, reuse the pull-to-refresh callback
      await handleRefresh();
    } catch (e) {
      console.error('Bulk update error:', e);
    } finally {
      refreshing = false;
    }
  }

  // Expose refresh method for parent component
  export async function refresh() {
    await loadAdminData();
  }

  let processingReservation: string | null = null;
  let selectedReservation: any = null;
  let adminView = 'dashboard'; // Track which admin view to show
  
  // Single day view state
  let showSingleDayView = false;
  let selectedDate: string = '';
  let initialSingleDayType: ReservationType = ReservationType.pool;
  let stats = {
    totalUsers: 0,
    activeUsers: 0,
    totalReservations: 0,
    pendingReservations: 0
  };

  // Mobile View Details: open a modal instead of inline expansion
  let showReservationDetailsModal = false;
  const openReservationDetails = (reservation: any) => {
    selectedReservation = reservation;
    showReservationDetailsModal = true;
  };
  const closeReservationDetails = () => {
    showReservationDetailsModal = false;
    selectedReservation = null;
  };



  // Handle calendar event click
  const handleCalendarEventClick = (reservation: any) => {
    openReservationDetails(reservation);
  };

  // Handle calendar date click
  const handleCalendarDateClick = (event: CustomEvent) => {
    const detail: any = event.detail;
    selectedDate = typeof detail === 'string' ? detail : detail?.date;
    initialSingleDayType = typeof detail === 'string' ? initialSingleDayType : (detail?.type || initialSingleDayType);
    
    // Update URL with type parameter
    const url = new URL(window.location.href);
    url.searchParams.set('type', initialSingleDayType);
    window.history.replaceState({}, '', url.toString());
    
    showSingleDayView = true;
  };

  // Handle back to calendar
  const handleBackToCalendar = () => {
    showSingleDayView = false;
    selectedDate = '';
  };

  // Load admin data
  const loadAdminData = async () => {
    try {
      console.log('AdminDashboard: Starting to load admin data...');
      loading = true;
      error = null;

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('AdminDashboard: Users error:', usersError);
        throw usersError;
      }

      console.log('AdminDashboard: Successfully loaded users:', usersData?.length || 0);

      // Load reservations with user info
      let reservationsData: any[] = [];
      let pendingReservationsData: any[] = [];
      try {
        const { data: resData, error: reservationsError } = await supabase
          .from('reservations')
          .select(`
            *,
            user_profiles!reservations_uid_fkey (
              name
            )
          `)
          .order('created_at', { ascending: false });
        
        if (!reservationsError) {
          reservationsData = resData || [];
          pendingReservationsData = reservationsData.filter(r => r.res_status === 'pending');
          console.log('AdminDashboard: Successfully loaded reservations:', reservationsData.length);
        }
      } catch (resErr) {
        console.log('AdminDashboard: Reservations table not found, skipping...');
      }

      users = usersData || [];
      reservations = reservationsData;
      pendingReservations = pendingReservationsData;

      // Calculate stats
      stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        totalReservations: reservations.length,
        pendingReservations: pendingReservations.length
      };

      console.log('AdminDashboard: Stats calculated:', stats);

    } catch (err) {
      console.error('AdminDashboard: Error loading admin data:', err);
      error = err instanceof Error ? err.message : 'Failed to load admin data';
    } finally {
      loading = false;
      console.log('AdminDashboard: Loading completed');
    }
  };

  // Handle reservation actions
  const handleReservationAction = async (reservation: any, action: 'approve' | 'reject') => {
    const reservationKey = `${reservation.uid}-${reservation.res_date}`;
    processingReservation = reservationKey;

    try {
      const newStatus = action === 'approve' ? 'confirmed' : 'rejected';
      
      const result = await reservationApi.updateReservationStatus(
        reservation.uid,
        reservation.res_date,
        newStatus
      );
      if (!result.success) {
        throw new Error(result.error || 'Failed to update reservation status');
      }

      // Refresh data
      await loadAdminData();
      
      // Close modal if open
      if (showReservationDetailsModal) {
        closeReservationDetails();
      }

    } catch (err) {
      console.error(`Error ${action}ing reservation:`, err);
      error = err instanceof Error ? err.message : `Failed to ${action} reservation`;
    } finally {
      processingReservation = null;
    }
  };

  // Toggle user status via Edge Function
  const toggleUserStatus = async (uid: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      const res = await userAdminService.updateStatus(uid, newStatus);
      if (!res.success) throw new Error(res.error || 'Failed to update user status');
      await loadAdminData();
    } catch (err) {
      console.error('Error toggling user status:', err);
      error = err instanceof Error ? err.message : 'Failed to update user status';
    }
  };

  // Toggle user privilege via Edge Function
  const toggleUserPrivilege = async (uid: string, currentPrivileges: string[]) => {
    try {
      const newPrivileges = currentPrivileges.includes('admin') 
        ? currentPrivileges.filter(p => p !== 'admin')
        : [...currentPrivileges, 'admin'];
      const res = await userAdminService.updatePrivileges(uid, newPrivileges);
      if (!res.success) throw new Error(res.error || 'Failed to update user privilege');
      await loadAdminData();
    } catch (err) {
      console.error('Error toggling user privilege:', err);
      error = err instanceof Error ? err.message : 'Failed to update user privilege';
    }
  };

  // Determine admin view based on current view
  $: {
    if (typeof window !== 'undefined') {
      const urlPath = window.location.pathname;
      if (urlPath.includes('/admin/calendar')) {
        adminView = 'calendar';
      } else if (urlPath.includes('/admin/users')) {
        adminView = 'users';
      } else {
        adminView = 'dashboard';
      }
    }
  }

  // Load data on mount
  // Timeout handling for loading state
  let loadingTimeout: NodeJS.Timeout;
  $: if (loading) {
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
      console.warn('AdminDashboard: Loading timeout - forcing loading to false');
      loading = false;
      error = 'Loading timeout - please try refreshing';
    }, 10000); // 10 second timeout
  } else {
    clearTimeout(loadingTimeout);
  }

  onMount(() => {
    console.log('AdminDashboard: Component mounted, loading admin data...');
    loadAdminData();
  });

</script>

<div class="min-h-screen flex flex-col" style="background-color: #f8f9fa;">
  <PullToRefresh onRefresh={handleRefresh} {refreshing}>
    <div class="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12 max-w-7xl mx-auto w-full">
      {#if loading}
        <div class="flex flex-col items-center justify-center py-16 px-8 text-center">
          <LoadingSpinner />
          <p class="mt-4 text-base-content/70 text-base">Loading admin data...</p>
        </div>
      {:else if error}
        <div class="bg-base-100 rounded-xl p-8 text-center shadow-sm border border-error/20">
          <h2 class="text-error text-xl mb-4 font-semibold">Error Loading Data</h2>
          <p class="text-base-content/70 mb-6">{error}</p>
          <button class="btn btn-primary" on:click={loadAdminData}>Retry</button>
        </div>
      {:else}
        <!-- Content based on admin view -->
        {#if adminView === 'dashboard'}
          <PendingReservations 
            {pendingReservations}
            {stats}
            {processingReservation}
            on:refresh={handleRefresh}
            on:reservationAction={(e: any) => handleReservationAction(e.detail.reservation, e.detail.action)}
            on:openReservationDetails={(e: any) => openReservationDetails(e.detail)}
          />
        {:else if adminView === 'calendar'}
          {#if showSingleDayView}
            <SingleDayView
              {selectedDate}
              {reservations}
              isAdmin={true}
              initialType={initialSingleDayType}
              on:backToCalendar={handleBackToCalendar}
              on:reservationClick={handleCalendarEventClick}
            />
          {:else}
            <!-- Calendar Content Card -->
            <div class="card bg-base-100 shadow-lg border border-base-300">
              <div class="card-body p-6">
                <AdminCalendar 
                  {reservations}
                  {loading}
                  on:dateClick={handleCalendarDateClick}
                />
              </div>
            </div>
          {/if}
        {:else if adminView === 'users'}
          <UserManagement 
            {users}
            {stats}
            on:refresh={handleRefresh}
            on:toggleUserStatus={(e: any) => toggleUserStatus(e.detail.uid, e.detail.currentStatus)}
            on:toggleUserPrivilege={(e: any) => toggleUserPrivilege(e.detail.uid, e.detail.currentPrivileges)}
          />
        {/if}
      {/if}
    </div>
  </PullToRefresh>

  <ReservationDetailsModal 
    showModal={showReservationDetailsModal}
    {selectedReservation}
    {processingReservation}
    on:closeModal={closeReservationDetails}
    on:reservationAction={(e: any) => handleReservationAction(e.detail.reservation, e.detail.action)}
  />
</div>
