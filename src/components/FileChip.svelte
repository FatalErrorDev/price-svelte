<script>
  let { name, onremove } = $props();
</script>

<div class="file-chip">
  <span>{name}</span>
  <button class="remove" title="Remove" onclick={(e) => { e.stopPropagation(); onremove(); }}>&times;</button>
</div>
