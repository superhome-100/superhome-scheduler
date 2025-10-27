<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import dayjs from 'dayjs';
  import { getBuoyGroupsWithNames } from '../../utils/autoAssignBuoy';
  import { authStore } from '../../stores/auth';

  import SingleDayHeader from './SingleDayHeader.svelte';
  import CalendarTypeSwitcher from './CalendarTypeSwitcher.svelte';
  import PoolCalendar from './admin/PoolCalendar/PoolCalendar.svelte';
  import OpenWaterAdminTables from './admin/OpenWaterCalendar/OpenWaterAdminTables.svelte';
  import OpenWaterUserLists from './admin/OpenWaterCalendar/OpenWaterUserLists.svelte';
  import ClassroomCalendar from './admin/ClassroomCalendar/ClassroomCalendar.svelte';
  import { pullToRefresh } from '../../actions/pullToRefresh';
  import {
    loadAvailableBuoys as svcLoadAvailableBuoys,
    updateBoatAssignment as svcUpdateBoat,
    updateBuoyAssignment as svcUpdateBuoy,
    type Buoy,
    type TimePeriod
  } from '../../services/openWaterService';
  import { getGroupReservationDetails, type GroupReservationDetails } from '../../services/openWaterService';
  import GroupReservationDetailsModal from './admin/OpenWaterCalendar/GroupReservationDetailsModal.svelte';
  import { ReservationType } from '../../types/reservations';

  const dispatch = createEventDispatcher();

  export let selectedDate: string;
  export let reservations: any[] = [];
  export let isAdmin: boolean = false;
  export let initialType: ReservationType = ReservationType.pool;

  // Buoy group data
  type BuoyGroupLite = {
    id: number;
    res_date: string;
    time_period: TimePeriod;
    buoy_name: string | null;
    boat: string | null;
    res_openwater?: Array<{ uid: string }>;
    member_names?: (string | null)[] | null;
    boat_count?: number | null;
    open_water_type?: string | null;
  };

  // ============================================ -->
  // 🔧 ADMIN-SPECIFIC: Group Management & Data -->
  // ============================================ -->
  
  // Handle click on divers group box (admin view only)
  async function handleGroupClick(e: CustomEvent<{ groupId: number; resDate: string; timePeriod: TimePeriod }>) {
    try {
      const details = await getGroupReservationDetails(e.detail.groupId);
      groupDetails = details;
      showGroupModal = !!details;
    } catch (err) {
      console.error('Failed to load group details:', err);
      showGroupModal = false;
    }
  }
  
  // Admin-specific data for buoy/boat management
  let buoyGroups: BuoyGroupLite[] = [];
  let loadingBuoyGroups = false;
  let availableBoats: string[] = ['Boat 1', 'Boat 2', 'Boat 3', 'Boat 4'];
  let availableBuoys: Buoy[] = [];
  
  // Admin-specific modal state for group reservation details
  let showGroupModal = false;
  let groupDetails: GroupReservationDetails | null = null;

  // Calendar type state
  let selectedCalendarType: ReservationType = ReservationType.pool;
  let initializedCalendarType = false;
  
  // Initialize from parent-provided intent first, then URL parameter
  onMount(() => {
    console.log('SingleDayView: onMount - initialType:', initialType);
    if (initialType) {
      // Prioritize the initialType from parent component
      selectedCalendarType = initialType;
      initializedCalendarType = true;
      console.log('SingleDayView: Set selectedCalendarType to initialType:', selectedCalendarType);
    } else {
      // Fallback to URL parameter if no initialType provided
      const urlParams = new URLSearchParams(window.location.search);
      const typeParam = urlParams.get('type');
      const validTypes = Object.values(ReservationType);
      if (typeParam && (validTypes as string[]).includes(typeParam)) {
        selectedCalendarType = typeParam as ReservationType;
        initializedCalendarType = true;
        console.log('SingleDayView: Set selectedCalendarType from URL:', selectedCalendarType);
      }
    }
  });

  // React to changes in initialType prop
  $: if (initialType && initializedCalendarType) {
    selectedCalendarType = initialType;
  }

  const handleBackToCalendar = () => {
    dispatch('backToCalendar');
  };

  // Current user (for user account single day view) - no longer needed for data loading

  // (Display helpers removed; use findAssignment for user rows)


  // ============================================ -->
  // 🔧 ADMIN-SPECIFIC: Buoy/Boat Assignment Functions -->
  // ============================================ -->
  
  // Update buoy assignment for a buoy group (admin only)
  const updateBuoyAssignment = async (groupId: number, buoyName: string) => {
    try {
      await svcUpdateBuoy(groupId, buoyName);
      // Update local state
      buoyGroups = buoyGroups.map((bg) =>
        bg.id === groupId ? { ...bg, buoy_name: buoyName } : bg
      );
    } catch (error) {
      console.error('Error updating buoy assignment:', error);
      alert('Error updating buoy assignment: ' + (error as Error).message);
    }
  };

  // Filter reservations for the selected date and type
  $: dayReservations = reservations.filter(reservation => {
    const reservationDate = dayjs(reservation.res_date).format('YYYY-MM-DD');
    return reservationDate === selectedDate;
  });

  $: filteredReservations = dayReservations.filter(reservation => {
    if (selectedCalendarType === ReservationType.pool) return reservation.res_type === 'pool';
    if (selectedCalendarType === ReservationType.openwater) return reservation.res_type === 'open_water';
    if (selectedCalendarType === ReservationType.classroom) {
      // Accept either explicit classroom type or flat classroom rows (room/start_time present)
      const isExplicit = reservation.res_type === 'classroom';
      const isFlatClassroom = !!(
        reservation.room ||
        reservation.classroom_type ||
        (reservation.res_classroom && (reservation.res_classroom.room || reservation.res_classroom.start_time))
      );
      return isExplicit || isFlatClassroom;
    }
    return false;
  });

  // Only show approved and plotted Pool reservations (confirmed with start/end and assigned lane)
  $: approvedPlottedPoolReservations = filteredReservations.filter(r => {
    if (selectedCalendarType !== ReservationType.pool) return false;
    if (r.res_type !== 'pool') return false;
    const approved = r.res_status === 'confirmed';
    // Support both admin (joined res_pool) and user (flattened fields) data shapes
    const start = r?.res_pool?.start_time ?? r?.start_time ?? null;
    const end = r?.res_pool?.end_time ?? r?.end_time ?? null;
    const lane = (r?.res_pool?.lane ?? r?.lane ?? null);
    const hasTimetable = !!start && !!end && lane !== null && lane !== undefined && String(lane) !== '';
    return approved && hasTimetable;
  });

  // Only show approved Classroom reservations with defined times (mirrors pool approval filter)
  $: approvedClassroomReservations = filteredReservations.filter(r => {
    if (selectedCalendarType !== ReservationType.classroom) return false;
    // Accept explicit classroom or flat classroom rows; type filtering already handled above
    const approved = r.res_status === 'confirmed';
    const start = r?.res_classroom?.start_time ?? r?.start_time ?? null;
    const end = r?.res_classroom?.end_time ?? r?.end_time ?? null;
    return approved && !!start && !!end;
  });

  // Calendar type switching
  const switchCalendarType = (type: ReservationType) => {
    selectedCalendarType = type;
    
    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('type', type);
    window.history.replaceState({}, '', url.toString());
    
    if (type === ReservationType.openwater && isAdmin) {
      loadBuoyGroups();
      loadAvailableBuoys();
    }
  };

  // ============================================ -->
  // 🔧 ADMIN-SPECIFIC: Data Loading Functions -->
  // ============================================ -->
  
  // Load buoy groups for the selected date (admin only)
  const loadBuoyGroups = async () => {
    if (!selectedDate) return;
    
    try {
      loadingBuoyGroups = true;
      const [am, pm] = await Promise.all([
        getBuoyGroupsWithNames({ resDate: selectedDate, timePeriod: 'AM' }),
        getBuoyGroupsWithNames({ resDate: selectedDate, timePeriod: 'PM' })
      ]);
      // Merge to one array and coerce time_period to typed TimePeriod
      buoyGroups = [...am, ...pm].map((g: any) => ({
        id: g.id,
        res_date: g.res_date,
        time_period: (g.time_period === 'AM' ? 'AM' : 'PM') as TimePeriod,
        buoy_name: g.buoy_name ?? null,
        boat: g.boat ?? null,
        res_openwater: g.res_openwater,
        member_names: g.member_names ?? [],
        boat_count: typeof g.boat_count === 'number' ? g.boat_count : null,
        open_water_type: g.open_water_type ?? null,
      }));
    } catch (error) {
      console.error('Error loading buoy groups:', error);
      buoyGroups = [];
    } finally {
      loadingBuoyGroups = false;
    }
  };

  // Load available buoys for dropdowns (admin only)
  const loadAvailableBuoys = async () => {
    try {
      availableBuoys = await svcLoadAvailableBuoys();
    } catch (error) {
      console.error('Error loading buoys:', error);
      availableBuoys = [];
    }
  };

  // ============================================ -->
  // 👤 USER-SPECIFIC: Helper Functions -->
  // ============================================ -->
  
  // Helpers for user-facing reservations table
  function findAssignment(uid: string, period: TimePeriod) {
    // Use assignment data directly from the reservation object
    // This ensures consistency with the main data source
    const reservation = filteredReservations.find(r => r.uid === uid);
    if (!reservation) {
      return { buoy: 'Not assigned', boat: 'Not assigned' };
    }
    
    // Use assignment data from the reservation itself
    return { 
      buoy: reservation.buoy || 'Not assigned', 
      boat: reservation.boat || 'Not assigned' 
    };
  }

  // Assignment data is now included in the main reservations data
  // No need for separate loading functions

  function showReservationDetails(res: any) {
    // Dispatch reservationClick event to parent component to show modal
    dispatch('reservationClick', res);
  }

  // ============================================ -->
  // 🔧 ADMIN-SPECIFIC: Reactive Data Loading -->
  // ============================================ -->
  
  // Load buoy groups when date changes (admin only) - only for admin table functionality
  $: if (isAdmin && selectedDate && selectedCalendarType === 'openwater') {
    loadBuoyGroups();
    loadAvailableBuoys();
  }

  // Update boat assignment for a buoy group (admin only)
  const updateBoatAssignment = async (groupId: number, boatName: string) => {
    try {
      await svcUpdateBoat(groupId, boatName);
      // Update local state
      buoyGroups = buoyGroups.map(bg => 
        bg.id === groupId ? { ...bg, boat: boatName } : bg
      );
    } catch (error) {
      console.error('Error updating boat assignment:', error);
      alert('Error updating boat assignment: ' + (error as Error).message);
    }
  };
  // Generate time slots for 8:00 to 20:00 (13 hours)
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = (i + 8).toString().padStart(2, '0');
    return `${hour}:00`;
  });

  // Pull to refresh handler
  async function refreshCurrentView() {
    if (selectedCalendarType === 'openwater') {
      if (isAdmin) {
        await Promise.all([loadBuoyGroups(), loadAvailableBuoys()]);
      }
      // For non-admin users, data is refreshed through the parent component
      // No separate data loading needed
    }
  }

  // Normalize available buoys for admin table (ensure max_depth is number)
  $: adminAvailableBuoys = (availableBuoys || []).map(b => ({
    buoy_name: b.buoy_name,
    max_depth: (b.max_depth ?? 0) as number
  }));

</script>

<div class="min-h-screen bg-base-200" use:pullToRefresh={{ onRefresh: refreshCurrentView }}>
  <!-- Header -->
  <SingleDayHeader selectedDate={selectedDate} on:back={handleBackToCalendar} on:changeDate={(e) => (selectedDate = e.detail)} />

  <!-- Calendar Type Buttons -->
  <CalendarTypeSwitcher
    value={selectedCalendarType}
    on:change={(e) => switchCalendarType(e.detail)}
  />

  <!-- Calendar Content -->
  <div class="px-6 sm:px-4 md:px-8 lg:px-12 min-h-[60vh] max-w-screen-xl mx-auto" class:max-w-none={selectedCalendarType === 'openwater'}>
    {#if selectedCalendarType === 'pool'}
      <!-- POOL CALENDAR: Only approved and plotted reservations -->
      <PoolCalendar {timeSlots} reservations={approvedPlottedPoolReservations} currentUserId={$authStore.user?.id} {isAdmin} />
    {:else if selectedCalendarType === 'openwater'}
      <!-- OPEN WATER CALENDAR: Different views for Admin vs User -->
      <div class="flex flex-col gap-8 lg:gap-8" class:grid={!isAdmin} class:grid-cols-2={!isAdmin}>
        
        {#if isAdmin}
          <!-- ============================================ -->
          <!-- 🔧 ADMIN VIEW: Open Water Admin Tables -->
          <!-- ============================================ -->
          <!-- Features: Editable buoy/boat assignments, admin controls, group management -->
          <OpenWaterAdminTables
            {availableBoats}
            availableBuoys={adminAvailableBuoys}
            buoyGroups={buoyGroups}
            loading={loadingBuoyGroups}
            onUpdateBuoy={updateBuoyAssignment}
            onUpdateBoat={updateBoatAssignment}
            on:groupClick={handleGroupClick}
          />
          {:else}
          <!-- ============================================ -->
          <!-- 👤 USER VIEW: Open Water User Lists -->
          <!-- ============================================ -->
          <!-- Features: Read-only lists, user-friendly display, click to view details -->
          <OpenWaterUserLists
            {filteredReservations}
            findAssignment={findAssignment}
            onShowReservationDetails={showReservationDetails}
          />
        {/if}
      </div>
    {:else if selectedCalendarType === 'classroom'}
      <!-- CLASSROOM CALENDAR: Only approved classroom reservations -->
      <ClassroomCalendar timeSlots={timeSlots} reservations={approvedClassroomReservations} currentUserId={$authStore.user?.id} {isAdmin} />
                    {/if}
  </div>
  {#if showGroupModal && groupDetails}
    <GroupReservationDetailsModal
      open={showGroupModal}
      resDate={groupDetails.res_date}
      timePeriod={groupDetails.time_period}
      boat={groupDetails.boat}
      buoyName={groupDetails.buoy_name}
      members={groupDetails.members}
      on:close={() => (showGroupModal = false)}
    />
  {/if}
</div>
