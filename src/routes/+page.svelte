<script>
  import { onMount } from "svelte";

  onMount(() => {
    async function fetchData() {
      const res = await fetch("/api");
      const json = await res.json();
      console.log(json);
    }

    const interval = setInterval(fetchData, 1500);
    fetchData();

    return () => clearInterval(interval);
  });

  let sh = new Array(10).fill(0);
  let el = new Array(10).fill(0);
  let ln = ["exit 1", "exit 2", "exit 3", "exit 4", "exit 5"];
  let ls = ["exit 6", "exit 7", "exit 8", "exit 9", "exit 10"];
</script>

<div
  class="screen bg-neutral-900 grid h-dvh grid-cols-7 gap-3 p-3 text-4xl text-6xl text-neutral-100"
>
  <div class="grid gap-3">
    <div class="flex items-center justify-center rounded-xl">North</div>
    {#each sh as s}
      <div
        class="flex items-center justify-center rounded-xl bg-neutral-950 {s ===
          0 && 'text-neutral-950'}"
      >
        {s}
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
      {#each ln as l}
        <div class="flex items-center justify-center rounded-xl capitalize">
          {l}
        </div>
      {/each}
      {#each el as e}
        <div
          class="flex items-center justify-center rounded-xl bg-neutral-950 {e ===
            0 && 'text-neutral-950'}"
        >
          {e}
        </div>
      {/each}
      <div class="col-span-5 h-16"></div>
      {#each el as e}
        <div
          class="flex items-center justify-center rounded-xl bg-neutral-950 {e ===
            0 && 'text-neutral-950'}"
        >
          {e}
        </div>
      {/each}
      {#each ls as l}
        <div class="flex items-center justify-center rounded-xl capitalize">
          {l}
        </div>
      {/each}
    </div>
  </div>
  <div class="grid gap-3">
    <div class="flex items-center justify-center rounded-xl">South</div>
    {#each sh as s}
      <div
        class="flex items-center justify-center rounded-xl bg-neutral-950 {s ===
          0 && 'text-neutral-950'}"
      >
        {s}
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
