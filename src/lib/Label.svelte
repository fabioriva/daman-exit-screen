<script>
  const { value } = $props();
</script>

<div
  class="display-label flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/70 font-medium text-neutral-200 capitalize"
>
  {value}
</div>

<style>
  .display-label {
    min-width: 0;
    min-height: 0;
    font-size: var(--label-font-size);
    line-height: 1;
    white-space: nowrap;
  }
</style>
