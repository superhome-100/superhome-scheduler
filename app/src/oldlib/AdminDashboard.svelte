<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { authStore } from './auth';
  import { supabase } from './supabase';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import PullToRefresh from './PullToRefresh.svelte';

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

  onMount(async () => {
    await loadAdminData();
  });

  const loadAdminData = async () => {
    try {
      loading = true;
      error = null;

      // Load users from user_profiles table
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('uid, name, status, privileges, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Load all reservations with user info
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

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('uid', userId);

      if (error) throw error;

      // Refresh data
      await loadAdminData();
    } catch (err) {
      console.error('Error updating user status:', err);
      alert('Failed to update user status');
    }
  };

  const toggleUserPrivilege = async (userId: string, currentPrivileges: string[]) => {
    try {
      // Toggle between admin and user privileges
      const isAdmin = currentPrivileges.includes('admin');
      const newPrivileges = isAdmin ? ['user'] : ['admin', 'user'];
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          privileges: newPrivileges, 
          updated_at: new Date().toISOString() 
        })
        .eq('uid', userId);

      if (error) throw error;

      // Refresh data
      await loadAdminData();
    } catch (err) {
      console.error('Error updating user privileges:', err);
      alert('Failed to update user privileges');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleMobileSidebar = () => {
    dispatch('toggleMobileSidebar');
  };

  const handleReservationAction = async (reservation: any, action: 'approve' | 'reject') => {
    if (action === 'reject') {
      selectedReservation = reservation;
      showRejectModal = true;
      return;
    }

    try {
      processingReservation = `${reservation.uid}-${reservation.res_date}`;
      
      const { error } = await supabase
        .from('reservations')
        .update({ 
          res_status: 'confirmed'
        })
        .eq('uid', reservation.uid)
        .eq('res_date', reservation.res_date);

      if (error) throw error;

      // Refresh data
      await loadAdminData();
    } catch (err) {
      console.error('Error approving reservation:', err);
      alert('Failed to approve reservation');
    } finally {
      processingReservation = null;
    }
  };

  const confirmRejectReservation = async () => {
    if (!selectedReservation) return;

    try {
      processingReservation = `${selectedReservation.uid}-${selectedReservation.res_date}`;
      
      const { error } = await supabase
        .from('reservations')
        .update({ 
          res_status: 'rejected'
        })
        .eq('uid', selectedReservation.uid)
        .eq('res_date', selectedReservation.res_date);

      if (error) throw error;

      // Refresh data
      await loadAdminData();
      closeRejectModal();
    } catch (err) {
      console.error('Error rejecting reservation:', err);
      alert('Failed to reject reservation');
    } finally {
      processingReservation = null;
    }
  };

  const closeRejectModal = () => {
    showRejectModal = false;
    selectedReservation = null;
    rejectReason = '';
  };

  const getTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      pool: 'Pool',
      open_water: 'Open Water',
      classroom: 'Classroom'
    };
    return typeMap[type] || type;
  };
</script>

<div class="admin-dashboard">
  <div class="admin-header">
    <div class="header-content">
      <div class="header-left">
        <button class="mobile-menu-toggle" on:click={toggleMobileSidebar} aria-label="Toggle menu">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
        <div class="header-text">
          <h1 class="page-title">Admin Dashboard</h1>
          <p class="page-subtitle">Manage users and reservations</p>
        </div>
      </div>
    </div>
  </div>
  
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
    <!-- Stats cards removed per request -->

    <!-- Pending Reservations -->
    <div class="section">
      <div class="section-header">
        <h2>Pending Reservation Requests <span class="badge">{stats.pendingReservations}</span></h2>
        <button class="refresh-btn" on:click={loadAdminData}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          Refresh
        </button>
      </div>
      
      {#if pendingReservations.length > 0}
        <!-- Mobile compact list (Name, Type, Date, View Details -> opens modal) -->
        <div class="pending-mobile" class:scrollable={pendingReservations.length > 5}>
          {#each pendingReservations as reservation}
              <div class="pending-item">
                <div class="pi-left">
                  <div class="pi-name">{reservation.user_profiles?.name || 'Unknown User'}</div>
                  <div class="pi-meta">
                    <span class="reservation-type-badge" class:pool={reservation.res_type === 'pool'} class:open-water={reservation.res_type === 'open_water'} class:classroom={reservation.res_type === 'classroom'}>
                      {getTypeDisplay(reservation.res_type)}
                    </span>
                    <span class="pi-date">{formatDate(reservation.res_date)}</span>
                  </div>
                </div>
                <div class="pi-actions">
                  <button class="view-btn" on:click={() => openReservationDetails(reservation)}>View Details</button>
                </div>
              </div>
          {/each}
        </div>

        <div class="reservations-grid">
          {#each pendingReservations as reservation}
            <div class="reservation-card">
              <div class="reservation-card-header">
                <div class="user-info">
                  <div class="user-avatar">
                    {reservation.user_profiles?.name?.charAt(0) || 'U'}
                  </div>
                  <div class="user-details">
                    <span class="user-name">{reservation.user_profiles?.name || 'Unknown User'}</span>
                    <span class="reservation-type-badge" class:pool={reservation.res_type === 'pool'} class:open-water={reservation.res_type === 'open_water'} class:classroom={reservation.res_type === 'classroom'}>
                      {getTypeDisplay(reservation.res_type)}
                    </span>
                  </div>
                </div>
                <div class="reservation-date">
                  {formatDate(reservation.res_date)}
                </div>
              </div>
              
              <div class="reservation-card-body">
                {#if reservation.title}
                  <h4 class="reservation-title">{reservation.title}</h4>
                {/if}
                {#if reservation.description}
                  <p class="reservation-description">{reservation.description}</p>
                {/if}
                <div class="reservation-meta">
                  <span class="meta-item">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    Requested {formatDate(reservation.created_at)}
                  </span>
                </div>
              </div>
              
              <div class="reservation-card-actions">
                <button 
                  class="action-btn reject"
                  on:click={() => handleReservationAction(reservation, 'reject')}
                  disabled={processingReservation === `${reservation.uid}-${reservation.res_date}`}
                  title="Reject reservation"
                >
                  {#if processingReservation === `${reservation.uid}-${reservation.res_date}`}
                    <LoadingSpinner size="sm" />
                  {:else}
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    Reject
                  {/if}
                </button>
                <button 
                  class="action-btn approve"
                  on:click={() => handleReservationAction(reservation, 'approve')}
                  disabled={processingReservation === `${reservation.uid}-${reservation.res_date}`}
                  title="Approve reservation"
                >
                  {#if processingReservation === `${reservation.uid}-${reservation.res_date}`}
                    <LoadingSpinner size="sm" />
                  {:else}
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Approve
                  {/if}
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-reservations">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
          <p>No pending reservation requests</p>
        </div>
      {/if}
    </div>

    <!-- Users Management -->
    <div class="section">
      <div class="section-header">
        <h2 class="user-mgmt-title">
          User Management
          <span class="total-users-pill"><span class="dot"></span>{stats.totalUsers} Total Users</span>
        </h2>
        <button class="refresh-btn" on:click={loadAdminData}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          Refresh
        </button>
      </div>
      
      <div class="users-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
              <th scope="col">Privileges</th>
              <th scope="col">Created At</th>
              <th scope="col">Updated At</th>
              <th scope="col" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each users as user}
              <tr>
                <td data-label="Name">
                  <div class="user-info">
                    <div class="user-avatar">{user.name?.charAt(0) || 'U'}</div>
                    <span>{user.name || 'Unknown'}</span>
                  </div>
                </td>
                <td data-label="Status">
                  <button 
                    class="status-toggle"
                    class:active={user.status === 'active'}
                    class:disabled={user.status === 'disabled'}
                    on:click={() => toggleUserStatus(user.uid, user.status)}
                    title="Click to toggle status"
                  >
                    {user.status}
                  </button>
                </td>
                <td data-label="Privileges">
                  <button 
                    class="privilege-toggle"
                    class:admin={user.privileges.includes('admin')}
                    class:user={!user.privileges.includes('admin')}
                    on:click={() => toggleUserPrivilege(user.uid, user.privileges)}
                    title="Click to toggle privilege"
                  >
                    {user.privileges.includes('admin') ? 'Admin' : 'User'}
                  </button>
                </td>
                <td data-label="Created At"><span class="date-text">{formatDate(user.created_at)}</span></td>
                <td data-label="Updated At"><span class="date-text">{formatDate(user.updated_at)}</span></td>
                <td data-label="Actions" class="text-right">
                  <button 
                    class="action-btn refresh"
                    on:click={() => loadAdminData()}
                    title="Refresh data"
                    aria-label="Refresh user data"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- View Details Modal -->
  {#if showReservationDetailsModal && selectedReservation}
    <div 
      class="modal-overlay" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-modal-title"
      tabindex="-1"
    >
      <div class="modal-content" role="document">
        <div class="modal-header">
          <h3 id="details-modal-title">Reservation Details</h3>
          <button class="modal-close" on:click={closeReservationDetails} aria-label="Close modal">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="reservation-summary">
            <h4>Reservation</h4>
            <p><strong>User:</strong> {selectedReservation.user_profiles?.name || 'Unknown User'}</p>
            <p><strong>Type:</strong> {getTypeDisplay(selectedReservation.res_type)}</p>
            <p><strong>Date:</strong> {formatDate(selectedReservation.res_date)}</p>
            {#if selectedReservation.title}
              <p><strong>Title:</strong> {selectedReservation.title}</p>
            {/if}
            {#if selectedReservation.description}
              <p><strong>Description:</strong> {selectedReservation.description}</p>
            {/if}
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary details-close-btn" on:click={closeReservationDetails}>Close</button>
          <button 
            class="btn-danger" 
            on:click={() => { const r = selectedReservation; closeReservationDetails(); if (r) handleReservationAction(r, 'reject'); }}
            disabled={selectedReservation && processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
          >
            {#if processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
              <LoadingSpinner size="sm" />
              Working...
            {:else}
              Reject
            {/if}
          </button>
          <button 
            class="btn-primary" 
            on:click={() => { const r = selectedReservation; closeReservationDetails(); if (r) handleReservationAction(r, 'approve'); }}
            disabled={selectedReservation && processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
          >
            {#if processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
              <LoadingSpinner size="sm" />
              Working...
            {:else}
              Approve
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Close admin-content div -->
  </div>
  </PullToRefresh>
</div>

<style>
  .admin-dashboard {
    flex: 1;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .admin-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-content {
    padding: 1.5rem 2rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .mobile-menu-toggle {
    display: none;
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .mobile-menu-toggle:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  .header-text {
    flex: 1;
  }

  .admin-content {
    flex: 1;
    padding: 2rem;
  }

  .page-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .page-subtitle {
    color: #64748b;
    margin: 0;
  }

  .loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .retry-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 1rem;
  }

  /* removed old stats styles */

  .section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  /* Badge and pill indicators */
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.6rem;
    margin-left: 0.5rem;
    border-radius: 9999px;
    background: #ef4444; /* red */
    color: #fff;
    font-size: 1rem; /* bigger number */
    line-height: 1;
    font-weight: 800;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.1);
  }

  .user-mgmt-title { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

  .total-users-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #f1f5f9;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 9999px;
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .total-users-pill .dot {
    width: 8px; height: 8px; border-radius: 9999px; background: #22c55e; /* active */
    box-shadow: 0 0 0 3px rgba(34,197,94,0.15);
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .refresh-btn:hover {
    background: #e2e8f0;
  }

  .users-table {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }

  .users-table table { width: 100%; border-collapse: separate; border-spacing: 0; }
  .users-table thead th {
    text-align: left;
    background: #f8fafc;
    color: #374151;
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .users-table tbody td { padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
  .users-table tbody tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; }

  /* Prevent wrapping for single-line rows */
  .users-table th, .users-table td { white-space: nowrap; }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .user-info span {
    color: #1e293b;
    font-weight: 500;
  }

  /* removed unused .table-row */


  .status-toggle {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .status-toggle.active {
    background: #dcfce7;
    color: #166534;
  }

  .status-toggle.active:hover {
    background: #bbf7d0;
  }

  .status-toggle.disabled {
    background: #fef2f2;
    color: #dc2626;
  }

  .status-toggle.disabled:hover {
    background: #fecaca;
  }


  .privilege-toggle {
    padding: 0.25rem 0.75rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: capitalize;
  }

  .privilege-toggle.admin {
    background: #fef3c7;
    color: #92400e;
  }

  .privilege-toggle.admin:hover {
    background: #fde68a;
  }

  .privilege-toggle.user {
    background: #e0e7ff;
    color: #3730a3;
  }

  .privilege-toggle.user:hover {
    background: #c7d2fe;
  }

  .date-text {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .action-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }


  .action-btn:hover {
    opacity: 0.8;
  }

  /* Mobile: enable horizontal scroll with single-line rows */
  @media (max-width: 768px) {
    .users-table { overflow-x: auto; }
    .users-table table { min-width: 720px; }
  }

  /* Reservation Cards - desktop horizontally scrollable showing ~4 cards */
  .reservations-grid {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    max-width: 100%;
  }

  .reservation-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    background: #fafbfc;
    transition: all 0.2s ease;
    flex: 0 0 calc(25% - 0.75rem);
    min-width: 240px; /* allow more cards on zoom */
    scroll-snap-align: start;
  }

  /* Responsive breakpoints for card width on desktop */
  @media (max-width: 1400px) {
    .reservation-card { flex-basis: calc(33.333% - 0.75rem); }
  }
  @media (max-width: 1100px) {
    .reservation-card { flex-basis: calc(50% - 0.75rem); }
  }

  .reservation-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  }

  /* Compact pending list defaults (hidden on desktop) */
  .pending-mobile { display: none; }
  .pending-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e5e7eb;
    gap: 0.75rem;
  }
  .pending-item:last-child { border-bottom: none; }
  .pi-left { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
  .pi-name { font-weight: 600; color: #0f172a; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pi-meta { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.8rem; }
  .pi-date { color: #64748b; }
  .view-btn { background: #3b82f6; color: white; border: none; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.85rem; }
  /* removed view all footer styles */

  .reservation-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .user-name {
    font-weight: 600;
    color: #1e293b;
    font-size: 0.875rem;
  }

  .reservation-type-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reservation-type-badge.pool {
    background: rgba(59, 130, 246, 0.1);
    color: #1d4ed8;
  }

  .reservation-type-badge.open-water {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .reservation-type-badge.classroom {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .reservation-date {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .reservation-card-body {
    margin-bottom: 1.5rem;
  }

  .reservation-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .reservation-description {
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.5;
    margin: 0 0 1rem 0;
  }

  .reservation-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .reservation-card-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .action-btn.approve {
    background: #10b981;
    color: white;
    border: 1px solid #10b981;
  }

  .action-btn.approve:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
  }

  .action-btn.reject {
    background: #ef4444;
    color: white;
    border: 1px solid #ef4444;
  }

  .action-btn.reject:hover:not(:disabled) {
    background: #dc2626;
    border-color: #dc2626;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty-reservations {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: #64748b;
    text-align: center;
  }

  .empty-reservations svg {
    color: #cbd5e1;
    margin-bottom: 1rem;
  }

  .empty-reservations p {
    margin: 0;
    font-size: 0.875rem;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1.5rem 0 1.5rem;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 1.5rem;
  }

  .modal-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  .modal-body {
    padding: 0 1.5rem;
  }

  .reservation-summary {
    background: #f8fafc;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .reservation-summary h4 {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.75rem 0;
  }

  .reservation-summary p {
    margin: 0.5rem 0;
    color: #64748b;
    font-size: 0.875rem;
  }

  /* removed unused .form-group styles */

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding: 1.5rem;
    border-top: 1px solid #e2e8f0;
    margin-top: 1.5rem;
  }

  .btn-secondary {
    padding: 0.75rem 1.5rem;
    border: 1px solid #d1d5db;
    background: white;
    color: #374151;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .btn-danger {
    padding: 0.75rem 1.5rem;
    border: 1px solid #ef4444;
    background: #ef4444;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-danger:hover:not(:disabled) {
    background: #dc2626;
    border-color: #dc2626;
  }

  .btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Primary button (Approve) - uniform green styling */
  .btn-primary {
    padding: 0.75rem 1.5rem;
    border: 1px solid #10b981;
    background: #10b981;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-primary:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .mobile-menu-toggle {
      display: flex;
    }

    .header-content {
      padding: 1rem;
    }
    
    .admin-content {
      padding: 1rem;
    }

    /* removed unused .stats-grid */

    .reservations-grid {
      grid-template-columns: 1fr;
    }

    .pending-mobile { 
      display: block; 
    }
    .pending-mobile.scrollable {
      max-height: 320px; /* ~5 rows */
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding-right: 2px; /* avoid scrollbar overlaying text */
    }
    .reservations-grid { 
      display: none; 
    }

    .modal-overlay {
      padding: 0.5rem;
    }

    /* Reservation Details modal mobile layout: 2 columns Reject/Approve, hide extra Close btn */
    .modal-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      justify-content: stretch;
    }
    .modal-actions button { width: 100%; }
    .modal-actions .details-close-btn { display: none; }
  }
</style>
