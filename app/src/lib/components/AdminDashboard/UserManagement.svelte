<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import dayjs from 'dayjs';
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

</script>

<div class="card bg-base-100 shadow-sm border border-base-300 rounded-xl p-6 mb-8">
  <div class="flex justify-between items-center mb-8 px-2">
    <h2 class="text-2xl font-semibold text-[#00294C] flex items-center gap-6">
      User Management
      <div class="badge badge-outline gap-2 px-4 py-2 text-sm">
        <div class="w-2 h-2 bg-success rounded-full"></div>
        {stats.totalUsers} Total Users
      </div>
    </h2>
    <button class="btn btn-ghost btn-sm gap-2 text-base-content/70 hover:text-base-content px-4 py-2" on:click={handleRefresh}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      </svg>
      Refresh
    </button>
  </div>
  
  <div class="table-container">
    <table class="table w-full">
      <thead>
        <tr>
          <th class="text-[#00294C] font-semibold border-b-2 border-base-300 text-left">Name</th>
          <th class="text-[#00294C] font-semibold border-b-2 border-base-300 text-center">Status</th>
          <th class="text-[#00294C] font-semibold border-b-2 border-base-300 text-center">Privileges</th>
          <th class="text-[#00294C] font-semibold text-center border-b-2 border-base-300">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each users as user}
          <tr class="hover:bg-base-200/50 border-b border-base-200 last:border-b-0">
            <td class="text-left">
              <div class="flex items-center gap-2 sm:gap-4">
                <div class="avatar placeholder">
                  <div class="bg-primary text-primary-content rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-xs sm:text-sm font-semibold">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                </div>
                <span class="text-[#00294C] font-medium text-xs sm:text-sm truncate">{user.name || 'Unknown'}</span>
              </div>
            </td>
            <td class="text-center">
              <button 
                class="btn btn-xs sm:btn-sm min-w-[60px] sm:min-w-[80px] {user.status === 'active' ? 'btn-success' : user.status === 'inactive' ? 'btn-error' : 'btn-outline'}"
                on:click={() => toggleUserStatus(user.uid, user.status)}
                title="Click to toggle status"
              >
                {user.status}
              </button>
            </td>
            <td class="text-center">
              <button 
                class="btn btn-xs sm:btn-sm min-w-[60px] sm:min-w-[80px] {user.privileges.includes('admin') ? 'btn-primary' : 'btn-secondary'}"
                on:click={() => toggleUserPrivilege(user.uid, user.privileges)}
                title="Click to toggle privilege"
              >
                {user.privileges.includes('admin') ? 'Admin' : 'User'}
              </button>
            </td>
            <td class="text-center">
              <!-- Actions column - no individual user actions needed -->
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  /* Table container with proper scrolling */
  .table-container {
    border: 1px solid hsl(var(--b3));
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    background: hsl(var(--b1));
    overflow-x: auto;
    overflow-y: visible;
    max-height: 70vh;
  }

  /* Enhanced table styling for better visibility */
  .table {
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    width: 100%;
  }
  
  /* Column width distribution - Name longer, others equal and compact */
  .table th:nth-child(1),
  .table td:nth-child(1) {
    width: 50%;
  }
  
  .table th:nth-child(2),
  .table td:nth-child(2) {
    width: 16.67%;
  }
  
  .table th:nth-child(3),
  .table td:nth-child(3) {
    width: 16.67%;
  }
  
  .table th:nth-child(4),
  .table td:nth-child(4) {
    width: 16.67%;
  }
  
  .table thead th {
    background: hsl(var(--b2));
    border-bottom: 2px solid hsl(var(--b3));
    color: #00294C !important;
    font-size: 0.75rem;
    letter-spacing: 0.025em;
    padding: 0.75rem 0.75rem !important;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .table tbody tr {
    transition: all 0.2s ease;
    background: transparent;
  }
  
  .table tbody tr:hover {
    background-color: hsl(var(--b2) / 0.3);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .table tbody tr:last-child td {
    border-bottom: none;
  }
  
  .table tbody td {
    vertical-align: middle;
    font-size: 0.75rem;
    padding: 0.75rem;
    border-bottom: 1px solid hsl(var(--b2));
  }
  
  /* Custom scrollbar for table container */
  .table-container::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .table-container::-webkit-scrollbar-track {
    background: hsl(var(--b2));
    border-radius: 4px;
  }
  
  .table-container::-webkit-scrollbar-thumb {
    background: hsl(var(--b3));
    border-radius: 4px;
  }
  
  .table-container::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--bc) / 0.3);
  }

  /* Desktop spacing improvements */
  @media (min-width: 769px) {
    .card {
      padding: 2rem;
    }
    
    .flex.justify-between.items-center {
      margin-bottom: 2rem;
      padding: 0 0.5rem;
    }
    
    .flex.items-center.gap-6 {
      gap: 2rem;
    }
    
    .badge {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }
    
    .table .btn {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }
  }

  /* Mobile responsive adjustments */
  @media (max-width: 768px) {
    .table-container {
      max-height: 60vh;
    }
    
    .table {
      min-width: 600px;
    }
    
    .flex.justify-between.items-center {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .flex.items-center.gap-6 {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    /* More compact mobile table */
    .table thead th {
      font-size: 0.625rem;
      padding: 0.5rem 0.5rem !important;
    }
    
    .table tbody td {
      font-size: 0.625rem;
      padding: 0.5rem;
    }
    
    /* Compact card padding on mobile */
    .card {
      padding: 1rem;
    }
    
    /* Smaller buttons on mobile */
    .table .btn-xs {
      padding: 0.25rem 0.5rem;
      font-size: 0.625rem;
      min-height: 1.5rem;
    }
  }
  
  /* Extra small mobile adjustments */
  @media (max-width: 480px) {
    .table-container {
      max-height: 50vh;
    }
    
    .table {
      min-width: 500px;
    }
    
    .table thead th {
      font-size: 0.5rem;
      padding: 0.375rem 0.375rem !important;
    }
    
    .table tbody td {
      font-size: 0.5rem;
      padding: 0.375rem;
    }
    
    .table .btn-xs {
      padding: 0.125rem 0.375rem;
      font-size: 0.5rem;
      min-height: 1.25rem;
    }
    
    .avatar .w-8 {
      width: 1.5rem;
      height: 1.5rem;
    }
  }

  /* Ensure button colors work properly with explicit colors */
  .table .btn-success {
    background-color: #10b981 !important;
    border-color: #10b981 !important;
    color: white !important;
  }
  
  .table .btn-error {
    background-color: #ef4444 !important;
    border-color: #ef4444 !important;
    color: white !important;
  }
  
  .table .btn-primary {
    background-color: #3b82f6 !important;
    border-color: #3b82f6 !important;
    color: white !important;
  }
  
  .table .btn-secondary {
    background-color: #6b7280 !important;
    border-color: #6b7280 !important;
    color: white !important;
  }
  
  .table .btn-outline {
    background-color: transparent !important;
    border-color: #6b7280 !important;
    color: #6b7280 !important;
  }
</style>