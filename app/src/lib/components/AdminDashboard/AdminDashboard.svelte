<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { authStore } from '../../stores/auth';
  import { supabase } from '../../utils/supabase';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import PullToRefresh from '../PullToRefresh.svelte';
  import AdminHeader from './AdminHeader.svelte';
  import PendingReservations from './PendingReservations.svelte';
  import UserManagement from './UserManagement.svelte';
  import ReservationDetailsModal from './ReservationDetailsModal.svelte';
  import { formatDate, getTypeDisplay } from './adminUtils';

  const dispatch = createEventDispatcher();

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

  // Expose refresh method for parent component
  export async function refresh() {
    await loadAdminData();
  }

  let processingReservation: string | null = null;
  let showRejectModal = false;
  let selectedReservation: any = null;
  let rejectReason = '';
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

  // Mobile sidebar toggle
  const toggleMobileSidebar = () => {
    dispatch('toggleMobileSidebar');
  };

  // Load admin data
  const loadAdminData = async () => {
    try {
      loading = true;
      error = null;

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Load reservations with user info
      let reservationsData = [];
      let pendingReservationsData = [];
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
        }
      } catch (resErr) {
        console.log('Reservations table not found, skipping...');
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

    } catch (err) {
      console.error('Error loading admin data:', err);
      error = err instanceof Error ? err.message : 'Failed to load admin data';
    } finally {
      loading = false;
    }
  };

  // Handle reservation actions
  const handleReservationAction = async (reservation: any, action: 'approve' | 'reject') => {
    const reservationKey = `${reservation.uid}-${reservation.res_date}`;
    processingReservation = reservationKey;

    try {
      const newStatus = action === 'approve' ? 'confirmed' : 'rejected';
      
      const { error } = await supabase
        .from('reservations')
        .update({ 
          res_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('uid', reservation.uid)
        .eq('res_date', reservation.res_date);

      if (error) throw error;

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

  // Toggle user status
  const toggleUserStatus = async (uid: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('uid', uid);

      if (error) throw error;

      // Refresh data
      await loadAdminData();

    } catch (err) {
      console.error('Error toggling user status:', err);
      error = err instanceof Error ? err.message : 'Failed to update user status';
    }
  };

  // Toggle user privilege
  const toggleUserPrivilege = async (uid: string, currentPrivileges: string[]) => {
    try {
      const newPrivileges = currentPrivileges.includes('admin') 
        ? currentPrivileges.filter(p => p !== 'admin')
        : [...currentPrivileges, 'admin'];
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          privileges: newPrivileges,
          updated_at: new Date().toISOString()
        })
        .eq('uid', uid);

      if (error) throw error;

      // Refresh data
      await loadAdminData();

    } catch (err) {
      console.error('Error toggling user privilege:', err);
      error = err instanceof Error ? err.message : 'Failed to update user privilege';
    }
  };

  // Load data on mount
  onMount(() => {
    loadAdminData();
  });

</script>

<div class="admin-dashboard">
  <AdminHeader on:toggleMobileSidebar={toggleMobileSidebar} />
  
  <PullToRefresh onRefresh={handleRefresh} {refreshing}>
    <div class="admin-content">
      {#if loading}
        <div class="loading-container">
          <LoadingSpinner />
          <p>Loading admin data...</p>
        </div>
      {:else if error}
        <div class="error-container">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <button class="retry-btn" on:click={loadAdminData}>Retry</button>
        </div>
      {:else}
        <PendingReservations 
          {pendingReservations}
          {stats}
          {processingReservation}
          on:refresh={handleRefresh}
          on:reservationAction={(e: any) => handleReservationAction(e.detail.reservation, e.detail.action)}
          on:openReservationDetails={(e: any) => openReservationDetails(e.detail)}
        />

        <UserManagement 
          {users}
          {stats}
          on:refresh={handleRefresh}
          on:toggleUserStatus={(e: any) => toggleUserStatus(e.detail.uid, e.detail.currentStatus)}
          on:toggleUserPrivilege={(e: any) => toggleUserPrivilege(e.detail.uid, e.detail.currentPrivileges)}
        />
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

<style>
  .admin-dashboard {
    min-height: 100vh;
    background: #f8fafc;
  }

  .admin-content {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .loading-container p {
    margin-top: 1rem;
    color: #64748b;
    font-size: 1rem;
  }

  .error-container {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid #fecaca;
  }

  .error-container h2 {
    color: #dc2626;
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
  }

  .error-container p {
    color: #64748b;
    margin: 0 0 1.5rem 0;
  }

  .retry-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s ease;
  }

  .retry-btn:hover {
    background: #2563eb;
  }

  @media (max-width: 768px) {
    .admin-content {
      padding: 1rem;
    }
  }
</style>