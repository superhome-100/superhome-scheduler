<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let buoyGroup: any;

  const dispatch = createEventDispatcher();

  function handleGroupClick() {
    dispatch("groupClick", {
      groupId: buoyGroup.id,
      resDate: buoyGroup.res_date,
      timePeriod: buoyGroup.time_period,
    });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      handleGroupClick();
    }
  }
</script>

{#if buoyGroup.member_names?.length}
  <div
    class="bg-base-100 border border-gray-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 divers-group-box cursor-pointer"
    role="button"
    tabindex="0"
    aria-label="View group reservation details"
    on:click={handleGroupClick}
    on:keydown={handleKeyDown}
  >
    <!-- Debug Logging for Divers Group Box -->
    {console.log("🔍 DEBUG - Divers Group Box:", {
      groupId: buoyGroup.id,
      displayNames: buoyGroup.member_names,
      openWaterType: buoyGroup.open_water_type,
      boatCount: buoyGroup.boat_count,
      studentCount:
        buoyGroup.open_water_type === "course_coaching"
          ? Math.max((buoyGroup.boat_count ?? 1) - 1, 0)
          : "N/A",
      memberCount: buoyGroup.member_names?.length || 0,
      timePeriod: buoyGroup.time_period,
    })}
    <!-- Open Water Type Display Logic -->
    <div class="space-y-1 flex flex-col items-start w-full">
      <!-- Debug: Log the open_water_type value -->
      {console.log("🔍 DEBUG - open_water_type check:", {
        openWaterType: buoyGroup.open_water_type,
        type: typeof buoyGroup.open_water_type,
        length: buoyGroup.open_water_type?.length,
        isCourseCoaching: buoyGroup.open_water_type === "course_coaching",
        isAutonomousBuoy:
          buoyGroup.open_water_type?.trim() === "autonomous_buoy",
        isAutonomousPlatform:
          buoyGroup.open_water_type?.trim() === "autonomous_platform",
        isAutonomousPlatformCbs:
          buoyGroup.open_water_type?.trim() === "autonomous_platform_cbs",
        conditionMatch:
          buoyGroup.open_water_type?.trim() === "autonomous_buoy" ||
          buoyGroup.open_water_type?.trim() === "autonomous_platform" ||
          buoyGroup.open_water_type?.trim() === "autonomous_platform_cbs",
      })}
      {#if buoyGroup.open_water_type === "course_coaching"}
        <!-- Course/Coaching: Show Instructor Name + Number of students -->
        <div class="flex items-center gap-2 text-sm w-full">
          <div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
          <span class="font-medium text-gray-800">
            {buoyGroup.member_names?.find((x) => x && x.trim() !== "") ||
              "Unknown"} + {// For Course/Coaching, boat_count = 1 (instructor) + student_count
            // So student_count = boat_count - 1
            Math.max((buoyGroup.boat_count ?? 1) - 1, 0)}
          </span>
        </div>
      {:else if buoyGroup.open_water_type?.trim() === "autonomous_buoy" || buoyGroup.open_water_type?.trim() === "autonomous_platform" || buoyGroup.open_water_type?.trim() === "autonomous_platform_cbs"}
        <!-- Autonomous types: Show group member names stacked (max 3 per group) -->
        {#each buoyGroup.member_names.slice(0, 3) as n}
          <div class="flex items-center gap-2 text-sm w-full">
            <div class="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
            <span class="font-medium text-gray-800">{n || "Unknown"}</span>
          </div>
        {/each}
        {#if buoyGroup.member_names && buoyGroup.member_names.length > 3}
          <div class="flex items-center gap-2 text-sm w-full">
            <div class="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
            <span class="font-medium text-gray-600 text-xs"
              >+{buoyGroup.member_names.length - 3} more</span
            >
          </div>
        {/if}
      {:else}
        <!-- Fallback: Show all member names (legacy behavior) -->
        {#each buoyGroup.member_names as n}
          <div class="flex items-center gap-2 text-sm w-full">
            <div class="w-2 h-2 bg-gray-500 rounded-full flex-shrink-0"></div>
            <span class="font-medium text-gray-800">{n || "Unknown"}</span>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{:else}
  <div class="flex justify-center">
    <span class="text-sm text-base-content/70">No members</span>
  </div>
{/if}
