<script>
  let { onfile } = $props();

  let dragover = $state(false);
  let hasFile = $state(false);
  let errorMsg = $state('');

  function handleDragover(e) {
    e.preventDefault();
    dragover = true;
  }

  function handleDragleave() {
    dragover = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    dragover = false;
    const file = e.dataTransfer.files[0];
    if (file) validateAndSet(file);
  }

  function handleClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx';
    input.onchange = () => {
      if (input.files[0]) validateAndSet(input.files[0]);
    };
    input.click();
  }

  function validateAndSet(file) {
    errorMsg = '';
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      errorMsg = 'Only .xlsx files are accepted.';
      return;
    }
    hasFile = true;
    onfile(file);
  }

  export function reset() {
    hasFile = false;
    errorMsg = '';
    dragover = false;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="drop-zone"
  class:dragover
  class:has-file={hasFile}
  ondragover={handleDragover}
  ondragleave={handleDragleave}
  ondrop={handleDrop}
  onclick={handleClick}
>
  Drop .xlsx file here or click to browse
</div>
{#if errorMsg}
  <div class="error-msg">{errorMsg}</div>
{/if}
