<script>
  const { value } = $props();
</script>

<div
  class="display-cell flex items-center justify-center rounded-xl border font-semibold tabular-nums {value !== 0
    ? 'border-amber-600 bg-amber-800 text-amber-50'
    : 'border-neutral-800 bg-neutral-900 text-transparent'}"
>
  {value}
</div>

<style>
  .display-cell {
    min-width: 0;
    min-height: 0;
    font-size: var(--queue-font-size);
    line-height: 1;
  }
</style>
