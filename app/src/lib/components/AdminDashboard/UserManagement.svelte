<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';

  const dispatch = createEventDispatcher();

  export let users: any[] = [];
  export let stats: any = {};

  const handleRefresh = () => {
    dispatch('refresh');
  };

  const toggleUserStatus = (uid: string, currentStatus: string) => {
    dispatch('toggleUserStatus', { uid, currentStatus });
  };

  const toggleUserPrivilege = (uid: string, currentPrivileges: string[]) => {
    dispatch('toggleUserPrivilege', { uid, currentPrivileges });
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
</script>

<div class="section">
  <div class="section-header">
    <h2>
      User Management
      <span class="total-users-pill"><span class="dot"></span>{stats.totalUsers} Total Users</span>
    </h2>
    <button class="refresh-btn" on:click={handleRefresh}>
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
                on:click={() => handleRefresh()}
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

<style>
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
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .total-users-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 9999px;
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
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
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.875rem;
  }

  thead {
    background: #f8fafc;
  }

  th {
    text-align: left;
    background: #f8fafc;
    color: #374151;
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }

  th.text-right {
    text-align: right;
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle;
    white-space: nowrap;
  }

  tr:last-child td {
    border-bottom: none;
  }

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

  .status-toggle {
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #64748b;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
    transition: all 0.2s ease;
  }

  .status-toggle.active {
    background: #10b981;
    color: white;
    border-color: #10b981;
  }

  .status-toggle.disabled {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
  }

  .status-toggle:hover:not(.active):not(.disabled) {
    background: #e2e8f0;
  }

  .privilege-toggle {
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #64748b;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .privilege-toggle.admin {
    background: #f59e0b;
    color: white;
    border-color: #f59e0b;
  }

  .privilege-toggle.user {
    background: #6b7280;
    color: white;
    border-color: #6b7280;
  }

  .privilege-toggle:hover:not(.admin):not(.user) {
    background: #e2e8f0;
  }

  .date-text {
    color: #64748b;
    font-size: 0.875rem;
  }

  .action-btn {
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #64748b;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .users-table { 
      overflow-x: auto; 
    }
    
    .users-table table { 
      min-width: 720px; 
    }
    
    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .section-header h2 {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>