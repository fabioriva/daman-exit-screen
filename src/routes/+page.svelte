<script>
  import { onMount } from "svelte";
  import { Eu, Label, Queue } from "$lib";
  import { getPlcStatus, isPlcSnapshot } from "$lib/plc-status.js";
  /** @type {{ data: number[], online: boolean, lastUpdated: number | null }} */
  let plc = $state({ data: Array(40).fill(0), online: false, lastUpdated: null });
  /** @type {boolean | null} */
  let apiAvailable = $state(null);
  let now = $state(Date.now());
  const status = $derived(getPlcStatus(plc, apiAvailable, now));
  const messages = {
    waiting: "Waiting for PLC data",
    "api-unavailable": "API unavailable — displayed data is not current",
    "plc-offline": "PLC disconnected — displayed data is not current",
    stale: "PLC data is stale — displayed data is not current",
    online: "PLC connected",
  };
  onMount(() => {
    let stopped = false;
    let pending = false;
    /** @type {AbortController | undefined} */
    let controller;
    async function fetchData() {
      if (pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 4000);
      try {
        const res = await fetch("/api", { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("API request failed");
        const snapshot = await res.json();
        if (!isPlcSnapshot(snapshot)) throw new Error("Invalid PLC data");
        if (!stopped) {
          plc = snapshot;
          apiAvailable = true;
          now = Date.now();
        }
      } catch {
        if (!stopped) apiAvailable = false;
      } finally {
        clearTimeout(timeout);
        pending = false;
      }
    }
    const interval = setInterval(fetchData, 1500);
    const clock = setInterval(() => { now = Date.now(); }, 500);
    fetchData();
    return () => {
      stopped = true;
      clearInterval(interval);
      clearInterval(clock);
      controller?.abort();
    };
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
  class="screen bg-neutral-900 grid h-dvh grid-cols-7 grid-rows-[auto_minmax(0,1fr)] gap-3 p-3 text-6xl text-neutral-100"
>
  <div class="connection-status col-span-7" class:healthy={status === "online"} role="status" aria-live="polite">
    <strong>{messages[status]}</strong>
    <span>Last valid read: {plc.lastUpdated === null ? "none" : new Date(plc.lastUpdated).toLocaleTimeString()}</span>
  </div>
  <div class="grid gap-3" class:readings-stale={status !== "online"}>
    <Label value={"Queue N"}></Label>
    {#each plc.data.slice(10, 20) as tag}
      <Queue value={tag}></Queue>
    {/each}
  </div>
  <div class="grid gap-3 col-span-5" class:readings-stale={status !== "online"}>
    <div class="grid grid-cols-5 gap-3">
      <h1
        class="flex items-center justify-center rounded-xl col-span-5 font-bold text-yellow-500 text-7xl"
      >
        AVS Exit Monitoring System
      </h1>
      {#each labels.slice(0, 5) as label}
        <Label value={label}></Label>
      {/each}
      {#each plc.data.slice(0, 10) as tag}
        <Eu value={tag}></Eu>
      {/each}
      <div class="col-span-5 h-16"></div>
      {#each plc.data.slice(20, 30) as tag}
        <Eu value={tag}></Eu>
      {/each}
      {#each labels.slice(5, 10) as label}
        <Label value={label}></Label>
      {/each}
    </div>
  </div>
  <div class="grid gap-3" class:readings-stale={status !== "online"}>
    <Label value={"Queue S"}></Label>
    {#each plc.data.slice(30, 40) as tag}
      <Queue value={tag}></Queue>
    {/each}
  </div>
</div>

<style>
  .connection-status {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem 1.5rem;
    padding: 0.75rem 1rem;
    border: 2px solid #f59e0b;
    border-radius: 0.75rem;
    background: #451a03;
    color: #fef3c7;
    font-size: clamp(1rem, 1.5vw, 1.75rem);
  }
  .connection-status.healthy {
    border-color: #15803d;
    background: #052e16;
    color: #dcfce7;
  }
  .readings-stale {
    filter: grayscale(1);
    opacity: 0.6;
  }
  .readings-stale :global(.animate-pulse) {
    animation: none;
  }
  .screen {
    cursor: none;
    font-family: "Roboto", sans-serif;
  }
</style>
