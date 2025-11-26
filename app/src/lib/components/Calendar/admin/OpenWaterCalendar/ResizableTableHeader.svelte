<script lang="ts">
  export let columnType: "buoy" | "boat" | "divers";
  export let onMouseDown: (event: MouseEvent, column: string) => void;

  const getColumnConfig = (type: string) => {
    switch (type) {
      case "buoy":
        return {
          class: "resizable-header w-20 flex-shrink-0",
          icon: "M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z",
          label: "BUOY",
        };
      case "boat":
        return {
          class: "resizable-header w-20 flex-shrink-0",
          icon: "M2 18H4V16H2V18M4 20H6V18H4V20M6 18H8V16H6V18M8 20H10V18H8V20M10 18H12V16H10V18M12 20H14V18H12V20M14 18H16V16H14V18M16 20H18V18H16V20M18 18H20V16H18V18M20 20H22V18H20V20M2 14H4V12H2V14M4 16H6V14H4V16M6 14H8V12H6V14M8 16H10V14H8V16M10 14H12V12H10V14M12 16H14V14H12V16M14 14H16V12H14V14M16 16H18V14H16V16M18 14H20V12H18V14M20 16H22V14H20V16M2 10H4V8H2V10M4 12H6V10H4V12M6 10H8V8H6V10M8 12H10V10H8V12M10 10H12V8H10V10M12 12H14V10H12V12M14 10H16V8H14V10M16 12H18V10H16V12M18 10H20V8H18V10M20 12H22V10H20V12M2 6H4V4H2V6M4 8H6V6H4V8M6 6H8V4H6V6M8 8H10V6H8V8M10 6H12V4H10V6M12 8H14V6H12V8M14 6H16V4H14V6M16 8H18V6H16V8M18 6H20V4H18V6M20 8H22V6H20V8Z",
          label: "BOAT",
        };
      case "divers":
        return {
          class: "resizable-header w-auto min-w-48 flex-grow",
          icon: "M16 4C18.2 4 20 5.8 20 8S18.2 12 16 12 12 10.2 12 8 13.8 4 16 4M16 13C18.67 13 24 14.33 24 17V20H8V17C8 14.33 13.33 13 16 13M8 12C10.2 12 12 10.2 12 8S10.2 4 8 4 4 5.8 4 8 5.8 12 8 12M8 13C5.33 13 0 14.33 0 17V20H6V17C6 15.9 6.45 14.9 7.2 14.1C5.73 13.4 4.8 13 8 13Z",
          label: "DIVERS",
        };
      default:
        return {
          class: "resizable-header w-auto min-w-32 flex-shrink-0",
          icon: "",
          label: "COLUMN",
        };
    }
  };

  $: config = getColumnConfig(columnType);
</script>

<div
  class="{config.class} flex-shrink-0 border-r border-base-300 last:border-r-0"
  data-column={columnType}
  on:mousedown={(e) => onMouseDown(e, columnType)}
  role="columnheader"
  tabindex="0"
>
  <div
    class="flex items-center justify-center w-full h-full px-4 py-3 relative"
  >
    <span class="font-semibold text-primary">{config.label}</span>
    <div
      class="resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50"
    ></div>
  </div>
</div>
