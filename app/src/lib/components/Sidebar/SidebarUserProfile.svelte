<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let userName: string = 'User';
  export let userEmail: string = 'user@example.com';
  export let userAvatarUrl: string | null = null;
  export let userInitial: string = 'U';

  const dispatch = createEventDispatcher();

  const handleSignOut = () => {
    dispatch('signOut');
  };
</script>

<div class="user-section">
  <div class="user-profile">
    {#if userAvatarUrl}
      <img src={userAvatarUrl} alt="Profile" class="user-avatar" />
    {:else}
      <div class="user-avatar-placeholder">{userInitial}</div>
    {/if}
    <div class="user-info">
      <span class="user-name">{userName}</span>
      <span class="user-email">{userEmail}</span>
    </div>
  </div>
  <button class="logout-btn" on:click={handleSignOut} title="Logout" aria-label="Sign out">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
  </button>
</div>

<style>
  /* User Section */
  .user-section {
    margin-top: auto;
    background: #ffffff;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-top: 1px solid #e2e8f0;
  }

  .user-profile {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #e2e8f0;
  }

  .user-avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    border: 2px solid #e2e8f0;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
    gap: 0.125rem;
    align-items: flex-start;
  }

  .user-name {
    color: #1e293b;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.2;
    margin: 0;
    padding: 0;
    text-align: left;
    width: 100%;
  }

  .user-email {
    font-size: 0.75rem;
    color: #64748b;
    line-height: 1.2;
    margin: 0;
    padding: 0;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
    width: 100%;
  }

  .logout-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #dc2626;
    border: none;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .logout-btn:hover {
    background: #b91c1c;
    transform: scale(1.05);
  }

  .logout-btn:active {
    transform: scale(0.95);
  }

  .logout-btn:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.3);
  }
</style>
