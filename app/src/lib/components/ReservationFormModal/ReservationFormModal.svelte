<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { authStore } from "../../stores/auth";
  import { reservationStore } from "../../stores/reservationStore";
  import type { CreateReservationData, UpdateReservationData } from "../../api/reservationApi";
  import FormModalHeader from "./FormModalHeader.svelte";
  import FormBasicFields from "./FormBasicFields.svelte";
  import FormOpenWaterFields from "./FormOpenWaterFields.svelte";
  import FormPoolFields from "./FormPoolFields.svelte";
  import FormClassroomFields from "./FormClassroomFields.svelte";
  import FormTimeFields from "./FormTimeFields.svelte";
  import FormNotes from "./FormNotes.svelte";
  import FormActions from "./FormActions.svelte";
  import FormErrorAlert from "./FormErrorAlert.svelte";
  import EquipmentOptions from "./EquipmentOptions.svelte";
  import BuddySelection from "./BuddySelection.svelte";
  import CutoffWarning from "../CutoffWarning.svelte";
  import {
    validateForm,
    getDefaultFormData,
    getSubmissionData,
    getDefaultDateForType,
    getDefaultTimesFor,
  } from "./formUtils";
  import { isBeforeCutoff } from "../../utils/cutoffRules";
  import {
    checkBlockForForm,
    checkCapacityForForm,
  } from "$lib/utils/availabilityClient";
  import type { ReservationType } from "../../services/reservationService";
  import Toast from "../Toast.svelte";
  import { showLoading, hideLoading } from "../../stores/ui";

  // Normalize a time string to HH:MM (strip seconds if present)
  const toHHMM = (t: string | undefined | null): string => {
    if (!t) return "";
    const m = String(t).match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
    return String(t);
  };

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  // Optional initial type from caller (Reservation page calendar selection)
  export let initialType: "openwater" | "pool" | "classroom" | undefined;
  // Optional initial date from caller (e.g. current Single Day View date, YYYY-MM-DD)
  export let initialDate: string | undefined;
  // When true, the modal edits an existing reservation instead of creating a new one
  export let editing: boolean = false;
  export let initialReservation: any = null;
  
  // Modal title reflects whether we're creating or updating a reservation
  $: modalTitle = editing ? "Update Reservation" : "Reservation Request";

  // Form data
  let formData = getDefaultFormData();
  // Initialize buddies array
  formData.buddies = [];

  // Set default pulley value for Course/Coaching
  $: if (
    formData.openWaterType === "course_coaching" &&
    formData.pulley === false
  ) {
    formData.pulley = "true";
  }

  // When selecting Course/Coaching in Open Water, buddies are not applicable
  $: if (
    formData.type === "openwater" &&
    formData.openWaterType === "course_coaching" &&
    Array.isArray(formData.buddies) &&
    formData.buddies.length > 0
  ) {
    formData.buddies = [];
  }

  // When selecting Course/Coaching in Pool, buddies are not applicable
  $: if (
    formData.type === "pool" &&
    formData.poolType === "course_coaching" &&
    Array.isArray(formData.buddies) &&
    formData.buddies.length > 0
  ) {
    formData.buddies = [];
  }

  // When selecting Course/Coaching in Classroom, buddies are not applicable
  $: if (
    formData.type === "classroom" &&
    formData.classroomType === "course_coaching" &&
    Array.isArray(formData.buddies) &&
    formData.buddies.length > 0
  ) {
    formData.buddies = [];
  }

  // Trigger validation when form data changes
  $: if (formData.date && formData.type) {
    const { errors: validationErrors } = validateForm(formData);
    errors = validationErrors;
  }

  // Map UI form type to service ReservationType ('open_water' | 'pool' | 'classroom')
  const toServiceReservationType = (
    t: "openwater" | "pool" | "classroom",
  ): ReservationType => {
    return t === "openwater" ? "open_water" : t;
  };

  // Reactive values for CutoffWarning to ensure updates
  $: currentReservationDate = formData.date;
  $: currentResType = formData.type
    ? toServiceReservationType(formData.type)
    : "pool";

  // Check if cutoff time has passed (used for warnings and disabling actions)
  $: isCutoffPassed = (() => {
    if (!formData.date || !formData.type) return false;
    const resType: ReservationType = formData.type
      ? toServiceReservationType(formData.type)
      : "pool";

    // Open Water: evaluate against fixed slot start
    if (formData.type === "openwater" && formData.timeOfDay) {
      const time = formData.timeOfDay === "AM" ? "08:00" : "13:00";
      const reservationDateTime = new Date(`${formData.date}T${time}`);
      return !isBeforeCutoff(reservationDateTime.toISOString(), resType);
    }

    // Pool/Classroom: only evaluate cutoff once a startTime is chosen
    if (formData.type === "pool" || formData.type === "classroom") {
      if (!formData.startTime) return false;
      const reservationDateTime = new Date(
        `${formData.date}T${formData.startTime}`,
      );
      return !isBeforeCutoff(reservationDateTime.toISOString(), resType);
    }

    return false;
  })();

  // Availability check (READ directly from DB per rules)
  let isBlocked = false;
  let blockedReason: string | null = null;

  async function checkAvailabilityClient() {
    isBlocked = false;
    blockedReason = null;
    if (!formData.date || !formData.type) return;
    const res = await checkBlockForForm(formData);
    isBlocked = res.isBlocked;
    blockedReason = res.reason;
  }

  // Trigger availability check when relevant fields change
  $: if (formData.date && formData.type) {
    checkAvailabilityClient();
  }

  // Also trigger when subtype fields change
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

  // New: Pool/Classroom capacity check (READ-only)
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

  // When capacity is blocked, surface a non-blocking toast to inform user it will go to manual approval
  $: if (capacityBlocked && capacityMessage) {
    showErrorToast(`${capacityMessage} — your request can still be submitted and will wait for admin approval.`);
  }

  // Form validation and loading state
  let errors: Record<string, string> = {};
  let loading = false;
  let submitError: string | null = null;
  let submitAttempted = false;
  // Disable submit when we know no lane is available for Pool
  let noLaneError = false;
  // Disable submit when we know no classroom is available
  let noRoomError = false;
  // Client-side capacity check result for Pool/Classroom
  let capacityBlocked = false;
  let capacityMessage: string | null = null;
  let capacityKind: "pool" | "classroom" | null = null;

  // Scroll helpers for ensuring error visibility
  let modalEl: HTMLDivElement | null = null;
  const scrollToTop = () => {
    if (modalEl) {
      try {
        modalEl.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        modalEl.scrollTop = 0;
      }
    }
  };

  // Toast state for capacity errors
  let toastOpen = false;
  let toastMessage = "";
  const showErrorToast = (msg: string) => {
    toastMessage = msg;
    toastOpen = true;
    // Ensure the user sees the error immediately
    scrollToTop();
  };

  const closeModal = () => {
    dispatch("close");
  };

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  };

  const validateFormData = () => {
    const { errors: validationErrors, isValid } = validateForm(formData);
    errors = validationErrors;
    return isValid;
  };

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    submitAttempted = true;
    noLaneError = false;
    noRoomError = false;
    // Capacity blocked no longer prevents submission; it will create a pending request server-side

    if (!validateFormData()) return;
    if (!$authStore.user) {
      submitError = "You must be logged in to make a reservation";
      return;
    }

    try {
      loading = true;
      submitError = null;

      // Set default times for Open Water reservations
      const submissionData = getSubmissionData(formData);

      // Ensure HH:MM format for non-openwater times
      if (submissionData.type !== "openwater") {
        submissionData.startTime = toHHMM(submissionData.startTime);
        submissionData.endTime = toHHMM(submissionData.endTime);
      }

      // Create reservation date-time
      const reservationDateTime = new Date(
        `${submissionData.date}T${submissionData.startTime}`,
      );

      // Check if date is in the future
      if (reservationDateTime <= new Date()) {
        submitError = "Reservation date must be in the future";
        return;
      }

      const dbResType = toServiceReservationType(
        submissionData.type as "openwater" | "pool" | "classroom",
      );

      if (editing && initialReservation) {
        // UPDATE existing reservation
        const updateData: UpdateReservationData = {
          res_date: reservationDateTime.toISOString(),
        };

        // Ensure reservation_id (PK) is passed through for updates
        {
          const rawId =
            initialReservation?.reservation_id ??
            initialReservation?.raw_reservation?.reservation_id ??
            null;
          const idNum = rawId != null ? Number(rawId) : null;
          if (idNum != null && Number.isFinite(idNum)) {
            updateData.reservation_id = idNum;
          }
        }

        if (submissionData.type === "pool") {
          updateData.pool = {
            start_time: toHHMM(submissionData.startTime),
            end_time: toHHMM(submissionData.endTime),
            note: submissionData.notes.trim() || undefined,
            pool_type: formData.poolType || undefined,
            student_count:
              formData.poolType === "course_coaching"
                ? parseInt(formData.studentCount as unknown as string, 10)
                : undefined,
          };
        } else if (submissionData.type === "classroom") {
          updateData.classroom = {
            start_time: toHHMM(submissionData.startTime),
            end_time: toHHMM(submissionData.endTime),
            note: submissionData.notes.trim() || undefined,
            classroom_type: formData.classroomType || undefined,
            student_count:
              formData.classroomType === "course_coaching"
                ? parseInt(formData.studentCount as unknown as string, 10)
                : undefined,
          };
        } else if (submissionData.type === "openwater") {
          updateData.openwater = {
            time_period: submissionData.timeOfDay,
            depth_m: formData.depth
              ? parseInt(formData.depth as unknown as string, 10)
              : undefined,
            open_water_type: formData.openWaterType || undefined,
            student_count:
              formData.openWaterType === "course_coaching"
                ? parseInt(formData.studentCount as unknown as string, 10)
                : undefined,
            pulley:
              formData.openWaterType === "course_coaching"
                ? formData.pulley === "true" || formData.pulley === true
                : !!formData.pulley,
            deep_fim_training: !!formData.deepFimTraining,
            bottom_plate: !!formData.bottomPlate,
            large_buoy: !!formData.largeBuoy,
            note: submissionData.notes.trim() || undefined,
          };
        }

        showLoading("Updating reservation...");
        const originalUid =
          (initialReservation.uid as string | undefined) || $authStore.user?.id;
        const originalResDate =
          (initialReservation.res_date as string | undefined) ||
          reservationDateTime.toISOString();

        if (!originalUid || !originalResDate) {
          submitError = "Missing reservation identifiers for update";
          return;
        }

        const result = await reservationStore.updateReservation(
          originalUid,
          originalResDate,
          updateData,
        );

        if (result.success) {
          dispatch("submit", {
            ...submissionData,
            reservation: result.data,
          });
          resetForm();
          closeModal();
        } else {
          submitError = result.error || "Failed to update reservation";
          scrollToTop();
        }
      } else {
        // CREATE new reservation
        const reservationData: CreateReservationData = {
          res_type: dbResType,
          res_date: reservationDateTime.toISOString(),
          res_status: "pending",
          buddies: (() => {
            const isCoaching =
              (submissionData.type === "openwater" && formData.openWaterType === "course_coaching") ||
              (submissionData.type === "pool" && formData.poolType === "course_coaching") ||
              (submissionData.type === "classroom" && formData.classroomType === "course_coaching");
            if (isCoaching) return undefined;
            return Array.isArray(formData.buddies) && formData.buddies.length
              ? [...formData.buddies]
              : undefined;
          })(),
        };

        if (submissionData.type === "pool") {
          reservationData.pool = {
            start_time: toHHMM(submissionData.startTime),
            end_time: toHHMM(submissionData.endTime),
            note: submissionData.notes.trim() || undefined,
            pool_type: formData.poolType || undefined,
            student_count:
              formData.poolType === "course_coaching"
                ? parseInt(formData.studentCount as unknown as string, 10)
                : undefined,
          };
        } else if (submissionData.type === "classroom") {
          reservationData.classroom = {
            start_time: toHHMM(submissionData.startTime),
            end_time: toHHMM(submissionData.endTime),
            note: submissionData.notes.trim() || undefined,
            classroom_type: formData.classroomType || undefined,
            student_count:
              formData.classroomType === "course_coaching"
                ? parseInt(formData.studentCount as unknown as string, 10)
                : undefined,
          };
        } else if (submissionData.type === "openwater") {
          reservationData.openwater = {
            time_period: submissionData.timeOfDay,
            depth_m: formData.depth
              ? parseInt(formData.depth as unknown as string, 10)
              : undefined,
            open_water_type: formData.openWaterType || undefined,
            student_count:
              formData.openWaterType === "course_coaching"
                ? parseInt(formData.studentCount as unknown as string, 10)
                : undefined,
            pulley:
              formData.openWaterType === "course_coaching"
                ? formData.pulley === "true" || formData.pulley === true
                : !!formData.pulley,
            deep_fim_training: !!formData.deepFimTraining,
            bottom_plate: !!formData.bottomPlate,
            large_buoy: !!formData.largeBuoy,
            note: submissionData.notes.trim() || undefined,
          };
        }

        showLoading("Submitting reservation...");
        const result = await reservationStore.createReservation(
          $authStore.user.id,
          reservationData,
        );

        if (result.success) {
          dispatch("submit", {
            ...submissionData,
            reservation: result.data,
          });
          resetForm();
          closeModal();
        } else {
          submitError = result.error || "Failed to create reservation";
          scrollToTop();
          if (submitError && submitError.includes("No pool lanes available")) {
            noLaneError = true;
          }
          if (submitError && submitError.includes("No classrooms available")) {
            noRoomError = true;
            showErrorToast(submitError);
          }
          if (
            submitError &&
            submitError.startsWith("Already have a reservation for ")
          ) {
            showErrorToast(submitError);
          }
        }
      }
    } catch (err) {
      console.error("Error submitting reservation:", err);
      submitError =
        err instanceof Error ? err.message : "Failed to submit reservation";
    } finally {
      loading = false;
      hideLoading();
    }
  };

  const resetForm = () => {
    formData = getDefaultFormData();
    errors = {};
    submitError = null;
    loading = false;
    submitAttempted = false;
    noLaneError = false;
    noRoomError = false;
    capacityBlocked = false;
    capacityMessage = null;
    capacityKind = null;
  };

  // Handle type change to reset time fields for Open Water
  const handleTypeChange = () => {
    if (formData.type === "openwater") {
      // Clear time fields for Open Water
      formData.startTime = "";
      formData.endTime = "";
    } else if (formData.type === "pool") {
      // Pool defaults with 30-min logic
      formData.poolType = "autonomous";
      const t = getDefaultTimesFor("pool");
      formData.startTime = t.startTime;
      formData.endTime = t.endTime;
    } else if (formData.type === "classroom") {
      // Classroom defaults with 30-min logic
      const t = getDefaultTimesFor("classroom");
      formData.startTime = t.startTime;
      formData.endTime = t.endTime;
    }
    // Recompute default date based on type and current time cutoff
    const mappedType: "openwater" | "pool" | "classroom" =
      (formData.type as any) || "pool";
    formData.date = getDefaultDateForType(mappedType);
  };

  // Apply initialType when modal opens (Reservation page)
  let wasOpen = false;
  function prefillFromInitial(raw: any) {
    console.log('[ReservationFormModal] Prefill called with', raw);
    // Build default then apply values from raw
    const base = getDefaultFormData();
    base.buddies = [];
    const resType: string = raw?.res_type || "pool";
    const resDate: string = raw?.res_date || raw?.date || base.date;
    base.date = (resDate || "").split("T")[0] || base.date;

    if (resType === "open_water") {
      base.type = "openwater";
      const ow = raw?.res_openwater || {};
      const tp = (ow.time_period || raw?.time_period || "AM").toUpperCase();
      base.timeOfDay = tp === "PM" ? "PM" : "AM";
      base.depth =
        typeof ow.depth_m === "number" && !Number.isNaN(ow.depth_m)
          ? String(ow.depth_m)
          : "";
      base.openWaterType = ow.open_water_type || "";
      base.studentCount =
        ow.student_count != null ? String(ow.student_count) : "";
      base.notes = ow.note || raw?.note || "";
      base.pulley = !!ow.pulley;
      base.deepFimTraining = !!ow.deep_fim_training;
      base.bottomPlate = !!ow.bottom_plate;
      base.largeBuoy = !!ow.large_buoy;
      base.startTime = "";
      base.endTime = "";
    } else if (resType === "pool") {
      base.type = "pool";
      const pool = raw?.res_pool || {};
      base.startTime = toHHMM(pool.start_time || raw?.start_time || base.startTime);
      base.endTime = toHHMM(pool.end_time || raw?.end_time || base.endTime);
      base.poolType = pool.pool_type || "";
      base.notes = pool.note || raw?.note || "";
      base.studentCount =
        pool.student_count != null ? String(pool.student_count) : "";
    } else if (resType === "classroom") {
      base.type = "classroom";
      const classroom = raw?.res_classroom || {};
      base.startTime = toHHMM(classroom.start_time || raw?.start_time || base.startTime);
      base.endTime = toHHMM(classroom.end_time || raw?.end_time || base.endTime);
      base.classroomType = classroom.classroom_type || "";
      base.notes = classroom.note || raw?.note || "";
      base.studentCount =
        classroom.student_count != null ? String(classroom.student_count) : "";
    }
    return base;
  }
  $: if (isOpen && !wasOpen) {
    wasOpen = true;
    if (editing && initialReservation) {
      // Prefill form from existing reservation when editing
      const base = prefillFromInitial(initialReservation);
      formData = base;
      console.log('[ReservationFormModal] Prefilled on open', formData);
    } else if (initialType && formData.type !== initialType) {
      formData.type = initialType;
      // Apply defaults for the selected type (times, date)
      handleTypeChange();
      // Override default date with caller-provided date when creating a new reservation
      if (initialDate) {
        formData.date = initialDate;
      }
    } else if (!editing && initialDate) {
      // When opening in create mode without changing type, still honor initialDate
      formData.date = initialDate;
    }
  }
  $: if (!isOpen && wasOpen) {
    wasOpen = false;
  }

  // Also prefill if editing payload changes while modal is already open
  $: if (isOpen && editing && initialReservation) {
    // If the current formData does not match the incoming identifiers, rehydrate
    const wantsType = (initialReservation?.res_type === 'open_water') ? 'openwater'
      : (initialReservation?.res_type === 'classroom') ? 'classroom' : 'pool';
    const sameType = formData.type === wantsType;
    const sameDate = !!formData.date && (formData.date === String((initialReservation?.res_date || '')).split('T')[0]);
    if (!sameType || !sameDate) {
      const base = prefillFromInitial(initialReservation);
      formData = base;
      console.log('[ReservationFormModal] Prefilled on change', formData);
    }
  }

  // Handle validation changes from child components
  const handleValidationChange = (event: CustomEvent) => {
    // If no specific errors are provided, trigger full form validation
    if (event.detail.errors && Object.keys(event.detail.errors).length === 0) {
      const { errors: validationErrors } = validateForm(formData);
      errors = validationErrors;
    } else {
      // Merge specific errors from child components
      errors = { ...errors, ...event.detail.errors };
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeModal();
    }
  };
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div
    class="modal-overlay"
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === "Escape" && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-label={modalTitle}
    tabindex="-1"
  >
    <div class="modal-content" bind:this={modalEl}>
      <FormModalHeader title={modalTitle} on:close={closeModal} />

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

        <!-- Cut-off Warning -->
        {#if currentReservationDate && currentResType}
          <CutoffWarning
            reservationDate={currentReservationDate}
            resType={currentResType}
            startTime={formData.startTime}
          />
        {/if}

        <div class="form-grid">
          <!-- Basic Fields: Date and Type -->
          <FormBasicFields
            bind:formData
            {errors}
            on:typeChange={handleTypeChange}
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

          <!-- Open Water specific fields -->
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

          <!-- Time fields for Pool and Classroom -->
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

        <!-- Equipment Options: Open Water only -->
        {#if formData.type === "openwater"}
          <EquipmentOptions bind:formData />
        {/if}

        <!-- Buddy Selection (hidden for Course/Coaching across types) -->
        {#if !(
          (formData.type === "openwater" && formData.openWaterType === "course_coaching") ||
          (formData.type === "pool" && formData.poolType === "course_coaching") ||
          (formData.type === "classroom" && formData.classroomType === "course_coaching")
        )}
          <BuddySelection
            bind:formData
            {editing}
            {initialReservation}
            {errors}
            {submitAttempted}
          />
        {/if}

        <!-- Notes -->
        <FormNotes bind:formData />

        {#if capacityBlocked && capacityMessage}
          <div class="alert alert-warning my-2 text-sm">
            <span>{capacityMessage}. Your request can still be submitted and will require admin approval.</span>
          </div>
        {/if}
        <!-- Actions -->
        <FormActions
          {loading}
          isCutoffPassed={isCutoffPassed ||
            isBlocked ||
            noLaneError ||
            noRoomError}
          {editing}
          on:close={closeModal}
        />
      </form>
    </div>
  </div>
{/if}

<!-- Global toast for error notifications (capacity/submit) -->
<Toast type="error" bind:open={toastOpen} message={toastMessage} />

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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

  /* Mobile Responsive */
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
