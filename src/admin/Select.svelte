<script>
  let { value = null, options = [], placeholder = '—', onchange, searchable = false, disabled = false } = $props()

  let open = $state(false)
  let root
  let q = $state('') // szűrő hosszú listákhoz (kerület: 175, utca: ~250 elem)

  const current = $derived(options.find((o) => o.value === value))
  // ékezet-független szűrés („szel" → „Széll"); ez admin-only kód, a normalize() itt biztonságos
  const fold = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const shown = $derived(
    searchable && q.trim() ? options.filter((o) => fold(o.label).includes(fold(q.trim()))) : options,
  )

  function pick(v) {
    onchange(v)
    open = false
    q = ''
  }
  function onDoc(e) {
    if (root && !root.contains(e.target)) open = false
  }
  $effect(() => {
    if (open) {
      window.addEventListener('pointerdown', onDoc)
      return () => window.removeEventListener('pointerdown', onDoc)
    }
  })
</script>

<div class="sel" bind:this={root}>
  <button type="button" class="trigger" class:open {disabled} onclick={() => (open = !open)}>
    <span class:ph={!current}>{current?.label ?? placeholder}</span>
    <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
  </button>
  {#if open}
    <div class="menu">
      {#if searchable}
        <!-- svelte-ignore a11y_autofocus -->
        <input class="q" placeholder="Keresés…" value={q} autofocus oninput={(e) => (q = e.target.value)} />
      {/if}
      {#each shown as o}
        <button type="button" class="opt" class:on={o.value === value} onclick={() => pick(o.value)}>
          {o.label}
        </button>
      {:else}
        <div class="none">Nincs találat</div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .sel { position: relative; width: 100%; }
  .trigger {
    width: 100%; height: 36px; display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 0 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--card-2);
    color: var(--txt); font: inherit; font-size: 13px; cursor: pointer;
  }
  .trigger:hover { border-color: #3a3a44; }
  .trigger:disabled { opacity: 0.55; cursor: default; }
  .trigger:disabled:hover { border-color: var(--line); }
  .trigger.open { border-color: var(--blue); box-shadow: 0 0 0 2px rgba(76, 141, 255, 0.2); }
  .trigger .ph { color: var(--txt-mute); }
  .caret { color: var(--txt-dim); flex: 0 0 auto; transition: transform 0.15s; }
  .trigger.open .caret { transform: rotate(180deg); }
  .menu {
    position: absolute; z-index: 40; top: calc(100% + 4px); left: 0; right: 0;
    max-height: 240px; overflow: auto; padding: 5px;
    background: #16161c; border: 1px solid var(--line); border-radius: 12px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
    display: flex; flex-direction: column; gap: 2px;
  }
  .opt {
    text-align: left; padding: 8px 10px; border-radius: 8px; border: none; background: transparent;
    color: var(--txt); font: inherit; font-size: 13px; cursor: pointer;
  }
  .opt:hover { background: #22222a; }
  .q {
    position: sticky; top: 0; z-index: 1; width: 100%; height: 32px; margin-bottom: 3px;
    border: 1px solid var(--line); border-radius: 8px; background: var(--card-2);
    color: var(--txt); padding: 0 9px; font: inherit; font-size: 12px;
  }
  .q:focus { outline: none; border-color: var(--blue); }
  .none { padding: 8px 10px; font-size: 12px; color: var(--txt-mute); }
  .opt.on { background: var(--blue-soft); color: #cfe0ff; }
</style>
