import { writable } from 'svelte/store';

// Sidebar state
export const showSignOutModal = writable(false);
export const mobileDrawerOpen = writable(false);

// Sidebar actions
export const sidebarActions = {
  openSignOutModal: () => {
    showSignOutModal.set(true);
  },

  closeSignOutModal: () => {
    showSignOutModal.set(false);
  },

  toggleMobileDrawer: () => {
    mobileDrawerOpen.update(open => !open);
  },

  closeMobileDrawer: () => {
    mobileDrawerOpen.set(false);
  }
};

// User info utilities for sidebar
export const getUserInfo = (authStore: any) => {
  const user = authStore?.user;
  const userEmail = user?.email || 'user@example.com';
  const userName = (user?.user_metadata?.full_name || user?.user_metadata?.name || userEmail.split('@')[0] || 'User');
  const userAvatarUrl = (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ?? null;
  const userInitial = (userName?.charAt(0) || userEmail?.charAt(0) || 'U').toUpperCase();

  return {
    userEmail,
    userName,
    userAvatarUrl,
    userInitial
  };
};
