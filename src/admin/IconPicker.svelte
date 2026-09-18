<script>
  import { icon, PICK_GROUPS } from '../lib/icons.js'
  import { devices } from '../lib/stores.js'

  let { value = null, onchange } = $props()

  let open = $state(false)
  let root
  let q = $state('') // keresés a sok beépített ikon között

  // Csoportok szűrve: üres keresésnél minden, különben névrészlet-egyezés.
  const groups = $derived(
    (() => {
      const needle = q.trim().toLowerCase()
      if (!needle) return PICK_GROUPS
      return PICK_GROUPS.map((g) => ({ ...g, icons: g.icons.filter((n) => n.includes(needle)) })).filter(
        (g) => g.icons.length,
      )
    })(),
  )

  const homeyIcons = $derived(
    (() => {
      const seen = new Set()
      const out = []
      for (const d of Object.values($devices)) {
        if (d.iconUrl && !seen.has(d.iconUrl)) {
          seen.add(d.iconUrl)
          out.push({ url: d.iconUrl, name: d.name })
        }
      }
      return out
    })(),
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

<div class="ip" bind:this={root}>
  <button type="button" class="trigger" class:open onclick={() => (open = !open)}>
    <span class="prev">{@html icon(value ?? 'power', { w: 20, h: 20 })}</span>
    <span class="lbl">{value && (value.startsWith('http') || value.startsWith('/')) ? 'Homey ikon' : (value ?? 'power')}</span>
    <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
  </button>
  {#if open}
    <div class="menu">
      <input
        class="search"
        type="text"
        placeholder="Keresés (pl. lamp, door, wash)…"
        bind:value={q}
        onpointerdown={(e) => e.stopPropagation()}
      />
      {#each groups as g (g.label)}
        <div class="sec">{g.label}</div>
        <div class="grid">
          {#each g.icons as n (n)}
            <button type="button" class="ic" class:on={value === n} title={n} onclick={() => pick(n)}>{@html icon(n, { w: 29, h: 29 })}</button>
          {/each}
        </div>
      {/each}
      {#if !groups.length}
        <div class="hint">Nincs találat erre: „{q}”.</div>
      {/if}
      {#if homeyIcons.length}
        <div class="sec">Homey eszköz-ikonok</div>
        <div class="grid">
          {#each homeyIcons as h}
            <button type="button" class="ic" class:on={value === h.url} title={h.name} onclick={() => pick(h.url)}>{@html icon(h.url, { w: 29, h: 29 })}</button>
          {/each}
        </div>
      {:else}
        <div class="hint">Csatlakozz a Homey-hoz (Beállítások), hogy az eszköz-ikonok is megjelenjenek.</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ip { position: relative; width: 100%; }
  .trigger {
    width: 100%; height: 36px; display: flex; align-items: center; gap: 8px;
    padding: 0 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--card-2);
    color: var(--txt); font: inherit; font-size: 13px; cursor: pointer;
  }
  .trigger:hover { border-color: #3a3a44; }
  .trigger.open { border-color: var(--blue); box-shadow: 0 0 0 2px rgba(76, 141, 255, 0.2); }
  .prev { display: inline-flex; color: var(--txt-dim); }
  .lbl { flex: 1; text-align: left; color: var(--txt-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .caret { color: var(--txt-dim); flex: 0 0 auto; }

  .menu {
    position: absolute; z-index: 45; top: calc(100% + 4px); left: 0; right: 0;
    max-height: 440px; overflow-y: auto; overflow-x: hidden; padding: 10px;
    background: #16161c; border: 1px solid var(--line); border-radius: 12px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
  }
  .search {
    width: 100%; height: 32px; margin-bottom: 4px; padding: 0 10px;
    border-radius: 9px; border: 1px solid var(--line); background: var(--card-2);
    color: var(--txt); font: inherit; font-size: 12px;
  }
  .search:focus { outline: none; border-color: var(--blue); }
  .sec { font-size: 10px; font-weight: 700; color: var(--txt-mute); text-transform: uppercase; letter-spacing: 0.4px; margin: 6px 2px 8px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .ic {
    height: 44px; padding: 4px; display: flex; align-items: center; justify-content: center;
    border-radius: 10px; border: 1px solid var(--line); background: var(--card-2); color: var(--txt-dim); cursor: pointer;
  }
  .ic:hover { background: #22222a; color: var(--txt); }
  .ic.on { border-color: var(--blue); color: var(--blue); background: var(--blue-soft); }
  .hint { font-size: 11px; color: var(--txt-mute); padding: 6px 2px; line-height: 1.5; }
</style>
