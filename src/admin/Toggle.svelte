<script>
  let { checked = false, onchange } = $props()
</script>

<button type="button" class="tog" class:on={checked} role="switch" aria-checked={checked} onclick={() => onchange(!checked)}>
  <span></span>
</button>

<style>
  .tog {
    width: 42px; height: 24px; border-radius: 999px; border: 1px solid var(--line);
    background: var(--card-2); position: relative; cursor: pointer; padding: 0; flex: 0 0 auto;
  }
  .tog span {
    position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
    background: var(--txt-mute); transition: 0.16s;
  }
  .tog.on { background: linear-gradient(135deg, var(--teal), var(--blue)); border-color: transparent; }
  .tog.on span { left: 22px; background: #fff; }
</style>
