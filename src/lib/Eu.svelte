<script>
  const { value } = $props();
</script>

<div
  class="flex items-center justify-center rounded-lg font-bold text-7xl {value !==
  0
    ? 'animate-pulse bg-green-700 text-green-100'
    : 'bg-neutral-950 text-neutral-950'}"
>
  {value}
</div>
