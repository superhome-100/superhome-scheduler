<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { authStore } from "../../stores/auth";
  import { reservationStore } from "../../stores/reservationStore";
  import FormModalHeader from "../ReservationFormModal/FormModalHeader.svelte";
  import FormBasicFields from "../ReservationFormModal/FormBasicFields.svelte";
  import FormOpenWaterFields from "../ReservationFormModal/FormOpenWaterFields.svelte";
  import FormPoolFields from "../ReservationFormModal/FormPoolFields.svelte";
  import FormClassroomFields from "../ReservationFormModal/FormClassroomFields.svelte";
  import FormTimeFields from "../ReservationFormModal/FormTimeFields.svelte";
  import FormNotes from "../ReservationFormModal/FormNotes.svelte";
  import FormActions from "../ReservationFormModal/FormActions.svelte";
  import FormErrorAlert from "../ReservationFormModal/FormErrorAlert.svelte";
  import EquipmentOptions from "../ReservationFormModal/EquipmentOptions.svelte";
  import {
    validateForm,
    getDefaultFormData,
    getSubmissionData,
  } from "../ReservationFormModal/formUtils";
  import type { UpdateReservationData } from "../../api/reservationApi";
  import {
    isBeforeCutoff,
    getEditPhase,
    type EditPhase,
  } from "../../utils/cutoffRules";
  import {
    checkBlockForForm,
    checkCapacityForForm,
  } from "$lib/utils/availabilityClient";

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let reservation: any; // CompleteReservation

  // Local state
  let formData = getDefaultFormData();
  let errors: Record<string, string> = {};
  let loading = false;
  let submitError: string | null = null;
  let submitAttempted = false;
  let modalEl: HTMLDivElement | null = null;

  // Clear prior submit error as soon as the user changes any meaningful inputs.
  let lastEnableKey = "";
  const enableKey = () =>
    JSON.stringify({
      type: formData?.type ?? null,
      date: formData?.date ?? null,
      startTime: formData?.startTime ?? null,
      endTime: formData?.endTime ?? null,
      timeOfDay: formData?.timeOfDay ?? null,
      poolType: formData?.poolType ?? null,
      classroomType: formData?.classroomType ?? null,
      openWaterType: formData?.openWaterType ?? null,
      studentCount: formData?.studentCount ?? null,
    });

  $: {
    const k = enableKey();
    if (k !== lastEnableKey) {
      lastEnableKey = k;
      if (!loading && submitError) submitError = null;
    }
  }

  // Availability/capacity client checks (READ)
  let isBlocked = false;
  let blockedReason: string | null = null;
  let capacityBlocked = false;
  let capacityMessage: string | null = null;
  let capacityKind: "pool" | "classroom" | null = null;

  // Derived helpers
  const resType = () =>
    reservation?.res_type as "open_water" | "pool" | "classroom";
  // Try to get exact original ISO res_date from the raw reservation when available
  const getOriginalResDateIso = (): string => {
    const fromSelf = reservation?.res_date as string | undefined;
    const fromRaw = reservation?.raw_reservation?.res_date as
      | string
      | undefined;
    const pick = fromRaw || fromSelf;
    if (pick) return pick;
    // Fallback: build from visible fields (date + startTime/timeOfDay)
    try {
      if (reservation?.res_type === "open_water") {
        const day = formData.date || (reservation?.date?.slice(0, 10) ?? "");
        const t =
          (formData.timeOfDay || reservation?.time_period || "AM") === "PM"
            ? "13:00"
            : "08:00";
        return new Date(`${day}T${t}:00.000Z`).toISOString();
      }
      const day = formData.date || (reservation?.date?.slice(0, 10) ?? "");
      const st =
        formData.startTime ||
        reservation?.start_time ||
        reservation?.res_pool?.start_time ||
        reservation?.res_classroom?.start_time ||
        "08:00";
      return new Date(`${day}T${st}`).toISOString();
    } catch {
      return reservation?.res_date;
    }
  };

  const toFormType = (t: "open_water" | "pool" | "classroom") =>
    t === "open_water" ? "openwater" : t;

  const initFormFromReservation = () => {
    if (!reservation) return;
    formData = getDefaultFormData();
    formData.type = toFormType(reservation.res_type);
    // Set date field from ISO
    const iso = reservation.res_date;
    formData.date = iso ? new Date(iso).toISOString().slice(0, 10) : "";

    if (reservation.res_type === "open_water") {
      formData.timeOfDay =
        reservation?.res_openwater?.time_period ||
        reservation?.time_period ||
        "AM";
      formData.openWaterType =
        reservation?.res_openwater?.open_water_type ||
        reservation?.open_water_type ||
        undefined;
      formData.depth = (reservation?.res_openwater?.depth_m ??
        reservation?.depth_m ??
        undefined) as any;
      formData.pulley = (reservation?.res_openwater?.pulley ??
        reservation?.pulley ??
        false) as any;
      formData.deepFimTraining = !!(
        reservation?.res_openwater?.deep_fim_training ??
        reservation?.deep_fim_training
      );
      formData.bottomPlate = !!(
        reservation?.res_openwater?.bottom_plate ?? reservation?.bottom_plate
      );
      formData.largeBuoy = !!(
        reservation?.res_openwater?.large_buoy ?? reservation?.large_buoy
      );
      formData.notes =
        reservation?.res_openwater?.note ?? reservation?.note ?? "";
    } else if (reservation.res_type === "pool") {
      const pool = reservation.res_pool || {};
      formData.poolType =
        pool.pool_type || reservation.pool_type || "autonomous";
      formData.startTime = pool.start_time || reservation.start_time || "";
      formData.endTime = pool.end_time || reservation.end_time || "";
      formData.studentCount = (pool.student_count ??
        reservation.student_count ??
        "") as any;
      formData.notes = pool.note || reservation.note || "";
    } else if (reservation.res_type === "classroom") {
      const cls = reservation.res_classroom || {};
      formData.classroomType =
        cls.classroom_type || reservation.classroom_type || undefined;
      formData.startTime = cls.start_time || reservation.start_time || "";
      formData.endTime = cls.end_time || reservation.end_time || "";
      formData.studentCount = (cls.student_count ??
        reservation.student_count ??
        "") as any;
      formData.notes = cls.note || reservation.note || "";
    }
  };

  $: if (isOpen && reservation) {
    initFormFromReservation();
  }

  const scrollToTop = () => {
    if (modalEl) {
      try {
        modalEl.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        modalEl.scrollTop = 0;
      }
    }
  };

  const closeModal = () => dispatch("close");

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) closeModal();
  };

  const handleValidationChange = (event: CustomEvent) => {
    if (event.detail.errors && Object.keys(event.detail.errors).length === 0) {
      const { errors: validationErrors } = validateForm(formData);
      errors = validationErrors;
    } else {
      errors = { ...errors, ...event.detail.errors };
    }
  };

  // Edit phase evaluation: flexible, restricted (cannot cancel), or locked (cannot modify)
  $: editPhase = (() => {
    if (!formData.date) return "flexible" as EditPhase;
    const t = resType();
    if (t === "open_water") {
      const timeOfDay: "AM" | "PM" = (formData.timeOfDay ||
        reservation?.res_openwater?.time_period ||
        reservation?.time_period ||
        "AM") as any;
      // Use original ISO if possible for consistent day computation
      const iso = getOriginalResDateIso();
      return getEditPhase(t, iso, undefined, timeOfDay);
    }
    const start =
      formData.startTime ||
      reservation?.start_time ||
      reservation?.res_pool?.start_time ||
      reservation?.res_classroom?.start_time ||
      "";
    const iso = getOriginalResDateIso();
    return getEditPhase(t, iso, start, undefined);
  })();

  async function checkAvailabilityClient() {
    isBlocked = false;
    blockedReason = null;
    if (!formData.date || !formData.type) return;
    const res = await checkBlockForForm(formData);
    isBlocked = res.isBlocked;
    blockedReason = res.reason;
  }

  $: if (formData.date && formData.type) {
    checkAvailabilityClient();
  }
  $: if (formData.type === "pool" && formData.poolType && formData.date) {
    checkAvailabilityClient();
  }
  $: if (
    formData.type === "classroom" &&
    formData.classroomType &&
    formData.date
  ) {
    checkAvailabilityClient();
  }
  $: if (
    formData.type === "openwater" &&
    formData.openWaterType &&
    formData.date
  ) {
    checkAvailabilityClient();
  }

  async function checkCapacityClient() {
    if (!formData?.date || !formData?.startTime || !formData?.endTime) {
      capacityBlocked = false;
      capacityMessage = null;
      capacityKind = null;
      return;
    }
    if (formData.type !== "pool" && formData.type !== "classroom") {
      capacityBlocked = false;
      capacityMessage = null;
      capacityKind = null;
      return;
    }
    const res = await checkCapacityForForm(formData);
    capacityBlocked = !res.available;
    capacityKind = res.kind;
    capacityMessage = res.available
      ? null
      : res.reason ||
        (res.kind === "pool"
          ? "No pool lanes available for the selected time"
          : "No classrooms available for the selected time window");
  }
  $: if (
    (formData.type === "pool" || formData.type === "classroom") &&
    formData.date &&
    formData.startTime &&
    formData.endTime
  ) {
    checkCapacityClient();
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeModal();
    }
  };

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    submitAttempted = true;
    submitError = null;

    if (capacityBlocked && capacityMessage) {
      submitError = capacityMessage;
      scrollToTop();
      return;
    }

    const { isValid, errors: validationErrors } = validateForm(formData);
    errors = validationErrors;
    if (!isValid) return;

    if (!$authStore.user) {
      submitError = "You must be logged in to update a reservation";
      return;
    }

    try {
      loading = true;
      // Build UpdateReservationData based on formData and original reservation
      const submission = getSubmissionData(formData);

      const update: UpdateReservationData = {};
      update.reservation_id = reservation.reservation_id as any;
      let anyChange = false;
      // Update parent date/time if changed
      const originalIso = getOriginalResDateIso();
      let newIso: string | null = null;
      if (reservation.res_type === "open_water") {
        const t =
          (submission.timeOfDay || formData.timeOfDay) === "PM"
            ? "13:00"
            : "08:00";
        newIso = new Date(`${submission.date}T${t}`).toISOString();
      } else {
        newIso = new Date(
          `${submission.date}T${submission.startTime}`,
        ).toISOString();
      }
      const dateTimeChanged = !!(newIso && newIso !== originalIso);
      if (dateTimeChanged) {
        update.res_date = newIso;
        anyChange = true;
      }

      if (reservation.res_type === "pool") {
        update.pool = {
          start_time: submission.startTime,
          end_time: submission.endTime,
          note: (submission.notes || "").trim() || undefined,
          pool_type: formData.poolType || undefined,
          student_count:
            formData.poolType === "course_coaching"
              ? parseInt((formData.studentCount as any) || "0", 10)
              : undefined,
        };
        // Detect changes against original for pool
        const orig = reservation.res_pool || {};
        const changedPool =
          (update.pool.start_time &&
            update.pool.start_time !==
              (orig.start_time || reservation.start_time)) ||
          (update.pool.end_time &&
            update.pool.end_time !== (orig.end_time || reservation.end_time)) ||
          (update.pool.pool_type &&
            update.pool.pool_type !==
              (orig.pool_type || reservation.pool_type)) ||
          (typeof update.pool.student_count === "number" &&
            update.pool.student_count !==
              (orig.student_count ?? reservation.student_count)) ||
          (typeof update.pool.note === "string" &&
            update.pool.note !== (orig.note || reservation.note));
        anyChange = anyChange || !!changedPool;
      } else if (reservation.res_type === "classroom") {
        update.classroom = {
          start_time: submission.startTime,
          end_time: submission.endTime,
          note: (submission.notes || "").trim() || undefined,
          classroom_type: formData.classroomType || undefined,
          student_count:
            formData.classroomType === "course_coaching"
              ? parseInt((formData.studentCount as any) || "0", 10)
              : undefined,
        };
        const orig = reservation.res_classroom || {};
        const changedClass =
          (update.classroom.start_time &&
            update.classroom.start_time !==
              (orig.start_time || reservation.start_time)) ||
          (update.classroom.end_time &&
            update.classroom.end_time !==
              (orig.end_time || reservation.end_time)) ||
          (update.classroom.classroom_type &&
            update.classroom.classroom_type !==
              (orig.classroom_type || reservation.classroom_type)) ||
          (typeof update.classroom.student_count === "number" &&
            update.classroom.student_count !==
              (orig.student_count ?? reservation.student_count)) ||
          (typeof update.classroom.note === "string" &&
            update.classroom.note !== (orig.note || reservation.note));
        anyChange = anyChange || !!changedClass;
      } else if (reservation.res_type === "open_water") {
        update.openwater = {
          time_period: submission.timeOfDay,
          depth_m: formData.depth
            ? parseInt((formData.depth as any) || "0", 10)
            : undefined,
          open_water_type: formData.openWaterType || undefined,
          student_count:
            formData.openWaterType === "course_coaching"
              ? parseInt((formData.studentCount as any) || "0", 10)
              : undefined,
          pulley:
            formData.openWaterType === "course_coaching"
              ? formData.pulley === "true" || formData.pulley === true
              : !!formData.pulley,
          deep_fim_training: !!formData.deepFimTraining,
          bottom_plate: !!formData.bottomPlate,
          large_buoy: !!formData.largeBuoy,
          note: (submission.notes || "").trim() || undefined,
        };
        const orig = reservation.res_openwater || {};
        const changedOw =
          (update.openwater.time_period &&
            update.openwater.time_period !==
              (orig.time_period || reservation.time_period)) ||
          (update.openwater.open_water_type &&
            update.openwater.open_water_type !==
              (orig.open_water_type || reservation.open_water_type)) ||
          (typeof update.openwater.student_count === "number" &&
            update.openwater.student_count !==
              (orig.student_count ?? reservation.student_count)) ||
          (typeof update.openwater.depth_m === "number" &&
            update.openwater.depth_m !==
              (orig.depth_m ?? reservation.depth_m)) ||
          (typeof update.openwater.pulley === "boolean" &&
            update.openwater.pulley !== (orig.pulley ?? reservation.pulley)) ||
          (typeof update.openwater.deep_fim_training === "boolean" &&
            update.openwater.deep_fim_training !==
              (orig.deep_fim_training ?? reservation.deep_fim_training)) ||
          (typeof update.openwater.bottom_plate === "boolean" &&
            update.openwater.bottom_plate !==
              (orig.bottom_plate ?? reservation.bottom_plate)) ||
          (typeof update.openwater.large_buoy === "boolean" &&
            update.openwater.large_buoy !==
              (orig.large_buoy ?? reservation.large_buoy)) ||
          (typeof update.openwater.note === "string" &&
            update.openwater.note !== (orig.note || reservation.note));
        anyChange = anyChange || !!changedOw;
      }

      // Phase-based restrictions
      const t = resType();
      if (editPhase === "locked") {
        submitError =
          "The modification window has closed; this reservation can no longer be edited.";
        scrollToTop();
        loading = false;
        return;
      }

      if (editPhase === "restricted") {
        // Disallow date/time changes
        if (dateTimeChanged) {
          submitError =
            "You cannot change the date or time after the modification cutoff.";
          scrollToTop();
          loading = false;
          return;
        }
        // Only reductions in student count for course types; allow switching to autonomous
        const getNums = () => {
          const origNum = (reservation?.res_pool?.student_count ??
            reservation?.res_classroom?.student_count ??
            reservation?.res_openwater?.student_count ??
            reservation?.student_count ??
            null) as number | null;
          const newNum =
            t === "open_water"
              ? (update.openwater?.student_count ?? origNum)
              : t === "pool"
                ? (update.pool?.student_count ?? origNum)
                : (update.classroom?.student_count ?? origNum);
          return { origNum, newNum };
        };
        const isCourse = () => {
          if (t === "open_water")
            return (
              (formData.openWaterType ||
                reservation?.open_water_type ||
                reservation?.res_openwater?.open_water_type) ===
              "course_coaching"
            );
          if (t === "pool")
            return (
              (formData.poolType ||
                reservation?.pool_type ||
                reservation?.res_pool?.pool_type) === "course_coaching"
            );
          if (t === "classroom")
            return (
              (formData.classroomType ||
                reservation?.classroom_type ||
                reservation?.res_classroom?.classroom_type) ===
              "course_coaching"
            );
          return false;
        };
        if (isCourse()) {
          const { origNum, newNum } = getNums();
          if (origNum != null && newNum != null && newNum > origNum) {
            submitError =
              "After the modification cutoff, you can only reduce the number of students.";
            scrollToTop();
            loading = false;
            return;
          }
        }
      }

      // Status adjustments per legacy rules
      if (anyChange) {
        if (reservation.res_type === "open_water") {
          // Set back to pending for admin review
          update.res_status = "pending" as any;
        } else {
          // Preserve confirmed for pool/classroom edits
          if (reservation.res_status === "confirmed") {
            update.res_status = "confirmed" as any;
          }
        }
      }

      const { success, error } = await reservationStore.updateReservation(
        reservation.uid,
        getOriginalResDateIso(),
        update,
      );

      if (success) {
        dispatch("updated");
        closeModal();
      } else {
        submitError = error || "Failed to update reservation";
        scrollToTop();
      }
    } catch (err) {
      submitError =
        err instanceof Error ? err.message : "Failed to update reservation";
    } finally {
      loading = false;
    }
  };
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && reservation}
  <div
    class="modal-overlay"
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === "Escape" && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-label="Update Reservations"
    tabindex="-1"
  >
    <div class="modal-content" bind:this={modalEl}>
      <FormModalHeader title="Update Reservations" on:close={closeModal} />

      <form on:submit={handleSubmit} class="modal-body">
        <FormErrorAlert {submitError} />
        {#if isBlocked}
          <div class="alert alert-error mb-3 text-sm">
            <span class="font-bold text-red-600">
              This date is currently blocked for {formData.type}.
            </span>
            {#if blockedReason}
              <span class="ml-2 text-red-600">Reason: {blockedReason}</span>
            {/if}
          </div>
        {/if}

        <div class="form-grid">
          <!-- Basic fields (type disabled to keep schema consistent) -->
          <FormBasicFields
            bind:formData
            {errors}
            disableType={true}
            on:validationChange={handleValidationChange}
          />

          {#if formData.type === "pool"}
            <FormPoolFields
              bind:formData
              {errors}
              {submitAttempted}
              on:validationChange={handleValidationChange}
            />
          {/if}

          {#if formData.type === "openwater"}
            <FormOpenWaterFields
              bind:formData
              {errors}
              {submitAttempted}
              on:validationChange={handleValidationChange}
            />
          {/if}

          {#if formData.type === "classroom"}
            <FormClassroomFields
              bind:formData
              {errors}
              {submitAttempted}
              on:validationChange={handleValidationChange}
            />
          {/if}

          {#if formData.type !== "openwater"}
            <div class="time-fields-wrapper">
              <FormTimeFields
                bind:formData
                {errors}
                on:validationChange={handleValidationChange}
              />
            </div>
          {/if}
        </div>

        {#if formData.type === "openwater"}
          <EquipmentOptions bind:formData />
        {/if}

        <FormNotes bind:formData />

        {#if capacityBlocked && capacityMessage}
          <div
            class="alert my-2 text-sm"
            class:alert-error={capacityKind === "pool"}
            class:alert-warning={capacityKind !== "pool"}
          >
            <span
              class={capacityKind === "pool" || capacityKind === "classroom"
                ? "text-red-600 font-semibold"
                : ""}
            >
              {capacityMessage}
            </span>
          </div>
        {/if}

        <FormActions
          {loading}
          submitLabel="Update"
          isCutoffPassed={editPhase === "locked" ||
            isBlocked ||
            capacityBlocked}
          on:close={closeModal}
        />
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
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
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .modal-body {
    padding: 1.5rem;
    flex: 1;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .time-fields-wrapper {
    grid-column: 1 / -1;
  }
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0.5rem;
    }
    .modal-content {
      max-height: 95vh;
    }
    .form-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
    .time-fields-wrapper {
      grid-column: 1;
    }
  }
</style>
