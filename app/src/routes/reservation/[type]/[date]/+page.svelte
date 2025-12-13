<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import dayjs from 'dayjs';
  import { authStore, auth } from '$lib/stores/auth';
  import { supabase } from '$lib/utils/supabase';
  import SingleDayView from '$lib/components/Calendar/SingleDayView.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import ReservationDetailsModal from '$lib/components/ReservationDetailsModal/ReservationDetailsModal.svelte';
  import ReservationFormModal from '$lib/components/ReservationFormModal/ReservationFormModal.svelte';
  import { ReservationType } from '$lib/types/reservations';
  import type { CompleteReservation } from '$lib/services/reservationService';
  import type {
    BaseReservationView,
    PoolReservationView,
    OpenWaterReservationView,
    ClassroomReservationView,
    FlattenedReservation,
  } from '$lib/types/reservationViews';

  let loading = true;
  let error: string | null = null;

  let reservations: FlattenedReservation[] = [];
  let isAdmin = false;
  let lastLoadedKey = '';
  // Reference to child SingleDayView instance
  let singleDayRef: any = null;

  // Modal state for reservation details and edit form
  let showReservationDetails = false;
  let selectedReservation: FlattenedReservation | null = null;
  let showReservationForm = false;
  let reservationFormInitialType: 'openwater' | 'pool' | 'classroom' = 'pool';
  let editingReservation: any = null;

  $: type = $page.params.type as ReservationType;
  $: date = $page.params.date;

  const handleNewReservation = async () => {
    editingReservation = null;
    const rt = type as ReservationType;
    reservationFormInitialType =
      rt === ReservationType.openwater
        ? 'openwater'
        : rt === ReservationType.classroom
        ? 'classroom'
        : 'pool';
    await tick();
    showReservationForm = true;
  };

  const handleBackToCalendar = () => {
    goto(`/reservation/${type}`);
  };

  const handleReservationClick = (event: CustomEvent) => {
    const reservation = event.detail as FlattenedReservation | null;
    if (!reservation) {
      selectedReservation = null;
      showReservationDetails = false;
      return;
    }
    selectedReservation = reservation;
    showReservationDetails = true;
  };

  const handleRefreshReservations = async () => {
    await loadReservations();
  };

  // Build a raw-like reservation object from a flattened view for prefill
  function buildRawFromFlattened(res: FlattenedReservation): any {
    const base: any = {
      uid: (res as any).uid,
      res_date: (res as any).res_date,
      res_type: (res as any).res_type,
      res_status: (res as any).res_status,
    };
    if ((res as any).res_type === 'pool') {
      base.res_pool = {
        start_time: (res as any).start_time ?? (res as any)?.res_pool?.start_time ?? null,
        end_time: (res as any).end_time ?? (res as any)?.res_pool?.end_time ?? null,
        pool_type: (res as any).pool_type ?? (res as any)?.res_pool?.pool_type ?? null,
        student_count: (res as any).student_count ?? (res as any)?.res_pool?.student_count ?? null,
        note: (res as any).note ?? (res as any)?.res_pool?.note ?? null,
      };
    } else if ((res as any).res_type === 'classroom') {
      base.res_classroom = {
        start_time: (res as any).start_time ?? (res as any)?.res_classroom?.start_time ?? null,
        end_time: (res as any).end_time ?? (res as any)?.res_classroom?.end_time ?? null,
        classroom_type: (res as any).classroom_type ?? (res as any)?.res_classroom?.classroom_type ?? null,
        student_count: (res as any).student_count ?? (res as any)?.res_classroom?.student_count ?? null,
        note: (res as any).note ?? (res as any)?.res_classroom?.note ?? null,
      };
    } else if ((res as any).res_type === 'open_water') {
      base.res_openwater = {
        time_period: (res as any).time_period ?? (res as any)?.res_openwater?.time_period ?? null,
        depth_m: (res as any).depth_m ?? (res as any)?.res_openwater?.depth_m ?? null,
        open_water_type: (res as any).open_water_type ?? (res as any)?.res_openwater?.open_water_type ?? null,
        student_count: (res as any).student_count ?? (res as any)?.res_openwater?.student_count ?? null,
        pulley: (res as any).pulley ?? (res as any)?.res_openwater?.pulley ?? null,
        deep_fim_training: (res as any).deep_fim_training ?? (res as any)?.res_openwater?.deep_fim_training ?? null,
        bottom_plate: (res as any).bottom_plate ?? (res as any)?.res_openwater?.bottom_plate ?? null,
        large_buoy: (res as any).large_buoy ?? (res as any)?.res_openwater?.large_buoy ?? null,
        note: (res as any).note ?? (res as any)?.res_openwater?.note ?? null,
        group_id: (res as any).group_id ?? (res as any)?.res_openwater?.group_id ?? null,
      };
    }
    return base;
  }

  const loadReservations = async () => {
    if (!$authStore.user) return;

    try {
      loading = true;
      
      // Load only reservations for the selected date and type
      // IMPORTANT: Use UTC date-only bounds to avoid timezone skew hiding items
      const dateOnly = dayjs(date).format('YYYY-MM-DD');
      const from = `${dateOnly} 00:00:00+00`;
      const to = `${dateOnly} 23:59:59+00`;

      // Always include all nested detail tables so SingleDayView can switch types without refetching
      const selectColumns = `*,
          user_profiles!reservations_uid_fkey (nickname, name),
          res_pool!left(start_time, end_time, lane, pool_type, student_count, note),
          res_openwater!left(
            time_period, 
            depth_m, 
            buoy, 
            pulley, 
            deep_fim_training, 
            bottom_plate, 
            large_buoy, 
            open_water_type, 
            student_count, 
            note,
            group_id
          ),
          res_classroom!left(start_time, end_time, room, classroom_type, student_count, note)`;

      let query = supabase
        .from('reservations')
        .select(selectColumns)
        .gte('res_date', from)
        .lte('res_date', to);

      // Do NOT filter by res_type here; we need all reservations for the date so
      // SingleDayView can toggle between Pool/Open Water/Classroom without missing data.
      // RLS still applies server-side to enforce visibility rules.

      const { data, error: fetchError } = await query.order('res_date', {
        ascending: true,
      });

      if (fetchError) throw fetchError;

      reservations = (data || []).map((reservation): FlattenedReservation => {
        const base = reservation as CompleteReservation;
        const userProfile = (reservation as any).user_profiles as
          | { nickname?: string | null; name?: string | null }
          | undefined;

        const nickname =
          userProfile?.nickname && userProfile.nickname.trim() !== ""
            ? userProfile.nickname.trim()
            : "";
        const fullName =
          userProfile?.name && userProfile.name.trim() !== ""
            ? userProfile.name.trim()
            : "";

        const common: BaseReservationView = {
          reservation_id: (base as any).reservation_id,
          uid: base.uid,
          res_date: base.res_date,
          res_type: base.res_type,
          res_status: base.res_status,
          title: (base as any).title ?? null,
          description: (base as any).description ?? null,
          user_profiles: {
            nickname: nickname || null,
            name: fullName || null,
          },
        };

        if (base.res_type === 'pool' && base.res_pool) {
          const view: PoolReservationView = {
            ...common,
            res_type: 'pool',
            start_time: base.res_pool.start_time,
            end_time: base.res_pool.end_time,
            lane: base.res_pool.lane ?? null,
            pool_type: base.res_pool.pool_type ?? null,
            student_count: base.res_pool.student_count ?? null,
            note: base.res_pool.note ?? null,
          };
          return view;
        }

        if (base.res_type === 'open_water' && base.res_openwater) {
          const view: OpenWaterReservationView = {
            ...common,
            res_type: 'open_water',
            group_id: base.res_openwater.group_id ?? null,
            time_period: base.res_openwater.time_period,
            depth_m: base.res_openwater.depth_m ?? null,
            buoy: base.res_openwater.buoy ?? null,
            pulley: base.res_openwater.pulley ?? null,
            deep_fim_training: base.res_openwater.deep_fim_training ?? null,
            bottom_plate: base.res_openwater.bottom_plate ?? null,
            large_buoy: base.res_openwater.large_buoy ?? null,
            open_water_type: base.res_openwater.open_water_type ?? null,
            student_count: base.res_openwater.student_count ?? null,
            note: base.res_openwater.note ?? null,
          };
          return view;
        }

        if (base.res_type === 'classroom' && base.res_classroom) {
          const view: ClassroomReservationView = {
            ...common,
            res_type: 'classroom',
            start_time: base.res_classroom.start_time,
            end_time: base.res_classroom.end_time,
            room: base.res_classroom.room ?? null,
            classroom_type: base.res_classroom.classroom_type ?? null,
            student_count: base.res_classroom.student_count ?? null,
            note: base.res_classroom.note ?? null,
          };
          return view;
        }

        // Fallback: return base fields only if detail tables are missing
        return common as BaseReservationView;
      });

    } catch (err) {
      console.error('Error loading reservations:', err);
      error = err instanceof Error ? err.message : 'Failed to load reservations';
    } finally {
      loading = false;
    }
  };

  onMount(async () => {
    isAdmin = await auth.isAdmin();
    await loadReservations();
  });

  // Reactively reload when route params change (date or type)
  $: if ($authStore.user) {
    const key = `${date}|${type}`;
    if (key && key !== lastLoadedKey) {
      lastLoadedKey = key;
      // Fire-and-forget; loading state is handled inside
      loadReservations();
    }
  }
</script>

{#if loading}
  <LoadingSpinner size="lg" text="Loading..." variant="overlay" />
{:else if error}
  <div class="alert alert-error m-4">
    <span>{error}</span>
  </div>
{:else}
  <SingleDayView
    selectedDate={date}
    {reservations}
    {isAdmin}
    initialType={type}
    bind:this={singleDayRef}
    on:backToCalendar={handleBackToCalendar}
    on:reservationClick={handleReservationClick}
    on:refreshReservations={handleRefreshReservations}
    on:editReservation={async (e) => {
      try {
        const reservation = e.detail as FlattenedReservation | null;
        if (!reservation) return;
        const raw = buildRawFromFlattened(reservation);
        const rt = String(raw.res_type || 'pool');
        reservationFormInitialType =
          rt === 'open_water' ? 'openwater' : rt === 'classroom' ? 'classroom' : 'pool';
        editingReservation = raw;
        showReservationDetails = false;
        await tick();
        showReservationForm = true;
      } catch (err) {
        console.error('[Reservation Page] editReservation handler failed:', err);
      }
    }}
  />

  <button
    class="fab-btn s--N6BxoB9_jwI"
    type="button"
    aria-label="Add new reservation"
    title="Add new reservation"
    on:click={handleNewReservation}
  >
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      aria-hidden="true"
      class="s--N6BxoB9_jwI"
    >
      <path
        d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
        class="s--N6BxoB9_jwI"
      ></path>
    </svg>
    <span class="fab-text s--N6BxoB9_jwI">New Reservation</span>
  </button>
{/if}

<!-- Reservation Details Modal (owner-only actions) -->
<ReservationDetailsModal
  isOpen={showReservationDetails}
  reservation={selectedReservation}
  {isAdmin}
  currentUserId={$authStore.user?.id}
  onEdit={async () => {
    try {
      console.log('[Reservation Page] onEdit prop invoked');
      if (!selectedReservation) return;
      const raw = buildRawFromFlattened(selectedReservation);
      const rt = String((raw.res_type || 'pool'));
      reservationFormInitialType = rt === 'open_water' ? 'openwater' : (rt === 'classroom' ? 'classroom' : 'pool');
      editingReservation = raw;
      showReservationDetails = false;
      await tick();
      showReservationForm = true;
    } catch (e) {
      console.error('[Reservation Page] onEdit prop failed:', e);
    }
  }}
  on:close={() => { showReservationDetails = false; selectedReservation = null; }}
  on:edit={async () => {
    try {
      console.log('[Reservation Page] Edit event received');
      // Open update form with prefilled values
      if (!selectedReservation) {
        console.warn('[Reservation Page] No selectedReservation on edit');
        return;
      }
      const raw = buildRawFromFlattened(selectedReservation);
      const rt = String((raw.res_type || 'pool'));
      reservationFormInitialType = rt === 'open_water' ? 'openwater' : (rt === 'classroom' ? 'classroom' : 'pool');
      editingReservation = raw;
      // Close details first, then open form next tick to prevent overlay stacking
      showReservationDetails = false;
      await tick();
      showReservationForm = true;
    } catch (e) {
      console.error('[Reservation Page] Failed to open edit form:', e);
    }
  }}
  on:updated={async () => {
    await loadReservations();
    // Also refresh open water assignments so buddy lists update immediately
    try {
      if (singleDayRef && typeof singleDayRef.refreshAssignments === 'function') {
        await singleDayRef.refreshAssignments();
      }
    } catch (e) {
      console.warn('Failed to refresh assignments after cancel:', e);
    }
  }}
/>

<!-- Update Reservation Modal (prefilled when editing) -->
<ReservationFormModal
  isOpen={showReservationForm}
  initialType={reservationFormInitialType}
  initialDate={date}
  editing={!!editingReservation}
  initialReservation={editingReservation}
  on:submit={async () => { showReservationForm = false; editingReservation = null; await loadReservations(); }}
  on:close={() => { showReservationForm = false; editingReservation = null; }}
/>
