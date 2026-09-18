<script>
  /* Insights log-választó.
     A Homey-n több száz log van (nálunk 263: eszköz-capability-k + rendszer,
     időjárás, app-erőforrás, Logic változók), ezért sima Select helyett kereső +
     csoportosított lista. A kiválasztott érték a TELJES log-ID. */
  import { insightLogs, connection } from '../lib/stores.js'

  let { value = null, onchange } = $props()

  let open = $state(false)
  let q = $state('')
  let root = $state()
  let inputEl = $state()

  const connected = $derived($connection.status === 'connected')
  const current = $derived(($insightLogs ?? []).find((l) => l.id === value) ?? null)

  const norm = (x) => String(x ?? '').toLowerCase()
  const hits = $derived.by(() => {
    const t = norm(q).trim()
    const list = $insightLogs ?? []
    if (!t) return list
    const words = t.split(/\s+/)
    return list.filter((l) => {
      const hay = norm(`${l.owner} ${l.title} ${l.cap} ${l.units}`)
      return words.every((w) => hay.includes(w))
    })
  })
  // csoportok: owner szerint, a lista már owner+title szerint rendezett
  const groups = $derived.by(() => {
    const out = []
    for (const l of hits) {
      if (!out.length || out[out.length - 1].owner !== l.owner) out.push({ owner: l.owner, logs: [l] })
      else out[out.length - 1].logs.push(l)
    }
    return out
  })

  const fmtLast = (l) => {
    if (l.lastValue === null || l.lastValue === undefined) return 'nincs adat'
    if (l.type === 'boolean') return l.lastValue ? 'be' : 'ki'
    if (typeof l.lastValue !== 'number') return String(l.lastValue)
    // nagyságrendhez illő tizedesek (11712.0 kWh → 11712 kWh)
    const a = Math.abs(l.lastValue)
    const dec = a >= 100 ? 0 : a >= 10 ? 1 : Math.min(l.decimals ?? 1, 2)
    return `${l.lastValue.toFixed(dec)}${l.units ? ' ' + l.units : ''}`
  }

  function pick(l) {
    onchange(l.id, l)
    open = false
    q = ''
  }
  function toggle() {
    open = !open
    if (open) queueMicrotask(() => inputEl?.focus())
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

{#if connected && ($insightLogs ?? []).length}
  <div class="ip" bind:this={root}>
    <button type="button" class="trigger" class:open onclick={toggle}>
      {#if current}
        <span class="cur"><b>{current.owner}</b> · {current.title}{current.units ? ` (${current.units})` : ''}</span>
      {:else if value}
        <span class="cur missing">Nincs ilyen log: <code>{value}</code></span>
      {:else}
        <span class="ph">Válassz Insights-logot ({$insightLogs.length} elérhető)</span>
      {/if}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
    </button>

    {#if open}
      <div class="menu">
        <input
          class="q"
          bind:this={inputEl}
          placeholder="Keresés: eszköz, mérés, mértékegység…"
          value={q}
          oninput={(e) => (q = e.target.value)}
        />
        <div class="list">
          {#if !groups.length}
            <div class="empty">Nincs találat</div>
          {:else}
            {#each groups as g (g.owner)}
              <div class="gh">{g.owner}</div>
              {#each g.logs as l (l.id)}
                <button type="button" class="row" class:on={l.id === value} onclick={() => pick(l)}>
                  <span class="t">{l.title}</span>
                  <span class="c">{l.cap}</span>
                  <span class="v" class:nodata={l.lastValue === null || l.lastValue === undefined}>{fmtLast(l)}</span>
                </button>
              {/each}
            {/each}
          {/if}
        </div>
        <div class="foot">{hits.length} / {$insightLogs.length} log</div>
      </div>
    {/if}
  </div>
{:else}
  <input
    type="text"
    placeholder="teljes log-ID (csatlakozz a Homey-hoz)"
    value={value ?? ''}
    oninput={(e) => onchange(e.target.value || null)}
  />
{/if}

<style>
  .ip { position: relative; }
  .trigger {
    width: 100%; height: 36px; display: flex; align-items: center; gap: 8px;
    border-radius: 10px; border: 1px solid var(--line); background: var(--card-2);
    color: var(--txt); padding: 0 10px; font: inherit; font-size: 13px; cursor: pointer; text-align: left;
  }
  .trigger.open { border-color: var(--blue); }
  .trigger svg { margin-left: auto; flex: 0 0 auto; color: var(--txt-mute); }
  .cur { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cur b { font-weight: 600; }
  .missing { color: #ff9aa5; }
  .missing code { font-family: ui-monospace, Menlo, monospace; font-size: 11px; }
  .ph { color: var(--txt-mute); }

  .menu {
    position: absolute; z-index: 30; left: 0; right: 0; top: calc(100% + 4px);
    background: var(--card); border: 1px solid var(--line); border-radius: 12px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5); overflow: hidden;
    display: flex; flex-direction: column;
  }
  .q {
    height: 38px; border: none; border-bottom: 1px solid var(--line); background: var(--card-2);
    color: var(--txt); padding: 0 12px; font: inherit; font-size: 13px;
  }
  .q:focus { outline: none; }
  .list { max-height: 360px; overflow-y: auto; }
  .gh {
    position: sticky; top: 0; background: var(--card);
    padding: 8px 12px 5px; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--txt); border-bottom: 1px solid var(--line);
  }
  .row {
    width: 100%; display: flex; align-items: baseline; gap: 8px; padding: 7px 12px;
    background: none; border: none; color: var(--txt); font: inherit; font-size: 13px;
    cursor: pointer; text-align: left;
  }
  .row:hover { background: var(--card-2); }
  .row.on { background: var(--blue-soft); }
  /* a cím kapja a helyet, a capability-ID rövidül (az volt fordítva) */
  .row .t { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row .c {
    flex: 0 1 auto; max-width: 45%; min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left;
    font-size: 10px; color: var(--txt-mute); font-family: ui-monospace, Menlo, monospace;
  }
  .row .v { margin-left: auto; font-size: 11px; color: var(--txt-dim); white-space: nowrap; }
  .row .v.nodata { color: var(--txt-mute); opacity: 0.7; }
  .foot { padding: 6px 12px; font-size: 10px; color: var(--txt-mute); border-top: 1px solid var(--line); }

  input[type='text'] {
    width: 100%; height: 36px; border-radius: 10px; border: 1px solid var(--line);
    background: var(--card-2); color: var(--txt); padding: 0 10px; font: inherit; font-size: 13px;
  }
  input[type='text']:focus { outline: none; border-color: var(--blue); }
</style>
