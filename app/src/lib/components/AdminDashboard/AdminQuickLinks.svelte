<script context="module" lang="ts">
  export type AdminSection = "pending" | "price" | "block" | "user_res";
</script>

<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";

  export let selected: AdminSection = "pending";

  const dispatch = createEventDispatcher<{
    select: { section: AdminSection };
  }>();

  const setSection = (section: AdminSection) => {
    if (selected === section) return;
    selected = section;
    // Update URL query param for deep-linking without navigation
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("section", section);
      window.history.replaceState({}, "", url.toString());
    }
    dispatch("select", { section });
  };
</script>

<!-- Compact, mobile-first button group -->
<div class="flex justify-center mb-4 sm:mb-6 flex-wrap gap-3 sm:gap-4 px-4">
  <div class="btn-group">
    <button
      type="button"
      title="Pending Reservation Requests"
      class="btn btn-sm btn-neutral {selected === 'pending'
        ? 'btn-active'
        : ''}"
      aria-pressed={selected === "pending"}
      on:click={() => setSection("pending")}
    >
      Pending Requests
    </button>
    <button
      type="button"
      title="Price Template"
      class="btn btn-sm btn-neutral {selected === 'price' ? 'btn-active' : ''}"
      aria-pressed={selected === "price"}
      on:click={() => setSection("price")}
    >
      Price Template
    </button>
    <button
      type="button"
      title="Block Reservation"
      class="btn btn-sm btn-neutral {selected === 'block' ? 'btn-active' : ''}"
      aria-pressed={selected === "block"}
      on:click={() => setSection("block")}
    >
      Block Reservation
    </button>
    <button
      type="button"
      title="User Reservations"
      class="btn btn-sm btn-neutral {selected === 'user_res'
        ? 'btn-active'
        : ''}"
      aria-pressed={selected === "user_res"}
      on:click={() => setSection("user_res")}
    >
      User Reservations
    </button>
  </div>
</div>

<style>
  /* Keep CSS minimal and separated; rely on Tailwind + DaisyUI for most styling */
</style>
