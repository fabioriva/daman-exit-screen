<script>
  const { value } = $props();
</script>

<div
  class="display-cell flex items-center justify-center rounded-xl border font-semibold tabular-nums {value !==
  0
    ? 'motion-safe:animate-pulse border-emerald-600 bg-emerald-800 text-white'
    : 'border-neutral-800 bg-neutral-900 text-transparent'}"
>
  {value}
</div>

<style>
  .display-cell {
    min-width: 0;
    min-height: 0;
    font-size: var(--exit-font-size);
    line-height: 1;
  }
</style>
