<script>
  import { icon } from '../lib/icons.js'
  import { searchStops, fetchDepartures, iconOf, colorOf } from '../lib/bkk.js'
  import { bkk } from '../lib/dashboards.js'

  let { value = [], onchange } = $props()

  let query = $state('')
  let places = $state([]) // találati helyek (állomások)
  let refStops = {}
  let refRoutes = {}
  let searching = $state(false)
  let pending = $state(null) // kiválasztott hely { name, stopIds, ... }
  let combos = $state([]) // { stopId, stopName, routeId, shortName, type, color, textColor, headsign }
  let loadingCombos = $state(false)
  let err = $state('')

  const hasKey = $derived(!!$bkk?.apiKey)
  const txtColor = (c) => (c ? '#' + String(c).replace(/^#/, '') : '#fff')
  const num = (a, b) => String(a).localeCompare(String(b), 'hu', { numeric: true })

  let t
  function onQuery(e) {
    query = e.target.value
    clearTimeout(t)
    err = ''
    if (query.trim().length < 3) { places = []; return }
    t = setTimeout(doSearch, 300)
  }
  async function doSearch() {
    searching = true
    try {
      const r = await searchStops(query.trim())
      places = r.places
      refStops = r.stops
      refRoutes = r.routes
    } catch (e) {
      err = String(e?.message || e)
      places = []
    }
    searching = false
  }

  async function pickPlace(place) {
    pending = place
    places = []
    query = place.name
    loadingCombos = true
    err = ''

    // 1) minden járat MINDEN irányban statikusan (fizikai megálló = egy irány)
    const cs = []
    for (const sid of place.stopIds) {
      const st = refStops[sid] ?? {}
      for (const rid of st.routeIds ?? []) {
        const rt = refRoutes[rid] ?? {}
        cs.push({ stopId: sid, stopName: st.name, routeId: rid, shortName: rt.shortName ?? '?', type: rt.type ?? 'BUS', color: rt.color ?? null, textColor: rt.textColor ?? null, headsign: '' })
      }
    }
    // irány-címke tartalék a route leírásából ("A | B") — ha egy járat két megállóban
    // van a helyen, a két végállomást sorrendben osztjuk szét (heurisztika)
    const byRoute = {}
    for (const c of cs) (byRoute[c.routeId] ??= []).push(c)
    for (const rid in byRoute) {
      const arr = byRoute[rid]
      const parts = String(refRoutes[rid]?.description ?? '').split('|').map((s) => s.trim()).filter(Boolean)
      arr.forEach((c, i) => (c.headsign = parts.length === arr.length ? parts[i] : parts.join(' / ')))
    }
    combos = cs.sort((a, b) => num(a.shortName, b.shortName) || num(a.headsign, b.headsign))
    loadingCombos = false

    // 2) élő indulásokból pontosítjuk az irány-feliratot, ha épp jár (best-effort)
    try {
      const d = await fetchDepartures(place.stopIds, { minutesAfter: 120 })
      const live = new Map()
      for (const it of d.items) if (it.headsign) live.set(it.stopId + '|' + it.routeId, it.headsign)
      combos = combos.map((c) => ({ ...c, headsign: live.get(c.stopId + '|' + c.routeId) || c.headsign }))
    } catch {}
  }

  function add(c) {
    onchange([...(value ?? []), { stopId: c.stopId, stopName: c.stopName, routeId: c.routeId, shortName: c.shortName, type: c.type, color: c.color, textColor: c.textColor, headsign: c.headsign }])
  }
  const isAdded = (c) => (value ?? []).some((r) => r.stopId === c.stopId && r.routeId === c.routeId)
  function del(i) {
    onchange((value ?? []).filter((_, k) => k !== i))
  }

  // sorrendezés DnD-vel (mint az oldalaknál)
  let dragFrom = $state(null)
  let overIdx = $state(null)
  function reorder(from, to) {
    if (from == null || from === to) return
    const arr = [...(value ?? [])]
    const [m] = arr.splice(from, 1)
    arr.splice(to, 0, m)
    onchange(arr)
  }
</script>

<div class="rp">
  {#if !hasKey}
    <p class="note">Add meg a BKK API-kulcsot a <b>Beállítások</b> fülön a kereséshez.</p>
  {/if}

  <label>Megálló keresése
    <input type="text" placeholder="pl. Széll Kálmán tér" value={query} oninput={onQuery} autocomplete="off" disabled={!hasKey} />
  </label>
  {#if searching}<div class="hint">Keresés…</div>{/if}
  {#if err}<div class="hint err">{err}</div>{/if}

  {#if places.length}
    <div class="menu">
      {#each places as p (p.id)}
        <button type="button" class="res" onclick={() => pickPlace(p)}>
          {p.name}{#if p.localityName}<small> · {p.localityName}</small>{/if}
        </button>
      {/each}
    </div>
  {/if}

  {#if pending}
    <div class="sec2">Járatok itt: {pending.name}</div>
    {#if loadingCombos}
      <div class="hint">Járatok betöltése…</div>
    {:else if combos.length}
      <div class="rows">
        {#each combos as c (c.stopId + '|' + c.routeId)}
          <div class="combo">
            <span class="badge" style="background:{colorOf(c.type, c.color)};color:{txtColor(c.textColor)}">
              <span class="bic">{@html icon(iconOf(c.type), { w: 14, h: 14 })}</span>{c.shortName}
            </span>
            <span class="dir">{c.headsign}</span>
            <button type="button" class="addbtn" disabled={isAdded(c)} onclick={() => add(c)}>{isAdded(c) ? '✓' : '+'}</button>
          </div>
        {/each}
      </div>
    {:else}
      <div class="hint">Nincs induló járat ebben a megállóban most.</div>
    {/if}
  {/if}

  {#if (value ?? []).length}
    <div class="sec2">Felvett járatok</div>
    <div class="rows">
      {#each value as r, i (r.stopId + '|' + r.routeId + '|' + r.headsign + i)}
        <div
          class="combo {overIdx === i ? 'over' : ''} {dragFrom === i ? 'ghost' : ''}"
          ondragover={(e) => { e.preventDefault(); overIdx = i }}
          ondragleave={() => { if (overIdx === i) overIdx = null }}
          ondrop={(e) => { e.preventDefault(); reorder(dragFrom, i); dragFrom = null; overIdx = null }}
          role="listitem"
        >
          <span class="grip" draggable="true" ondragstart={() => (dragFrom = i)} ondragend={() => { dragFrom = null; overIdx = null }}>{@html icon('grip', { w: 15, h: 15 })}</span>
          <span class="badge" style="background:{colorOf(r.type, r.color)};color:{txtColor(r.textColor)}">
            <span class="bic">{@html icon(iconOf(r.type), { w: 14, h: 14 })}</span>{r.shortName}
          </span>
          <span class="dir"><b>{r.headsign}</b><small>{r.stopName}</small></span>
          <button type="button" class="danger sm" title="Törlés" onclick={() => del(i)}>✕</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .rp { display: flex; flex-direction: column; gap: 8px; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--txt-dim); }
  input { width: 100%; height: 36px; border-radius: 10px; border: 1px solid var(--line); background: var(--card-2); color: var(--txt); padding: 0 10px; font: inherit; font-size: 13px; }
  input:focus { outline: none; border-color: var(--blue); }
  .note { font-size: 12px; color: var(--txt-mute); line-height: 1.5; background: var(--card-2); padding: 10px; border-radius: 10px; }
  .hint { font-size: 12px; color: var(--txt-mute); padding: 2px 2px; }
  .hint.err { color: var(--red, #ff7a89); }
  .menu { display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow-y: auto; background: #16161c; border: 1px solid var(--line); border-radius: 10px; padding: 4px; }
  .res { text-align: left; background: transparent; border: none; color: var(--txt); font: inherit; font-size: 13px; padding: 8px 8px; border-radius: 7px; cursor: pointer; }
  .res:hover { background: var(--card-2); }
  .res small { color: var(--txt-mute); }
  .sec2 { font-size: 11px; font-weight: 700; color: var(--txt-mute); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 4px; }
  .rows { display: flex; flex-direction: column; gap: 6px; }
  .combo { display: flex; align-items: center; gap: 9px; border-radius: 8px; }
  .combo.over { box-shadow: inset 0 2px 0 var(--blue); }
  .combo.ghost { opacity: 0.45; }
  .grip { display: inline-flex; color: var(--txt-mute); cursor: grab; padding: 2px; flex: 0 0 auto; }
  .grip:active { cursor: grabbing; }
  .badge { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 8px; border-radius: 7px; font-weight: 800; font-size: 13px; }
  .bic { display: inline-flex; }
  .bic :global(svg) { display: block; }
  .dir { flex: 1; min-width: 0; font-size: 13px; color: var(--txt-dim); display: flex; flex-direction: column; }
  .dir small { color: var(--txt-mute); font-size: 11px; }
  .dir, .dir b, .dir small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .addbtn { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--line); background: var(--card-2); color: var(--teal); font-size: 16px; font-weight: 700; cursor: pointer; }
  .addbtn:disabled { color: var(--txt-mute); cursor: default; }
  .danger.sm { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: var(--red, #ff7a89); cursor: pointer; }
</style>
