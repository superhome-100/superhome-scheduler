<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { authStore, auth } from "../../stores/auth";
  import {
    showSignOutModal,
    sidebarActions,
    getUserInfo,
  } from "../../stores/sidebar";
  import { supabase } from "../../utils/supabase";
  import LoadingSpinner from "../LoadingSpinner.svelte";
  import ErrorModal from "../ErrorModal.svelte";
  import PullToRefresh from "../PullToRefresh.svelte";
  import Reservation from "../Reservation/Reservation.svelte";
  import AdminDashboard from "../AdminDashboard/AdminDashboard.svelte";
  import ReservationFormModal from "../ReservationFormModal/ReservationFormModal.svelte";
  import ReservationsListModal from "../ReservationsListModal/ReservationsListModal.svelte";
  import ReservationDetailsModal from "../ReservationDetailsModal/ReservationDetailsModal.svelte";
  // Dashboard sub-components
  import PageHeader from "../Layout/PageHeader.svelte";
  import DesktopReservations from "./DesktopReservations.svelte";
  import MobileReservations from "./MobileReservations.svelte";
  import FloatingActionButton from "./FloatingActionButton.svelte";
  import SignOutModal from "./SignOutModal.svelte";
  import ConfirmModal from "../ConfirmModal.svelte";

  // Dashboard utilities
  import {
    getUpcomingReservations,
    getCompletedReservations,
    transformReservationsForModal,
  } from "./dashboardUtils";
  import { isBeforeCutoff } from "../../utils/cutoffRules";
  import type { ReservationType as DbReservationType } from "../../services/reservationService";
  import { reservationLastUpdated } from "$lib/stores/reservationSync";
  import { transformReservationToUnified } from "../../utils/reservationTransform";
  import { normalizeCancelledPrices } from "$lib/services/maintenanceService";

  let showReservationDetails = false;
  let selectedReservation: any = null;
  // Use raw reservation rows from Supabase (with joined detail tables)
  // We avoid flattening here; components use unified transform when needed
  let reservations: any[] = [];
  let loading = false;
  let refreshing = false;
  let error: string | null = null;
  let monthlyTotals: Record<string, number> = {};

  // Modal state management
  let showReservationsModal = false;
  let modalReservations: any[] = [];
  let modalTitle = "Reservations";
  let modalVariant: "upcoming" | "completed" | "all" = "all";
  let showReservationForm = false;
  let reservationFormInitialType: "openwater" | "pool" | "classroom" = "pool";
  let editingReservation: any = null;
  // Modal state for disabled/account messages
  let statusModalOpen = false;
  let statusModalTitle = "Account Notice";
  let statusModalMessage = "";
  // Mobile tabs state
  let activeMobileTab: "upcoming" | "completed" = "upcoming";
  let showMobileViewAll = false;
  let upcomingListEl: HTMLDivElement | null = null;
  let completedListEl: HTMLDivElement | null = null;
  let isAdmin = false;
  let adminChecked = false;

  // Delete confirmation state
  let deleteModalOpen = false;
  let reservationToDelete: any = null;

  // Derived user info
  $: ({ userEmail, userName, userAvatarUrl, userInitial } =
    getUserInfo($authStore));

  // Get current view from URL path
  $: currentView = $page.url.pathname;

  // Recompute if mobile list overflows viewport to show "View All"
  const computeMobileOverflow = () => {
    const el = (
      activeMobileTab === "upcoming" ? upcomingListEl : completedListEl
    ) as HTMLDivElement | null;
    // If list element not ready, hide View All
    if (!el) {
      showMobileViewAll = false;
      return;
    }
    // Show when scrollable (list height exceeds container height)
    showMobileViewAll = (el.scrollHeight || 0) > (el.clientHeight || 0) + 2;
  };

  // Open confirmation modal
  const handleDeleteReservation = (event: CustomEvent) => {
    const reservation = event.detail || null;
    if (!reservation) return;
    reservationToDelete = reservation;
    deleteModalOpen = true;
  };

  // Confirm delete and invoke Edge Function
  const confirmDelete = async () => {
    try {
      const reservation = reservationToDelete;
      deleteModalOpen = false;
      if (!reservation) return;
      const uid = reservation.uid || $authStore.user?.id;
      const resDate = reservation.res_date || reservation.date;
      if (!uid || !resDate) {
        console.error('Missing uid or res_date on reservation for delete');
        return;
      }
      const { error } = await supabase.functions.invoke('reservations-delete', {
        body: { uid, res_date: resDate }
      });
      if (error) {
        console.error('Delete reservation failed:', error);
        return;
      }
      // Refresh data after deletion
      await loadReservations();
      await loadMonthlyTotals();
    } catch (e) {
      console.error('Delete reservation exception:', e);
    } finally {
      reservationToDelete = null;
    }
  };

  const cancelDelete = () => {
    deleteModalOpen = false;
    reservationToDelete = null;
  };

  // Load user's reservations from Supabase with detail tables
  const loadReservations = async () => {
    if (!$authStore.user) return;

    try {
      loading = true;
      error = null;

      // Load reservations with all detail tables joined
      const { data, error: fetchError } = await supabase
        .from("reservations")
        .select(
          `
          *,
          res_pool!left(start_time, end_time, lane, pool_type, student_count, note),
          res_openwater!left(time_period, depth_m, buoy, pulley, deep_fim_training, bottom_plate, large_buoy, open_water_type, student_count, note),
          res_classroom!left(start_time, end_time, room, classroom_type, student_count, note)
        `
        )
        .eq("uid", $authStore.user.id)
        .order("res_date", { ascending: true });

      if (fetchError) throw fetchError;

      // Store raw rows; downstream code uses unified transform when needed
      reservations = (data || []);
    } catch (err) {
      console.error("Error loading reservations:", err);
      error =
        err instanceof Error ? err.message : "Failed to load reservations";
    } finally {
      loading = false;
    }
  };

  // Normalize cancelled reservations that still have non-zero price
  const normalizeCancelledIfNeeded = async () => {
    try {
      if (!reservations || reservations.length === 0) return;
      const badIds = (reservations as any[])
        .filter(r => String(r?.res_status || '').toLowerCase() === 'cancelled' && Number(r?.price || 0) !== 0)
        .map(r => r.reservation_id)
        .filter((id) => typeof id === 'number');
      if (badIds.length === 0) return;
      const { success } = await normalizeCancelledPrices({ mode: 'by_ids', reservation_ids: badIds });
      if (success) {
        await loadReservations();
        await loadMonthlyTotals();
      }
    } catch (e) {
      console.warn('normalizeCancelledIfNeeded failed:', e);
    }
  };

  // Load monthly totals for completed reservations
  const loadMonthlyTotals = async () => {
    if (!$authStore.user) return;
    try {
      // Define a sensible window: last 12 months to next month
      const now = new Date();
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);

      const { data, error: rpcError } = await supabase.rpc(
        "compute_monthly_completed_totals",
        {
          p_from: from.toISOString().slice(0, 10),
          p_to: to.toISOString().slice(0, 10),
        }
      );
      if (rpcError) throw rpcError;
      const map: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (row && row.ym != null) map[row.ym] = Number(row.total) || 0;
      });
      monthlyTotals = map;
    } catch (e) {
      console.error("Error loading monthly totals:", e);
      // Do not fail UI; keep monthlyTotals empty so UI falls back to client sum
      monthlyTotals = {};
    }
  };

  // Event handlers
  const handleRefresh = async () => {
    try {
      refreshing = true;
      await loadReservations();
      await loadMonthlyTotals();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      refreshing = false;
    }
  };

  const handleNewReservation = async () => {
    try {
      if (!$authStore.user) return;
      const uid = $authStore.user.id;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("status")
        .eq("uid", uid)
        .single();
      if (error) {
        console.error("Failed to fetch user status:", error);
        // Fail closed: show modal and do not open form if we cannot verify
        statusModalTitle = "Account Status";
        statusModalMessage =
          "Unable to verify account status. Please try again later.";
        statusModalOpen = true;
        return;
      }
      if (data && String((data as any).status).toLowerCase() === "disabled") {
        statusModalTitle = "Account Disabled";
        statusModalMessage =
          "Your account is disabled at the moment. Please contact the admin for assistance.";
        statusModalOpen = true;
        return;
      }
      reservationFormInitialType = "pool";
      editingReservation = null;
      showReservationForm = true;
    } catch (e) {
      console.error("Status check error:", e);
      statusModalTitle = "Account Status";
      statusModalMessage =
        "Unable to verify account status. Please try again later.";
      statusModalOpen = true;
    }
  };

  const openUpcomingReservationsModal = () => {
    modalReservations = transformReservationsForModal(upcomingReservations);
    modalTitle = "Upcoming Reservations";
    modalVariant = "upcoming";
    showReservationsModal = true;
  };

  const openCompletedReservationsModal = () => {
    modalReservations = transformReservationsForModal(completedReservations);
    modalTitle = "Completed Reservations";
    modalVariant = "completed";
    showReservationsModal = true;
  };

  const closeReservationsModal = () => {
    showReservationsModal = false;
  };

  const handleReservationCreated = () => {
    showReservationForm = false;
    editingReservation = null;
    loadReservations();
  };

  const handleReservationClick = (event: CustomEvent) => {
    const reservation = event.detail;
    if (!reservation) {
      selectedReservation = null;
      return;
    }
    // Always show read-only reservation details on list click
    try {
      const transformed = transformReservationToUnified(reservation);
      selectedReservation = transformed;
    } catch (error) {
      console.error("Dashboard: Error transforming reservation:", error);
      selectedReservation = null;
    }
    showReservationDetails = true;
  };

  const closeReservationDetails = () => {
    showReservationDetails = false;
    selectedReservation = null;
  };

  const handleTabChange = (event: CustomEvent) => {
    activeMobileTab = event.detail;
  };

  const handleViewAll = () => {
    if (activeMobileTab === "upcoming") {
      modalReservations = transformReservationsForModal(upcomingReservations);
      modalTitle = "Upcoming Reservations";
      modalVariant = "upcoming";
    } else {
      modalReservations = transformReservationsForModal(completedReservations);
      modalTitle = "Completed Reservations";
      modalVariant = "completed";
    }
    showReservationsModal = true;
  };

  const handleSignOutConfirm = async () => {
    sidebarActions.closeSignOutModal();
    await auth.signOut();
  };

  let unsubReservationUpdate: (() => void) | null = null;
  onMount(() => {
    const initializeDashboard = async () => {
      // Ensure light mode only
      document.documentElement.classList.remove("dark-mode");

      // Determine admin role
      try {
        isAdmin = await auth.isAdmin();
      } finally {
        adminChecked = true;
      }

      // Load reservations
      try {
        await loadReservations();
        await normalizeCancelledIfNeeded();
        await loadMonthlyTotals();
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
      // compute initial overflow for mobile
      setTimeout(computeMobileOverflow, 0);
    };

    // Initialize dashboard asynchronously
    initializeDashboard();

    // Subscribe to admin-side manual price updates and refetch
    unsubReservationUpdate = reservationLastUpdated.subscribe(() => {
      // Refresh reservations and monthly totals so per-card price and totals update
      loadReservations();
      loadMonthlyTotals();
      normalizeCancelledIfNeeded();
    });
  });

  // Cleanup subscription
  $: if (false) {
  }
  // Above dummy reactive line prevents top-level onDestroy import; retain minimal changes per file constraints

  // Enforce access after admin check
  $: if (adminChecked) {
    const urlPath = $page.url.pathname;
    if (urlPath.includes("/admin") && !isAdmin) {
      goto("/");
    }
  }

  // Recompute on tab change and when reservations change
  $: activeMobileTab, computeMobileOverflow();
  $: reservations, computeMobileOverflow();
  window.addEventListener("resize", computeMobileOverflow);

  // Computed values for sub-components
  $: upcomingReservations = getUpcomingReservations(reservations);
  $: completedReservations = getCompletedReservations(reservations);
</script>

<div class="min-h-screen bg-base-200 dashboard-container">
  {#if $authStore.loading}
    <LoadingSpinner size="lg" text="Loading..." variant="overlay" zIndex={50} />
  {:else if $authStore.error}
    <div
      class="flex flex-col items-center justify-center min-h-screen text-center"
    >
      <h2 class="text-2xl font-bold text-error mb-4">Something went wrong</h2>
      <p class="text-base-content/70 mb-6">{$authStore.error}</p>
      <button class="btn btn-primary" on:click={() => window.location.reload()}
        >Try Again</button
      >
    </div>
  {:else if $authStore.user}
    {#if currentView === "/"}
      <!-- Sticky Header -->
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${userName}!`} />

      <!-- Pull-to-Refresh Body -->
      <PullToRefresh onRefresh={handleRefresh} {refreshing}>
        <div class="flex-1 p-6 w-full">
          <div class="flex flex-col gap-6">
            <!-- Desktop Reservations -->
            <DesktopReservations
              {upcomingReservations}
              {completedReservations}
              {monthlyTotals}
              {loading}
              {error}
              on:reservationClick={handleReservationClick}
              on:viewAllUpcoming={openUpcomingReservationsModal}
              on:viewAllCompleted={openCompletedReservationsModal}
              on:newReservation={handleNewReservation}
              on:retry={loadReservations}
              on:delete={handleDeleteReservation}
            />

            <!-- Mobile Reservations -->
            <MobileReservations
              {upcomingReservations}
              {completedReservations}
              {monthlyTotals}
              {activeMobileTab}
              {showMobileViewAll}
              {loading}
              {error}
              bind:upcomingListEl
              bind:completedListEl
              on:tabChange={handleTabChange}
              on:viewAll={handleViewAll}
              on:reservationClick={handleReservationClick}
              on:newReservation={handleNewReservation}
              on:computeOverflow={computeMobileOverflow}
              on:retry={loadReservations}
              on:delete={handleDeleteReservation}
            />
          </div>

          <!-- Floating Action Button -->
          <FloatingActionButton on:newReservation={handleNewReservation} />
        </div>
      </PullToRefresh>
    {:else if currentView === "/reservation"}
      <Reservation />
    {:else if currentView === "/admin" || currentView === "/admin/calendar" || currentView === "/admin/users"}
      <AdminDashboard />
    {/if}
  {/if}
</div>

<!-- Reservation Form Modal -->
<ReservationFormModal
  isOpen={showReservationForm}
  initialType={reservationFormInitialType}
  editing={!!editingReservation}
  initialReservation={editingReservation}
  on:submit={handleReservationCreated}
  on:close={() => {
    showReservationForm = false;
    editingReservation = null;
  }}
/>

<!-- Reservations List Modal -->
<ReservationsListModal
  isOpen={showReservationsModal}
  reservations={modalReservations}
  title={modalTitle}
  showDetails={true}
  variant={modalVariant}
  {monthlyTotals}
  on:close={closeReservationsModal}
  on:reservationClick={handleReservationClick}
  on:delete={handleDeleteReservation}
/>

<!-- Reservation Details Modal -->
<ReservationDetailsModal
  isOpen={showReservationDetails}
  reservation={selectedReservation}
  currentUserId={$authStore.user?.id}
  on:close={closeReservationDetails}
  on:edit={() => {
    try {
      const raw = (selectedReservation && (selectedReservation as any).raw_reservation) || null;
      if (!raw) {
        // If raw is missing, fall back to transforming back minimal fields
        console.warn('Dashboard: Missing raw_reservation on selectedReservation');
        return;
      }
      const resType = (raw.res_type || 'pool') as DbReservationType;
      reservationFormInitialType =
        resType === 'open_water' ? 'openwater' : resType === 'classroom' ? 'classroom' : 'pool';
      editingReservation = raw;
      showReservationForm = true;
    } catch (e) {
      console.error('Dashboard: failed to open edit form from details modal', e);
    } finally {
      showReservationDetails = false;
    }
  }}
  on:updated={async () => { await loadReservations(); await loadMonthlyTotals(); }}
/>

<!-- Sign Out Modal -->
<SignOutModal
  showModal={$showSignOutModal}
  on:confirm={handleSignOutConfirm}
  on:cancel={sidebarActions.closeSignOutModal}
/>

<!-- Centered Modal for Account Status -->
<ErrorModal
  bind:open={statusModalOpen}
  title={statusModalTitle}
  message={statusModalMessage}
  confirmText="Close"
  on:close={() => (statusModalOpen = false)}
/>

<!-- Delete Confirmation Modal -->
<ConfirmModal
  bind:open={deleteModalOpen}
  title="Delete Reservation"
  message="Are you sure you want to delete this pending reservation? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  on:confirm={confirmDelete}
  on:cancel={cancelDelete}
/>

<style>
  .dashboard-container {
    /* Sidebar positioning is handled by the main layout's drawer structure */
    margin-left: 0;
  }
</style>
