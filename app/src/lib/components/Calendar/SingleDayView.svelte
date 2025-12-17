<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import dayjs from "dayjs";
  import { supabase } from "../../utils/supabase";
  import { authStore } from "../../stores/auth";

  import SingleDayHeader from "./SingleDayHeader.svelte";
  import PoolCalendar from "./admin/PoolCalendar/PoolCalendar.svelte";
  import OpenWaterAdminTables from "./admin/OpenWaterCalendar/OpenWaterAdminTables.svelte";
  import ClassroomCalendar from "./admin/ClassroomCalendar/ClassroomCalendar.svelte";
  import FloatingActionButton from "../Reservation/FloatingActionButton.svelte";
  import { pullToRefresh } from "../../actions/pullToRefresh";
  import {
    loadAvailableBuoys as svcLoadAvailableBuoys,
    updateBoatAssignment as svcUpdateBoat,
    updateBuoyAssignment as svcUpdateBuoy,
    getBuoyGroupsWithNames as svcGetBuoyGroupsWithNames,
    type Buoy,
    type TimePeriod,
  } from "../../services/openWaterService";
  import { reservationApi } from "../../api/reservationApi";
  import { ReservationType } from "../../types/reservations";
  import type {
    FlattenedReservation,
    OpenWaterReservationView,
  } from "../../types/reservationViews";

  const dispatch = createEventDispatcher();

  export let selectedDate: string;
  export let reservations: FlattenedReservation[] = [];
  export let isAdmin: boolean = false;
  export let initialType: ReservationType = ReservationType.openwater;

  // Buoy group data
  type BuoyGroupLite = {
    id: number;
    res_date: string;
    time_period: TimePeriod;
    buoy_name: string | null;
    boat: string | null;
    // Prefer normalized arrays of member UIDs from RPC
    member_uids?: string[] | null;
    // Optional parallel array of member display names from RPC (public)
    member_names?: (string | null)[] | null;
    // Back-compat: some callers may still expect res_openwater with uid objects
    res_openwater?: Array<{ uid: string }>;
    boat_count?: number | null;
    open_water_type?: string | null;
    // Optional per-reservation statuses parallel to member_names/member_uids
    member_statuses?: (string | null)[] | null;
  };

  type BuoyGroupWithReservations = BuoyGroupLite & {
    reservations: OpenWaterReservationView[];
  };

  // Combined loader with cancellation to avoid overlapping updates
  async function loadOpenWaterAssignments() {
    if (!selectedDate) return;
    const seq = ++assignmentsLoadSeq;
    assignmentsLoading = true;
    try {
      await Promise.all([loadBuoyGroups(), loadAssignmentMap()]);
      // Only apply results if this is the latest request
      if (seq === assignmentsLoadSeq) {
        assignmentVersion++;
      }
    } finally {
      // Only clear loading if this is the latest request
      if (seq === assignmentsLoadSeq) {
        assignmentsLoading = false;
      }
    }
  }

  // Expose a method for parent to trigger a refresh of open water assignments
  export function refreshAssignments() {
    return loadOpenWaterAssignments();
  }

  // ============================================ -->
  // 🔧 ADMIN-SPECIFIC: Group Management & Data -->
  // ============================================ -->

  // Admin-specific data for buoy/boat management
  let buoyGroups: BuoyGroupLite[] = [];
  let loadingBuoyGroups = false;
  let availableBoats: string[] = ["Boat 1", "Boat 2", "Boat 3", "Boat 4"];
  let availableBuoys: Buoy[] = [];
  // Fast lookup: uid -> period -> { buoy_name, boat }
  let assignmentMap: Record<
    string,
    Partial<
      Record<TimePeriod, { buoy_name: string | null; boat: string | null }>
    >
  > = {};
  // Version counter to trigger child re-render of assignment-dependent UI
  let assignmentVersion = 0;
  // Coordinated loading state for Open Water assignments
  let assignmentsLoading = false;
  // Cancellation token for overlapping assignment loads
  let assignmentsLoadSeq = 0;
  // Map of uid -> display name for open water reservations (admin + non-admin)
  let openWaterDisplayNamesByUid: Map<string, string | null> = new Map();

  // Admin-only dialog state for updating reservation status from calendar
  let statusDialogOpen = false;
  let statusDialogReservation: FlattenedReservation | null = null;
  let statusDialogSubmitting = false;
  let statusDialogError: string | null = null;
  let statusDialogDisplayName: string | null = null;

  // Admin-only day list modal state
  let dayListOpen = false;
  let dayListTab: 'pending' | 'approved' | 'denied' = 'pending';

  // Enriched buoy groups including nested open water reservations
  // Admins rely on full reservation join; non-admins fall back to buoy group member arrays
  $: buoyGroupsWithReservations = (buoyGroups || []).map((bg) => {
    const joinedReservations = (openWaterReservations || []).filter(
      (r) => r.group_id !== null && r.group_id === bg.id
    );

    // For admins (and when we have joined reservations), use the full reservation rows as-is.
    if (isAdmin) {
      return {
        ...bg,
        reservations: joinedReservations,
      } as BuoyGroupWithReservations;
    }

    // For non-admins: if joined reservations are available, enrich each with a display nickname
    // resolved from group.member_names or the prebuilt openWaterDisplayNamesByUid map. This avoids
    // relying on user_profiles join which may be blocked by RLS for other users.
    if (joinedReservations.length > 0) {
      const uids: string[] = Array.isArray(bg.member_uids) ? bg.member_uids : [];
      const names: (string | null)[] = Array.isArray(bg.member_names) ? bg.member_names : [];
      const byUidName = new Map<string, string>();
      // Prefer map from user_profiles
      for (const u of uids) {
        const nFromMap = (openWaterDisplayNamesByUid.get(u) ?? '').toString().trim();
        if (u && nFromMap) byUidName.set(u, nFromMap);
      }
      // Fill gaps from RPC member_names if needed (best-effort index pairing)
      for (let i = 0; i < Math.min(uids.length, names.length); i++) {
        const u = uids[i];
        if (byUidName.has(u)) continue;
        const n = (names[i] ?? '').toString().trim();
        if (u && n) byUidName.set(u, n);
      }
      const enriched = joinedReservations.map((r) => {
        const currentNick = (r as any)?.nickname ? String((r as any).nickname).trim() : '';
        const currentName = (r as any)?.name ? String((r as any).name).trim() : '';
        if (currentNick || currentName) return r;
        const fromGroup = byUidName.get(r.uid);
        const fromRes = (reservationNamesByUid.get(r.uid) ?? '').toString().trim();
        const fromMap = (openWaterDisplayNamesByUid.get(r.uid) ?? '').toString().trim();
        const display = (fromGroup && fromGroup.trim()) || (fromRes && fromRes.trim()) || (fromMap && fromMap.trim()) || '';
        if (!display) return r;
        return { ...r, nickname: display } as OpenWaterReservationView;
      });
      return { ...bg, reservations: enriched } as BuoyGroupWithReservations;
    }

    // For non-admins, synthesize minimal reservation views from buoy group member data
    const memberUids = Array.isArray(bg.member_uids) ? bg.member_uids : [];
    const memberStatuses = Array.isArray(bg.member_statuses)
      ? bg.member_statuses
      : [];
    const memberNames = Array.isArray(bg.member_names) ? bg.member_names : [];

    const syntheticReservations: OpenWaterReservationView[] = memberUids.map(
      (uid, index) => ({
        reservation_id: -1,
        uid,
        res_date: bg.res_date,
        res_type: "open_water",
        res_status: (memberStatuses[index] as any) ?? ("pending" as any),
        // Prefer map-based lookup (user_profiles), fallback to RPC member_names as last resort
        nickname:
          (openWaterDisplayNamesByUid.get(uid) ?? "").toString().trim() !== ""
            ? (openWaterDisplayNamesByUid.get(uid) as string)
            : (String(memberNames[index] ?? "")),
        name: "",
        group_id: bg.id,
        time_period: bg.time_period,
        depth_m: null,
        buoy: bg.buoy_name,
        pulley: null,
        deep_fim_training: null,
        bottom_plate: null,
        large_buoy: null,
        open_water_type: bg.open_water_type ?? null,
        student_count: null,
        note: null,
      })
    );

    return {
      ...bg,
      reservations: syntheticReservations,
    } as BuoyGroupWithReservations;
  }) as BuoyGroupWithReservations[];

  function handleStatusClickFromCalendar(
    e: CustomEvent<{
      reservation: OpenWaterReservationView;
      displayName?: string | null;
    }>,
  ) {
    if (!isAdmin) return;
    const res = e.detail?.reservation;
    if (!res || res.res_status !== "pending") return;
    statusDialogReservation = res;
    statusDialogError = null;
    statusDialogDisplayName = (e.detail.displayName ?? "").trim() || null;
    statusDialogOpen = true;
  }

  function closeStatusDialog() {
    statusDialogOpen = false;
    statusDialogReservation = null;
    statusDialogSubmitting = false;
    statusDialogError = null;
    statusDialogDisplayName = null;
  }

  async function confirmStatusUpdate(newStatus: "pending" | "confirmed" | "rejected") {
    if (!statusDialogReservation || statusDialogSubmitting) return;
    statusDialogSubmitting = true;
    statusDialogError = null;
    try {
      const { uid, res_date, reservation_id } = statusDialogReservation;
      const result = await reservationApi.updateReservationStatus(
        uid,
        res_date,
        newStatus
      );
      if (!result.success) {
        statusDialogError =
          result.error ?? "Failed to update reservation status";
        return;
      }

      // Update local reservations state instead of forcing a full reload.
      // Rejected reservations will be hidden by the openWaterReservations filter.
      reservations = reservations.map((r) =>
        r.reservation_id === reservation_id ? { ...r, res_status: newStatus } : r
      );

      closeStatusDialog();
    } catch (err) {
      statusDialogError =
        err instanceof Error
          ? err.message
          : "Failed to update reservation status";
    } finally {
      statusDialogSubmitting = false;
    }
  }

  async function quickUpdateStatus(
    res: FlattenedReservation,
    newStatus: "pending" | "confirmed" | "rejected"
  ) {
    if (!isAdmin) return;
    statusDialogReservation = res;
    await confirmStatusUpdate(newStatus);
  }

  // Calendar type state
  let selectedCalendarType: ReservationType = ReservationType.openwater;
  let initializedCalendarType = false;

  // Initialize from parent-provided intent first, then URL parameter
  onMount(() => {
    console.log("SingleDayView: onMount - initialType:", initialType);
    if (initialType) {
      // Prioritize the initialType from parent component
      selectedCalendarType = initialType;
      initializedCalendarType = true;
      console.log(
        "SingleDayView: Set selectedCalendarType to initialType:",
        selectedCalendarType
      );
    } else {
      // Fallback to URL parameter if no initialType provided
      const urlParams = new URLSearchParams(window.location.search);
      const typeParam = urlParams.get("type");
      const validTypes = Object.values(ReservationType);
      if (typeParam && (validTypes as string[]).includes(typeParam)) {
        selectedCalendarType = typeParam as ReservationType;
        initializedCalendarType = true;
        console.log(
          "SingleDayView: Set selectedCalendarType from URL:",
          selectedCalendarType
        );
      }
    }
  });

  // React to changes in initialType prop
  $: if (initialType && initializedCalendarType) {
    selectedCalendarType = initialType;
  }

  const handleBackToCalendar = () => {
    // Return the last active selection so parent pages can restore it
    dispatch("backToCalendar", { type: selectedCalendarType });
  };

  const handleNewReservation = () => {
    dispatch("newReservation", {
      date: selectedDate,
      type: selectedCalendarType,
    });
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
      console.error("Error updating buoy assignment:", error);
      alert("Error updating buoy assignment: " + (error as Error).message);
    }
  };

  // Filter reservations for the selected date and type
  $: dayReservations = reservations.filter((reservation) => {
    const reservationDate = dayjs(reservation.res_date).format("YYYY-MM-DD");
    return reservationDate === selectedDate;
  });

  $: filteredReservations = dayReservations.filter((reservation) => {
    if (selectedCalendarType === ReservationType.pool)
      return reservation.res_type === "pool";
    if (selectedCalendarType === ReservationType.openwater)
      return reservation.res_type === "open_water";
    if (selectedCalendarType === ReservationType.classroom) {
      // Accept either explicit classroom type or flat classroom rows (room/start_time present)
      const isExplicit = reservation.res_type === "classroom";
      const isFlatClassroom = !!(
        reservation.room ||
        reservation.classroom_type ||
        (reservation.res_classroom &&
          (reservation.res_classroom.room ||
            reservation.res_classroom.start_time))
      );
      return isExplicit || isFlatClassroom;
    }
    return false;
  });

  // Narrowed view: only open water reservations (used by OpenWaterUserLists)
  // Hide rejected reservations from the Open Water calendar UI.
  $: openWaterReservations = filteredReservations.filter(
    (r) =>
      r.res_type === "open_water" &&
      r.res_status !== "rejected" &&
      r.res_status !== "cancelled"
  ) as OpenWaterReservationView[];

  // Build a fast uid -> display name map from the loaded reservations themselves
  // Prefer nickname, then name, then joined user_profiles nickname/name.
  $: reservationNamesByUid = (() => {
    const map = new Map<string, string>();
    for (const r of openWaterReservations || []) {
      const nick = (r as any)?.nickname ? String((r as any).nickname).trim() : "";
      const nm = (r as any)?.name ? String((r as any).name).trim() : "";
      const upNick = (r as any)?.user_profiles?.nickname
        ? String((r as any).user_profiles.nickname).trim()
        : "";
      const upName = (r as any)?.user_profiles?.name
        ? String((r as any).user_profiles.name).trim()
        : "";
      const display = nick || nm || upNick || upName || "";
      if (display) map.set(r.uid, display);
    }
    return map;
  })();

  // All reservations for the selected day, filtered by currently selected calendar type
  $: dayTypeReservations = dayReservations.filter((r) => {
    if (selectedCalendarType === ReservationType.openwater) return r.res_type === 'open_water';
    if (selectedCalendarType === ReservationType.pool) return r.res_type === 'pool';
    if (selectedCalendarType === ReservationType.classroom) return r.res_type === 'classroom';
    return false;
  }) as FlattenedReservation[];

  $: dayPendingReservations = dayTypeReservations.filter(
    (r) => r.res_status === 'pending'
  );
  $: dayApprovedReservations = dayTypeReservations.filter(
    (r) => r.res_status === 'confirmed'
  );
  $: dayDeniedReservations = dayTypeReservations.filter(
    (r) => r.res_status === 'rejected'
  );

  function openDayList() {
    if (!isAdmin) return;
    dayListTab = 'pending';
    dayListOpen = true;
  }

  function closeDayList() {
    dayListOpen = false;
  }

  function getReservationDisplayName(res: FlattenedReservation): string {
    const fromMap = (reservationNamesByUid.get(res.uid) ?? '').toString().trim();
    if (fromMap) return fromMap;
    const up = ((res as any).user_profiles ?? {}) as {
      nickname?: string | null;
      name?: string | null;
    };
    const nick = (up.nickname ?? '').toString().trim();
    const name = (up.name ?? '').toString().trim();
    return nick || name || 'Unknown';
  }

  function getReservationSubtitle(res: FlattenedReservation): string {
    const type = String(res.res_type || '').toLowerCase();

    if (type === 'open_water') {
      const owType = (res as any).open_water_type || 'Open Water';
      const depthVal = (res as any).depth_m;
      const depth = depthVal != null ? `${depthVal} m` : 'Depth N/A';
      const buoy = (res as any).buoy || 'N/A';
      return `${owType} · ${depth} · Buoy: ${buoy}`;
    }

    if (type === 'pool') {
      const poolType = (res as any).pool_type || 'Pool';
      const start =
        (res as any)?.res_pool?.start_time ?? (res as any)?.start_time ?? null;
      const end =
        (res as any)?.res_pool?.end_time ?? (res as any)?.end_time ?? null;
      const timeLabel = start && end ? `${start}–${end}` : 'Time N/A';
      const lane =
        (res as any)?.res_pool?.lane ?? (res as any)?.lane ?? null;
      const laneLabel = lane ? `Lane: ${lane}` : 'Lane: N/A';
      return `${poolType} · ${timeLabel} · ${laneLabel}`;
    }

    if (type === 'classroom') {
      const classType = (res as any).classroom_type || 'Classroom';
      const start =
        (res as any)?.res_classroom?.start_time ?? (res as any)?.start_time ?? null;
      const end =
        (res as any)?.res_classroom?.end_time ?? (res as any)?.end_time ?? null;
      const timeLabel = start && end ? `${start}–${end}` : 'Time N/A';
      const room =
        (res as any)?.res_classroom?.room ?? (res as any)?.room ?? null;
      const roomLabel = room ? `Room: ${room}` : 'Room: N/A';
      return `${classType} · ${timeLabel} · ${roomLabel}`;
    }

    // Fallback for any other type
    return String(res.res_type || 'Reservation');
  }

  function poolChild(res: any): any {
    const rp = res?.res_pool ?? null;
    if (Array.isArray(rp)) return rp[0] ?? null;
    return rp;
  }

  let lastPoolDebugKey = '';
  $: if (selectedCalendarType === ReservationType.pool) {
    const key = `${selectedDate}-${selectedCalendarType}-${(reservations || []).length}`;
    if (key !== lastPoolDebugKey) {
      lastPoolDebugKey = key;
      try {
        const shouldLogAll =
          typeof window !== 'undefined' &&
          (window as any).__POOL_DEBUG_ALL === true;

        const dayPool = (dayReservations || []).filter((r: any) => String(r?.res_type) === 'pool');
        const coaching = dayPool.filter((r: any) => {
          const child = poolChild(r);
          const pt = String(child?.pool_type ?? r?.pool_type ?? '').toLowerCase();
          return pt.includes('coach') || pt.includes('course');
        });
        const withTimetable = dayPool.filter((r: any) => {
          const child = poolChild(r);
          const start = child?.start_time ?? r?.start_time ?? null;
          const end = child?.end_time ?? r?.end_time ?? null;
          return !!start && !!end;
        });
        const coachingDiagnostics = coaching.slice(0, 5).map((r: any) => {
          const child = poolChild(r);
          const rp = r?.res_pool ?? null;
          const rpShape = Array.isArray(rp) ? 'array' : (rp ? 'object' : 'none');
          const start = child?.start_time ?? r?.start_time ?? null;
          const end = child?.end_time ?? r?.end_time ?? null;
          const lane = child?.lane ?? r?.lane ?? null;
          const poolType = child?.pool_type ?? r?.pool_type ?? null;
          const sc = child?.student_count ?? r?.student_count ?? null;
          return { uid: r?.uid, res_status: r?.res_status, rpShape, start, end, lane, poolType, student_count: sc };
        });
        console.log('[PoolDayView dbg]', {
          selectedDate,
          totalReservations: (reservations || []).length,
          dayReservations: (dayReservations || []).length,
          dayPool: dayPool.length,
          dayPoolWithTimetable: withTimetable.length,
          dayPoolCoaching: coaching.length,
          approvedPlottedPoolReservations: approvedPlottedPoolReservations,
          coachingSample: coachingDiagnostics,
        });

        if (shouldLogAll) {
          console.log('[PoolDayView dbg] ALL reservations', reservations);
          console.log('[PoolDayView dbg] ALL dayReservations', dayReservations);
          console.log('[PoolDayView dbg] ALL filteredReservations', filteredReservations);
          console.log('[PoolDayView dbg] ALL approvedPlottedPoolReservations', approvedPlottedPoolReservations);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log('[PoolDayView dbg] failed', msg);
      }
    }
  }

  // Only show approved Pool reservations with defined times (lane may be provisional in UI)
  $: approvedPlottedPoolReservations = filteredReservations.filter((r) => {
    if (selectedCalendarType !== ReservationType.pool) return false;
    if (r.res_type !== "pool") return false;
    const approved = r.res_status === "confirmed" || r.res_status === "pending";
    // Support both admin (joined res_pool) and user (flattened fields) data shapes
    const child = poolChild(r);
    const start = child?.start_time ?? r?.start_time ?? null;
    const end = child?.end_time ?? r?.end_time ?? null;
    const hasTimetable = !!start && !!end;
    return approved && hasTimetable;
  });

  // Only show approved Classroom reservations with defined times (mirrors pool approval filter)
  $: approvedClassroomReservations = filteredReservations.filter((r) => {
    if (selectedCalendarType !== ReservationType.classroom) return false;
    // Accept explicit classroom or flat classroom rows; type filtering already handled above
    const approved = r.res_status === "confirmed";
    const start = r?.res_classroom?.start_time ?? r?.start_time ?? null;
    const end = r?.res_classroom?.end_time ?? r?.end_time ?? null;
    return approved && !!start && !!end;
  });

  // Calendar type switching
  const switchCalendarType = (type: ReservationType) => {
    selectedCalendarType = type;

    // Navigate to the new route
    goto(`/reservation/${type}/${selectedDate}`);
  };

  // User-view header helpers (non-admin Open Water)
  $: formattedDateTitle = dayjs(selectedDate).format("dddd, MMMM D, YYYY");
  function prevDay() {
    const d = dayjs(selectedDate).subtract(1, "day").format("YYYY-MM-DD");
    selectedCalendarType = ReservationType.openwater;
    goto(`/reservation/openwater/${d}`);
  }
  function nextDay() {
    const d = dayjs(selectedDate).add(1, "day").format("YYYY-MM-DD");
    selectedCalendarType = ReservationType.openwater;
    goto(`/reservation/openwater/${d}`);
  }

  // ============================================ -->
  // 🔧 ADMIN-SPECIFIC: Data Loading Functions -->
  // ============================================ -->

  // Load buoy groups for the selected date (admin uses admin RPC; users use public RPC)
  const loadBuoyGroups = async () => {
    if (!selectedDate) return;

    try {
      loadingBuoyGroups = true;
      let am: any[] = [];
      let pm: any[] = [];
      if (isAdmin) {
        [am, pm] = await Promise.all([
          svcGetBuoyGroupsWithNames({ resDate: selectedDate, timePeriod: "AM" }),
          svcGetBuoyGroupsWithNames({ resDate: selectedDate, timePeriod: "PM" }),
        ]);
      } else {
        const [{ data: amData, error: amErr }, { data: pmData, error: pmErr }] = await Promise.all([
          supabase.rpc("get_buoy_groups_public", {
            p_res_date: selectedDate,
            p_time_period: "AM",
          }),
          supabase.rpc("get_buoy_groups_public", {
            p_res_date: selectedDate,
            p_time_period: "PM",
          }),
        ]);
        if (amErr) throw amErr;
        if (pmErr) throw pmErr;
        am = amData ?? [];
        pm = pmData ?? [];
      }

      // Build UID -> display name map using user_profiles for ALL member_uids
      // to avoid any potential index misalignment between RPC member_uids/member_names arrays.
      const displayNameMap = new Map<string, string | null>();
      const allUids: string[] = Array.from(
        new Set(
          [...am, ...pm].flatMap((g: any) =>
            Array.isArray(g.member_uids) ? (g.member_uids as string[]) : []
          )
        )
      );
      if (allUids.length > 0) {
        try {
          const { data: profiles, error: profilesErr } = await supabase
            .from("user_profiles")
            .select("uid, name, nickname")
            .in("uid", allUids);
          if (!profilesErr && Array.isArray(profiles)) {
            for (const p of profiles as Array<{ uid: string; name: string | null; nickname: string | null }>) {
              const display = ((p.nickname ?? p.name) ?? "").trim();
              if (p.uid && display) displayNameMap.set(p.uid, display);
            }
          }
        } catch (e) {
          // Non-fatal: keep whatever names we have
          console.warn("Failed to backfill user names for Open Water groups", e);
        }
      }

      // As a final fallback, use RPC member_names by attempting to pair indices only when
      // there is no entry from user_profiles. This is best-effort and covers rare gaps.
      for (const g of [...am, ...pm]) {
        const uids: string[] = Array.isArray(g.member_uids) ? g.member_uids : [];
        const names: (string | null)[] = Array.isArray(g.member_names)
          ? g.member_names
          : [];
        const len = Math.min(uids.length, names.length);
        for (let i = 0; i < len; i += 1) {
          const uid = uids[i];
          if (displayNameMap.has(uid)) continue;
          const raw = names[i];
          const name = (raw ?? "").trim();
          if (uid && name) displayNameMap.set(uid, name);
        }
      }

      openWaterDisplayNamesByUid = displayNameMap;

      // Merge to one array and coerce time_period to typed TimePeriod
      buoyGroups = [...am, ...pm].map((g: any) => {
        const member_uids: string[] | null = Array.isArray(g.member_uids)
          ? g.member_uids
          : null;
        const member_names: (string | null)[] | null = Array.isArray(g.member_names)
          ? g.member_names
          : null;
        // Provide res_openwater for compatibility with existing code paths
        const res_openwater = member_uids
          ? member_uids.map((uid: string) => ({ uid }))
          : undefined;
        const tp = String(g.time_period || "").toUpperCase();
        return {
          id: g.id,
          res_date: g.res_date,
          time_period: (tp === "AM" ? "AM" : "PM") as TimePeriod,
          buoy_name: g.buoy_name ?? null,
          boat: g.boat ?? null,
          member_uids,
          member_names,
          res_openwater,
          boat_count: typeof g.boat_count === "number" ? g.boat_count : null,
          open_water_type: g.open_water_type ?? null,
          member_statuses: g.member_statuses ?? null,
        } as BuoyGroupLite;
      });
      // bump version after successful load
      assignmentVersion++;
    } catch (error) {
      console.error("Error loading buoy groups:", error);
      buoyGroups = [];
    } finally {
      loadingBuoyGroups = false;
    }
  };

  // Load a per-user assignment map from res_openwater -> buoy_group for selected date
  const loadAssignmentMap = async () => {
    if (!selectedDate) return;
    try {
      const map: typeof assignmentMap = {};
      if (isAdmin) {
        // Admin can read directly with joins
        const start = dayjs(selectedDate).startOf("day");
        const end = start.add(1, "day");
        const { data, error } = await supabase
          .from("res_openwater")
          .select("uid, time_period, buoy_group(buoy_name, boat), res_date")
          .gte("res_date", start.toISOString())
          .lt("res_date", end.toISOString())
          .not("group_id", "is", null);
        if (error) throw error;
        (data ?? []).forEach((row: any) => {
          const uid: string = row.uid;
          const tp: TimePeriod =
            String(row.time_period || "").toUpperCase() === "PM" ? "PM" : "AM";
          const g = row.buoy_group || {};
          if (!map[uid]) map[uid] = {};
          map[uid][tp] = { buoy_name: g.buoy_name ?? null, boat: g.boat ?? null };
        });
      } else {
        // Users call public RPC to avoid RLS issues
        const { data, error } = await supabase.rpc("get_openwater_assignment_map", {
          p_res_date: selectedDate,
        });
        if (error) throw error;
        (data ?? []).forEach((row: any) => {
          const uid: string = row.uid;
          const tp: TimePeriod =
            String(row.time_period || "").toUpperCase() === "PM" ? "PM" : "AM";
          if (!map[uid]) map[uid] = {};
          map[uid][tp] = { buoy_name: row.buoy_name ?? null, boat: row.boat ?? null };
        });
      }
      assignmentMap = map;
      // bump version after successful load
      assignmentVersion++;
    } catch (err) {
      console.error("Error loading assignment map:", err);
      assignmentMap = {};
    }
  };

  // Load available buoys for dropdowns (admin only)
  const loadAvailableBuoys = async () => {
    try {
      availableBuoys = await svcLoadAvailableBuoys();
    } catch (error) {
      console.error("Error loading buoys:", error);
      availableBuoys = [];
    }
  };

  // ============================================ -->
  // 👤 USER-SPECIFIC: Helper Functions -->
  // ============================================ -->

  // Helpers for user-facing reservations table
  function findAssignment(uid: string, period: TimePeriod) {
    // 1) Prefer assignment from loaded buoyGroups (reflects admin boat assignment and auto buoy)
    const group = buoyGroups.find((g) => {
      if (g.time_period !== period) return false;
      const uids =
        g.member_uids && Array.isArray(g.member_uids)
          ? g.member_uids
          : (g.res_openwater || []).map((m) => m.uid);
      return uids.includes(uid);
    });

    if (group) {
      const buoy =
        group.buoy_name && String(group.buoy_name).trim() !== ""
          ? group.buoy_name
          : "Not assigned";
      const boat =
        group.boat && String(group.boat).trim() !== ""
          ? group.boat
          : "Not assigned";
      return { buoy, boat };
    }

    // 2) Fallback to direct assignment map from res_openwater -> buoy_group
    const direct = assignmentMap[uid]?.[period];
    if (direct) {
      const buoy =
        direct.buoy_name && String(direct.buoy_name).trim() !== ""
          ? direct.buoy_name
          : "Not assigned";
      const boat =
        direct.boat && String(direct.boat).trim() !== ""
          ? direct.boat
          : "Not assigned";
      return { buoy, boat };
    }

    // 3) Final fallback to assignment data from the reservation itself
    const reservation = filteredReservations.find((r) => r.uid === uid);
    if (reservation) {
      const buoy =
        reservation.buoy && String(reservation.buoy).trim() !== ""
          ? reservation.buoy
          : "Not assigned";
      const boat =
        reservation.boat && String(reservation.boat).trim() !== ""
          ? reservation.boat
          : "Not assigned";
      return { buoy, boat };
    }

    // 4) Default if nothing found
    return { buoy: "Not assigned", boat: "Not assigned" };
  }

  // Assignment data is now included in the main reservations data
  // No need for separate loading functions

  function showReservationDetails(res: FlattenedReservation) {
    // Dispatch reservationClick event to parent component to show modal
    dispatch("reservationClick", res);
  }

  // ============================================ -->
  // 🔧 ADMIN-SPECIFIC: Reactive Data Loading -->
  // ============================================ -->

  // Load buoy assignments when date or type changes to Open Water (admin and users; users are read-only)
  $: if (selectedDate && selectedCalendarType === "openwater") {
    loadOpenWaterAssignments();
    loadAvailableBuoys();
  }

  // Update boat assignment for a buoy group (admin only)
  const updateBoatAssignment = async (groupId: number, boatName: string) => {
    try {
      await svcUpdateBoat(groupId, boatName);
      // Update local state
      buoyGroups = buoyGroups.map((bg) =>
        bg.id === groupId ? { ...bg, boat: boatName } : bg
      );
    } catch (error) {
      console.error("Error updating boat assignment:", error);
      alert("Error updating boat assignment: " + (error as Error).message);
    }
  };
  // Generate time slots for 8:00 to 20:00 in 30-minute increments
  // Pool placement logic relies on this granularity to avoid dropping back-to-back bookings.
  const timeSlots = Array.from({ length: 25 }, (_, i) => {
    const totalMins = (8 * 60) + (i * 30);
    const hour = Math.floor(totalMins / 60)
      .toString()
      .padStart(2, "0");
    const min = (totalMins % 60).toString().padStart(2, "0");
    return `${hour}:${min}`;
  });

  // Pull to refresh handler
  async function refreshCurrentView() {
    if (selectedCalendarType === "openwater") {
      await Promise.all([loadOpenWaterAssignments(), loadAvailableBuoys()]);
      // Ask parent to reload reservations list as well
      dispatch("refreshReservations", { date: selectedDate, type: selectedCalendarType });
    }
  }

  // Normalize available buoys for admin table (ensure max_depth is number)
  $: adminAvailableBuoys = (availableBuoys || []).map((b) => ({
    buoy_name: b.buoy_name,
    max_depth: (b.max_depth ?? 0) as number,
  }));
</script>

<div
  class="min-h-screen bg-base-200"
  use:pullToRefresh={{ onRefresh: refreshCurrentView }}
>
  <!-- Header -->
  <SingleDayHeader
    {selectedDate}
    showListButton={isAdmin}
    on:back={handleBackToCalendar}
    on:changeDate={(e) => {
      const d = String(e.detail);
      // Keep current selection context and navigate so route reloads data
      const type = selectedCalendarType || ReservationType.openwater;
      goto(`/reservation/${type}/${d}`);
    }}
    on:openList={openDayList}
  />

  <!-- Calendar Content -->
  <div
    class="px-2 min-h-[60vh] max-w-screen-xl mx-auto"
    class:max-w-none={selectedCalendarType === "openwater"}
  >
    {#if selectedCalendarType === "pool"}
      <!-- POOL CALENDAR: Only approved and plotted reservations -->
      <PoolCalendar
        {timeSlots}
        reservations={approvedPlottedPoolReservations}
        currentUserId={$authStore.user?.id}
        {isAdmin}
        on:editReservation={(e) => dispatch('editReservation', e.detail)}
      />
    {:else if selectedCalendarType === "openwater"}
      <!-- OPEN WATER CALENDAR: Admin sees editable tables; Users see read-only tables with Boat/Buoy/Divers group -->
      <div class="flex flex-col gap-2">
        <OpenWaterAdminTables
          {availableBoats}
          availableBuoys={adminAvailableBuoys}
          buoyGroups={buoyGroupsWithReservations}
          loading={assignmentsLoading || loadingBuoyGroups}
          readOnly={!isAdmin}
          {selectedDate}
          onUpdateBuoy={updateBuoyAssignment}
          onUpdateBoat={updateBoatAssignment}
          onRefreshAssignments={refreshCurrentView}
          on:statusClick={handleStatusClickFromCalendar}
        />
      </div>
    {:else if selectedCalendarType === "classroom"}
      <!-- CLASSROOM CALENDAR: Only approved classroom reservations -->
      <ClassroomCalendar
        {timeSlots}
        reservations={approvedClassroomReservations}
        currentUserId={$authStore.user?.id}
        {isAdmin}
        on:editReservation={(e) => dispatch('editReservation', e.detail)}
      />
    {/if}
  </div>

  {#if statusDialogOpen && statusDialogReservation}
    <div class="fixed inset-0 z-[90] flex items-center justify-center bg-base-300/70 backdrop-blur-sm">
      <div class="bg-base-100 rounded-xl shadow-xl w-full max-w-sm p-4 space-y-4">
        <h3 class="text-lg font-semibold text-base-content">Update reservation</h3>
        {#if statusDialogDisplayName}
          <p class="text-sm font-semibold text-primary bg-primary/10 inline-flex px-2 py-1 rounded">
            {statusDialogDisplayName}
          </p>
        {/if}
        <p class="text-sm text-base-content/80">
          Approve or reject this open water reservation for
          {dayjs(statusDialogReservation.res_date).format("YYYY-MM-DD")}?
        </p>
        {#if statusDialogError}
          <p class="text-sm text-error">{statusDialogError}</p>
        {/if}
        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            on:click={closeStatusDialog}
            disabled={statusDialogSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-error btn-sm"
            on:click={() => confirmStatusUpdate("rejected")}
            disabled={statusDialogSubmitting}
          >
            Reject
          </button>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            on:click={() => confirmStatusUpdate("confirmed")}
            disabled={statusDialogSubmitting}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if isAdmin && dayListOpen}
    <div class="fixed inset-0 z-[85] flex items-center justify-center bg-base-300/70 backdrop-blur-sm">
      <div class="bg-base-100 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b border-base-300">
          <h3 class="text-base font-semibold text-base-content">
            Reservations for {dayjs(selectedDate).format('YYYY-MM-DD')}
          </h3>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            on:click={closeDayList}
          >
            ✕
          </button>
        </div>

        <div class="px-4 pt-3">
          <div class="tabs tabs-boxed w-full">
            <button
              type="button"
              class={`tab tab-sm flex-1 ${dayListTab === 'pending' ? 'tab-active' : ''}`}
              on:click={() => (dayListTab = 'pending')}
            >
              Pending
            </button>
            <button
              type="button"
              class={`tab tab-sm flex-1 ${dayListTab === 'approved' ? 'tab-active' : ''}`}
              on:click={() => (dayListTab = 'approved')}
            >
              Approved
            </button>
            <button
              type="button"
              class={`tab tab-sm flex-1 ${dayListTab === 'denied' ? 'tab-active' : ''}`}
              on:click={() => (dayListTab = 'denied')}
            >
              Denied
            </button>
          </div>
        </div>

        <div class="px-4 py-3 space-y-2 overflow-y-auto">
          {#if dayListTab === 'pending'}
            {#each dayPendingReservations as res (res.reservation_id)}
              <div class="flex items-center justify-between gap-3 rounded-lg border border-base-300 bg-base-100 px-3 py-2">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate">{getReservationDisplayName(res)}</p>
                  <p class="text-xs text-base-content/80 truncate">{getReservationSubtitle(res)}</p>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="btn btn-xs btn-success"
                    on:click={() => quickUpdateStatus(res, 'confirmed')}
                    disabled={statusDialogSubmitting}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-error"
                    on:click={() => quickUpdateStatus(res, 'rejected')}
                    disabled={statusDialogSubmitting}
                  >
                    Deny
                  </button>
                </div>
              </div>
            {:else}
              <p class="text-xs text-base-content/60">No pending reservations for this day.</p>
            {/each}
          {:else if dayListTab === 'approved'}
            {#each dayApprovedReservations as res (res.reservation_id)}
              <div class="flex items-center justify-between gap-3 rounded-lg border border-base-300 bg-base-100 px-3 py-2">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate">{getReservationDisplayName(res)}</p>
                  <p class="text-xs text-base-content/80 truncate">{getReservationSubtitle(res)}</p>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="btn btn-xs btn-outline"
                    on:click={() => quickUpdateStatus(res, 'pending')}
                    disabled={statusDialogSubmitting}
                  >
                    Mark Pending
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-error"
                    on:click={() => quickUpdateStatus(res, 'rejected')}
                    disabled={statusDialogSubmitting}
                  >
                    Deny
                  </button>
                </div>
              </div>
            {:else}
              <p class="text-xs text-base-content/60">No approved reservations for this day.</p>
            {/each}
          {:else}
            {#each dayDeniedReservations as res (res.reservation_id)}
              <div class="flex items-center justify-between gap-3 rounded-lg border border-base-300 bg-base-100 px-3 py-2">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate">{getReservationDisplayName(res)}</p>
                  <p class="text-xs text-base-content/80 truncate">{getReservationSubtitle(res)}</p>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="btn btn-xs btn-outline"
                    on:click={() => quickUpdateStatus(res, 'pending')}
                    disabled={statusDialogSubmitting}
                  >
                    Mark Pending
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-success"
                    on:click={() => quickUpdateStatus(res, 'confirmed')}
                    disabled={statusDialogSubmitting}
                  >
                    Approve
                  </button>
                </div>
              </div>
            {:else}
              <p class="text-xs text-base-content/60">No denied reservations for this day.</p>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <FloatingActionButton on:newReservation={handleNewReservation} />
</div>
