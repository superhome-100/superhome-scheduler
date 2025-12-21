<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { authStore } from "$lib/stores/auth";
    import dayjs from "dayjs";
    import {
        getBuddyNicknamesForReservation,
        getBuddyGroupMembersForSlotWithIds,
        type BuddyWithId,
    } from "$lib/services/openWaterService";

    export let formData: any;
    export let editing: boolean = false;
    export let initialReservation: any = null;
    export let errors: Record<string, string> = {};
    export let submitAttempted: boolean = false;
    export let initialBuddyIds: string[] = [];

    let searchQuery = "";
    let searchResults: any[] = [];
    let selectedBuddies: any[] = [];
    let searching = false;
    let showResults = false;
    let prefilling = false;

    // Dynamic buddy limit rules:
    // - Pool Autonomous: 1 buddy (2 pax total)
    // - Open Water Autonomous types: up to 3 buddies (4 pax total)
    // - Others: 2 buddies
    let maxBuddies = 2;
    $: maxBuddies = (() => {
        if (formData?.type === "pool" && formData?.poolType === "autonomous")
            return 1;
        if (formData?.type === "openwater") {
            const t = formData?.openWaterType;
            // Treat any non-course/coaching OW type as autonomous for buddy cap purposes
            if (t && t !== "course_coaching") return 3;
        }
        return 2;
    })();

    // Debounce search
    let searchTimeout: NodeJS.Timeout;

    $: if (searchQuery.trim().length >= 2) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchUsers();
        }, 300);
    } else {
        searchResults = [];
        showResults = false;
    }

    async function searchUsers() {
        if (searchQuery.trim().length < 2) return;

        searching = true;
        try {
            const { data, error } = await supabase
                .from("user_profiles")
                .select("uid, name, nickname")
                .or(
                    `name.ilike.%${searchQuery}%,nickname.ilike.%${searchQuery}%`,
                )
                .neq("uid", $authStore.user?.id) // Exclude current user
                .neq("status", "disabled") // Only active users
                .limit(10);

            if (error) throw error;

            // Filter out already selected buddies
            const selectedIds = selectedBuddies.map((b) => b.uid);
            searchResults = (data || []).filter(
                (u) => !selectedIds.includes(u.uid),
            );
            showResults = true;
        } catch (error) {
            console.error("Error searching users:", error);
            searchResults = [];
        } finally {
            searching = false;
        }
    }

    function selectBuddy(user: any) {
        if (selectedBuddies.length >= maxBuddies) {
            const msg = `You can only add up to ${maxBuddies} buddy${maxBuddies === 1 ? "" : "ies"}`;
            alert(msg);
            return;
        }

        selectedBuddies = [...selectedBuddies, user];
        formData.buddies = selectedBuddies.map((b) => b.uid);
        searchQuery = "";
        searchResults = [];
        showResults = false;
    }

    function removeBuddy(uid: string) {
        selectedBuddies = selectedBuddies.filter((b) => b.uid !== uid);
        formData.buddies = selectedBuddies.map((b) => b.uid);
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest(".buddy-search-container")) {
            showResults = false;
        }
    }

    async function prefillExistingBuddies() {
        if (prefilling) return;
        if (!editing) return;

        // Check if type supports buddies
        const isOW = formData?.type === "openwater";
        const isPoolAuto =
            formData?.type === "pool" && formData?.poolType === "autonomous";

        if (!isOW && !isPoolAuto) return;

        // Avoid overwriting if user already changed selection
        if (Array.isArray(formData?.buddies) && formData.buddies.length > 0)
            return;
        if (selectedBuddies.length > 0) return;

        const uid = $authStore.user?.id;
        if (!uid) return;

        prefilling = true;
        try {
            let buddies: BuddyWithId[] = [];

            // 1. Try fetching by Reservation ID first (most accurate)
            const resId =
                initialReservation?.reservation_id ?? initialReservation?.id;
            if (resId) {
                buddies = await getBuddyNicknamesForReservation(Number(resId));
                // Filter out self just in case
                buddies = buddies.filter((b) => b.uid !== uid);

                if (buddies.length > 0) {
                    // Filter duplicates and map
                    selectedBuddies = buddies.map((b) => ({
                        uid: b.uid,
                        name: b.name,
                        nickname: null, // Service doesn't return nickname separately sadly, but name is enough
                    }));
                    formData.buddies = selectedBuddies.map((b) => b.uid);
                    initialBuddyIds = [...formData.buddies];
                    return;
                }
            }

            // 2. Fallback: Fetch by Time Slot (Group lookup)
            const resDateRaw =
                (initialReservation?.res_date as string | undefined) ||
                (initialReservation?.date as string | undefined) ||
                (formData?.date as string | undefined);

            if (!resDateRaw) return;

            let timePeriod: "AM" | "PM" | undefined;
            let resTypeForService: "open_water" | "pool" | undefined;

            if (isOW) {
                resTypeForService = "open_water";
                timePeriod =
                    (initialReservation?.res_openwater?.time_period as
                        | "AM"
                        | "PM"
                        | undefined) ||
                    (initialReservation?.time_period as
                        | "AM"
                        | "PM"
                        | undefined) ||
                    (formData?.timeOfDay as "AM" | "PM" | undefined);
            } else if (isPoolAuto) {
                resTypeForService = "pool";
                // Determine PM/AM from start time
                const startTime =
                    (initialReservation?.res_pool?.start_time as string) ||
                    (initialReservation?.start_time as string) ||
                    (formData?.startTime as string);

                if (startTime) {
                    let parsed = dayjs(startTime, ["HH:mm", "HH:mm:ss"], true);
                    if (!parsed.isValid())
                        parsed = dayjs(`2000-01-01T${startTime}`); // simplified parse
                    if (parsed.isValid()) {
                        timePeriod = parsed.hour() < 12 ? "AM" : "PM";
                    }
                }
            }

            if (resDateRaw && timePeriod && resTypeForService) {
                const groupBuddies = await getBuddyGroupMembersForSlotWithIds(
                    String(resDateRaw),
                    timePeriod,
                    resTypeForService,
                    uid,
                );

                if (groupBuddies && groupBuddies.length > 0) {
                    selectedBuddies = groupBuddies.map((b) => ({
                        uid: b.uid,
                        name: b.name,
                        nickname: null,
                    }));
                    formData.buddies = selectedBuddies.map((b) => b.uid);
                    initialBuddyIds = [...formData.buddies];
                }
            }
        } catch (e) {
            console.warn("[BuddySelection] Failed to prefill buddies", e);
        } finally {
            prefilling = false;
        }
    }

    // Attempt prefill when modal opens with edit data or when edit fields change
    $: if (editing && initialReservation) {
        // React when inputs relevant to prefill are available
        // We use a timeout to let formData stabilize if it's being set reactively elsewhere
        setTimeout(() => prefillExistingBuddies(), 0);
    }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="buddy-section">
    <h3 class="section-title">
        Add Buddies <span class="optional">(Optional)</span>
    </h3>

    <!-- Selected Buddies -->
    {#if selectedBuddies.length > 0}
        <div class="selected-buddies">
            {#each selectedBuddies as buddy}
                <div class="buddy-chip">
                    <span class="buddy-name">
                        {buddy.name || buddy.nickname || "Unknown"}
                        {#if buddy.nickname && buddy.name}
                            <span class="buddy-nickname"
                                >({buddy.nickname})</span
                            >
                        {/if}
                    </span>
                    <button
                        type="button"
                        class="remove-btn"
                        on:click={() => removeBuddy(buddy.uid)}
                        aria-label="Remove buddy"
                    >
                        ×
                    </button>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Search Box -->
    {#if selectedBuddies.length < maxBuddies}
        <div class="buddy-search-container">
            <div class="search-input-wrapper">
                <svg
                    class="search-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                <input
                    type="text"
                    class="search-input"
                    placeholder="Search by name or nickname..."
                    bind:value={searchQuery}
                    on:focus={() => searchQuery && (showResults = true)}
                />
                {#if searching}
                    <div class="loading-spinner"></div>
                {/if}
            </div>

            <!-- Search Results -->
            {#if showResults && searchResults.length > 0}
                <div class="search-results">
                    {#each searchResults as user}
                        <button
                            type="button"
                            class="result-item"
                            on:click={() => selectBuddy(user)}
                        >
                            <span class="result-name"
                                >{user.name || user.nickname || "Unknown"}</span
                            >
                            {#if user.nickname && user.name}
                                <span class="result-nickname"
                                    >({user.nickname})</span
                                >
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}

            {#if showResults && searchResults.length === 0 && searchQuery.length >= 2 && !searching}
                <div class="no-results">No users found</div>
            {/if}
        </div>

        <p class="helper-text">
            {#if selectedBuddies.length === 0}
                Add up to {maxBuddies} dive buddy{maxBuddies === 1 ? "" : "ies"}
                to this reservation
            {:else}
                You can add {maxBuddies - selectedBuddies.length} more buddy{maxBuddies -
                    selectedBuddies.length ===
                1
                    ? ""
                    : "ies"}
            {/if}
        </p>

        {#if submitAttempted && selectedBuddies.length < maxBuddies && errors && errors.buddies}
            <p class="buddy-error">{errors.buddies}</p>
        {/if}
    {/if}
</div>

<style>
    .buddy-section {
        margin-bottom: 1.5rem;
    }

    .section-title {
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #e2e8f0;
    }

    .optional {
        font-size: 0.75rem;
        font-weight: 400;
        color: #9ca3af;
    }

    .selected-buddies {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .buddy-chip {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: #eff6ff;
        border: 1px solid #3b82f6;
        border-radius: 20px;
        font-size: 0.875rem;
        color: #1e40af;
    }

    .buddy-name {
        font-weight: 500;
    }

    .buddy-nickname {
        font-weight: 400;
        color: #6b7280;
    }

    .remove-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: transparent;
        border: none;
        color: #1e40af;
        font-size: 1.25rem;
        line-height: 1;
        cursor: pointer;
        transition: color 0.2s;
        padding: 0;
    }

    .remove-btn:hover {
        color: #dc2626;
    }

    .buddy-search-container {
        position: relative;
    }

    .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }

    .search-icon {
        position: absolute;
        left: 0.75rem;
        width: 20px;
        height: 20px;
        color: #9ca3af;
        pointer-events: none;
    }

    .search-input {
        width: 100%;
        padding: 0.75rem 2.75rem 0.75rem 2.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 0.875rem;
        transition: all 0.2s;
    }

    .search-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .loading-spinner {
        position: absolute;
        right: 0.75rem;
        width: 16px;
        height: 16px;
        border: 2px solid #e2e8f0;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .search-results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 0.25rem;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        max-height: 200px;
        overflow-y: auto;
        z-index: 10;
    }

    .result-item {
        width: 100%;
        padding: 0.75rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: white;
        border: none;
        text-align: left;
        cursor: pointer;
        transition: background 0.2s;
    }

    .result-item:hover {
        background: #f3f4f6;
    }

    .result-item:not(:last-child) {
        border-bottom: 1px solid #f3f4f6;
    }

    .result-name {
        font-size: 0.875rem;
        color: #374151;
        font-weight: 500;
    }

    .result-nickname {
        font-size: 0.75rem;
        color: #9ca3af;
    }

    .no-results {
        padding: 1rem;
        text-align: center;
        font-size: 0.875rem;
        color: #9ca3af;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        margin-top: 0.25rem;
    }

    .helper-text {
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #6b7280;
    }

    .buddy-error {
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #ef4444;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
        .search-results {
            max-height: 150px;
        }

        .buddy-chip {
            font-size: 0.8125rem;
            padding: 0.4rem 0.6rem;
        }
    }
</style>
