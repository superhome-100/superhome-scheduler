<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import dayjs from 'dayjs';
  import { getBuoyGroupsWithNames } from '../../utils/autoAssignBuoy';

  import SingleDayHeader from './SingleDayHeader.svelte';
  import CalendarTypeSwitcher from './CalendarTypeSwitcher.svelte';
  import PoolCalendar from './PoolCalendar.svelte';
  import OpenWaterAdminTables from './OpenWaterAdminTables.svelte';
  import OpenWaterUserLists from './OpenWaterUserLists.svelte';
  import ClassroomCalendar from './ClassroomCalendar.svelte';
  import { pullToRefresh } from '../../actions/pullToRefresh';
  import {
    loadAvailableBuoys as svcLoadAvailableBuoys,
    updateBoatAssignment as svcUpdateBoat,
    updateBuoyAssignment as svcUpdateBuoy,
    type Buoy,
    type TimePeriod
  } from '../../services/openWaterService';
  import { getGroupReservationDetails, type GroupReservationDetails } from '../../services/openWaterService';
  import GroupReservationDetailsModal from './GroupReservationDetailsModal.svelte';

  const dispatch = createEventDispatcher();

  export let selectedDate: string;
  export let reservations: any[] = [];
  export let isAdmin: boolean = false;
  export let initialType: 'pool' | 'openwater' | 'classroom' = 'pool';

  // Buoy group data
  type BuoyGroupLite = {
    id: number;
    res_date: string;
    time_period: TimePeriod;
    buoy_name: string | null;
    boat: string | null;
    res_openwater?: Array<{ uid: string }>;
    member_names?: (string | null)[] | null;
  };

  // Handle click on divers group box (admin view)
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
  let buoyGroups: BuoyGroupLite[] = [];
  let loadingBuoyGroups = false;
  // Boat editing is always inline via dropdown now (no edit mode)
  let availableBoats: string[] = ['Boat 1', 'Boat 2', 'Boat 3', 'Boat 4'];
  let availableBuoys: Buoy[] = [];
  // Modal state for group reservation details
  let showGroupModal = false;
  let groupDetails: GroupReservationDetails | null = null;

  // Calendar type state
  let selectedCalendarType: 'pool' | 'openwater' | 'classroom' = 'pool';
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
      if (typeParam && ['pool', 'openwater', 'classroom'].includes(typeParam)) {
        selectedCalendarType = typeParam as 'pool' | 'openwater' | 'classroom';
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


  // Update buoy assignment for a buoy group
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
    if (selectedCalendarType === 'pool') return reservation.res_type === 'pool';
    if (selectedCalendarType === 'openwater') return reservation.res_type === 'open_water';
    if (selectedCalendarType === 'classroom') return reservation.res_type === 'classroom';
    return false;
  });

  // Calendar type switching
  const switchCalendarType = (type: 'pool' | 'openwater' | 'classroom') => {
    selectedCalendarType = type;
    
    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('type', type);
    window.history.replaceState({}, '', url.toString());
    
    if (type === 'openwater' && isAdmin) {
      loadBuoyGroups();
      loadAvailableBuoys();
    }
  };

  // Load buoy groups for the selected date (with member names)
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
        member_names: g.member_names ?? []
      }));
    } catch (error) {
      console.error('Error loading buoy groups:', error);
      buoyGroups = [];
    } finally {
      loadingBuoyGroups = false;
    }
  };

  // Load available buoys for dropdowns (admin manual edit)
  const loadAvailableBuoys = async () => {
    try {
      availableBuoys = await svcLoadAvailableBuoys();
    } catch (error) {
      console.error('Error loading buoys:', error);
      availableBuoys = [];
    }
  };

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

  // Load buoy groups when date changes (admin only) - only for admin table functionality
  $: if (isAdmin && selectedDate && selectedCalendarType === 'openwater') {
    loadBuoyGroups();
    loadAvailableBuoys();
  }

  // Update boat assignment for a buoy group
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
  // Generate time slots for 24 hours
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
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
      <PoolCalendar {timeSlots} reservations={filteredReservations} />
    {:else if selectedCalendarType === 'openwater'}
      <!-- Open Water Calendar: Buoy/Boat tables and capacity grid -->
      <div class="flex flex-col gap-8 lg:gap-8" class:grid={!isAdmin} class:grid-cols-2={!isAdmin}>
        
        {#if isAdmin}
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
          <OpenWaterUserLists
            {filteredReservations}
            findAssignment={findAssignment}
            onShowReservationDetails={showReservationDetails}
          />
        {/if}
      </div>
    {:else if selectedCalendarType === 'classroom'}
      <ClassroomCalendar timeSlots={timeSlots} reservations={filteredReservations} />
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
