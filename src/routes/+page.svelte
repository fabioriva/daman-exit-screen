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
  class="screen bg-neutral-950 grid text-neutral-100"
>
  <div class="connection-status col-span-7" class:healthy={status === "online"} role="status" aria-live="polite">
    <strong>{messages[status]}</strong>
    <span class="tabular-nums">Last valid read: {plc.lastUpdated === null ? "none" : new Date(plc.lastUpdated).toLocaleTimeString()}</span>
  </div>
  <div class="queue-column" class:readings-stale={status !== "online"}>
    <Label value={"Queue S"}></Label>
    {#each plc.data.slice(30, 40) as tag}
      <Queue value={tag}></Queue>
    {/each}
  </div>
  <div class="exit-column col-span-5" class:readings-stale={status !== "online"}>
    <div class="exit-grid">
      <header class="dashboard-heading flex flex-col items-center justify-center rounded-xl col-span-5 text-center">
        <p class="company-name font-semibold tracking-widest text-neutral-400">SOTEFIN SA</p>
        <h1 class="dashboard-title font-semibold text-neutral-100">
          AVS Exit Monitoring System
        </h1>
      </header>
      {#each labels.slice(0, 5) as label}
        <Label value={label}></Label>
      {/each}
      {#each plc.data.slice(0, 10) as tag}
        <Eu value={tag}></Eu>
      {/each}
      {#each labels.slice(5, 10) as label}
        <Label value={label}></Label>
      {/each}
      {#each plc.data.slice(20, 30) as tag}
        <Eu value={tag}></Eu>
      {/each}
    </div>
  </div>
  <div class="queue-column" class:readings-stale={status !== "online"}>
    <Label value={"Queue N"}></Label>
    {#each plc.data.slice(10, 20) as tag}
      <Queue value={tag}></Queue>
    {/each}
  </div>
</div>

<style>
  .screen {
    --screen-gap: min(0.8vw, 1dvh);
    --exit-font-size: min(3.25vw, 9dvh);
    --queue-font-size: min(3vw, 5dvh);
    --label-font-size: min(3vw, 5dvh);
    width: 100%;
    height: 100dvh;
    box-sizing: border-box;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-template-rows: auto minmax(0, 1fr);
    gap: var(--screen-gap);
    padding: var(--screen-gap);
    overflow: hidden;
    cursor: none;
    font-family: "Roboto", sans-serif;
  }
  .queue-column,
  .exit-column,
  .exit-grid {
    display: grid;
    min-width: 0;
    min-height: 0;
    gap: var(--screen-gap);
  }
  .queue-column {
    grid-template-rows: repeat(11, minmax(0, 1fr));
  }
  .exit-column {
    grid-template-rows: minmax(0, 1fr);
  }
  .exit-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1.15fr) minmax(0, 0.65fr)
      repeat(2, minmax(0, 1fr)) minmax(0, 0.65fr) repeat(2, minmax(0, 1fr));
  }
  .dashboard-heading {
    min-width: 0;
    min-height: 0;
    gap: min(0.4vw, 0.75dvh);
    line-height: 1.1;
  }
  .company-name {
    font-size: min(1.5vw, 2.5dvh);
  }
  .dashboard-title {
    font-size: min(3vw, 5dvh);
    white-space: nowrap;
  }
  .connection-status {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5dvh 1.5vw;
    padding: 0.75dvh 0.8vw;
    border: 2px solid #f59e0b;
    border-radius: 0.75rem;
    background: #451a03;
    color: #fef3c7;
    min-width: 0;
    font-size: min(1.4vw, 2.2dvh);
    line-height: 1.25;
  }
  .connection-status.healthy {
    border-color: #404040;
    background: #171717;
    color: #d4d4d4;
  }
  .connection-status strong {
    display: flex;
    align-items: center;
    gap: 0.6vw;
    font-weight: 600;
  }
  .connection-status strong::before {
    content: "";
    width: 0.6em;
    height: 0.6em;
    flex-shrink: 0;
    border-radius: 50%;
    background: #fbbf24;
  }
  .connection-status.healthy strong::before {
    background: #34d399;
  }
  .readings-stale {
    filter: grayscale(1);
    opacity: 0.6;
  }
  .readings-stale :global(.display-cell) {
    animation: none;
  }
</style>
