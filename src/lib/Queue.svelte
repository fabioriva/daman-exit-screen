<script>
  const { value } = $props();
</script>

<div
  class="flex items-center justify-center rounded-lg font-bold {value !== 0
    ? 'bg-yellow-700 text-yellow-100'
    : 'bg-neutral-950 text-neutral-950'}"
>
  {value}
</div>
