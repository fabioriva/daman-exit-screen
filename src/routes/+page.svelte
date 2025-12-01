<script>
  import { onMount } from "svelte";
  let plc = $state({ data: [] });
  onMount(() => {
    async function fetchData() {
      const res = await fetch("/api");
      plc = await res.json();
    }
    const interval = setInterval(fetchData, 1500);
    fetchData();
    return () => clearInterval(interval);
  });
  $effect(() => {
    $inspect(plc);
  });
  let labels = [
    "exit 1",
    "exit 2",
    "exit 3",
    "exit 4",
    "exit 5",
    "exit 6",
    "exit 7",
    "exit 8",
    "exit 9",
    "exit 10",
  ];
</script>

<div
  class="screen bg-neutral-900 grid h-dvh grid-cols-7 gap-3 p-3 text-4xl text-6xl text-neutral-100"
>
  <div class="grid gap-3">
    <div class="flex items-center justify-center rounded-xl">North</div>
    {#each plc.data.slice(0, 10) as tag}
      <div
        class="flex items-center justify-center rounded-xl bg-neutral-950 {tag ===
          0 && 'text-neutral-950'}"
      >
        {tag}
      </div>
    {/each}
  </div>
  <div class="grid gap-3 col-span-5">
    <div class="grid grid-cols-5 gap-3">
      <h1
        class="flex items-center justify-center rounded-xl col-span-5 text-orange-500"
      >
        AVS Exit Monitoring System
      </h1>
      {#each labels.slice(0, 5) as label}
        <div class="flex items-center justify-center rounded-xl capitalize">
          {label}
        </div>
      {/each}
      {#each plc.data.slice(0, 10) as tag}
        <div
          class="flex items-center justify-center rounded-xl bg-neutral-950 {tag ===
            0 && 'text-neutral-950'}"
        >
          {tag}
        </div>
      {/each}
      <div class="col-span-5 h-16"></div>
      {#each plc.data.slice(0, 10) as tag}
        <div
          class="flex items-center justify-center rounded-xl bg-neutral-950 {tag ===
            0 && 'text-neutral-950'}"
        >
          {tag}
        </div>
      {/each}
      {#each labels.slice(5, 10) as label}
        <div class="flex items-center justify-center rounded-xl capitalize">
          {label}
        </div>
      {/each}
    </div>
  </div>
  <div class="grid gap-3">
    <div class="flex items-center justify-center rounded-xl">South</div>
    {#each plc.data.slice(10, 20) as tag}
      <div
        class="flex items-center justify-center rounded-xl bg-neutral-950 {tag ===
          0 && 'text-neutral-950'}"
      >
        {tag}
      </div>
    {/each}
  </div>
</div>

<style>
  .screen {
    cursor: none;
    font-family: "Roboto", sans-serif;
  }
</style>
