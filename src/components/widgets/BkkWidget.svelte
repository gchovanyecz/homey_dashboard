<script>
  import { onMount } from 'svelte'
  import { icon } from '../../lib/icons.js'
  import { fetchDepartures, iconOf, colorOf, minsUntil } from '../../lib/bkk.js'
  import { bkk } from '../../lib/dashboards.js'

  let { w } = $props()
  const routes = $derived(w.routes ?? [])
  const hasKey = $derived(!!$bkk?.apiKey)

  /* MÉRT szélesség: két rács-egység alatt (≈225 px) a nagyobb betűk mellett az
     irány-feliratból már csak egy-két betű + „…" férne ki — ott inkább elmarad,
     és a jelvény + a perc kapja a helyet. */
  let boxW = $state(0)
  const showDir = $derived(boxW === 0 || boxW >= 250)

  let now = $state(Math.floor(Date.now() / 1000))
  let items = $state([]) // nyers indulások az összes megállóra

  async function load() {
    const stopIds = [...new Set(routes.map((r) => r.stopId).filter(Boolean))]
    if (!stopIds.length || !$bkk?.apiKey) return
    try {
      const d = await fetchDepartures(stopIds)
      items = d.items
      now = d.now
    } catch (e) {
      console.warn('[bkk] fetch failed', e)
    }
  }

  onMount(() => {
    load()
    const id = setInterval(load, 30 * 1000)
    return () => clearInterval(id)
  })

  // Egy felvett járat: a fizikai megálló egy irányt jelent, ezért megálló + vonal alapján
  // szűrünk. Az irány-feliratot élő adatból pontosítjuk (stopHeadsign), ha van.
  function rowData(r) {
    const m = items.filter((it) => it.routeId === r.routeId && it.stopId === r.stopId)
    return {
      mins: m.slice(0, 3).map((it) => minsUntil(it.depSec, now)),
      headsign: m[0]?.headsign || r.headsign || r.stopName,
    }
  }
</script>

<div class="bkk" bind:clientWidth={boxW}>
  {#if !hasKey}
    <div class="empty">Add meg a BKK API-kulcsot a Beállításoknál.</div>
  {:else if !routes.length}
    <div class="empty">Vegyél fel járatokat a szerkesztőben.</div>
  {:else}
    <div class="blist">
      {#each routes as r (r.stopId + '|' + r.routeId)}
        {@const rd = rowData(r)}
        {@const mins = rd.mins}
        <div class="brow">
          <span class="badge" style="background:{colorOf(r.type, r.color)};color:{r.textColor ? '#' + r.textColor.replace(/^#/, '') : '#fff'}">
            <span class="bic">{@html icon(iconOf(r.type), { w: 20, h: 20 })}</span>
            <span class="bno">{r.shortName}</span>
          </span>
          {#if showDir}<span class="bdir">{rd.headsign}</span>{/if}
          <span class="bmins">
            {#if mins.length}
              <span class="bfirst">{mins[0]}</span><span class="bunit">perc</span>{#if mins.length > 1}<span class="brest">· {mins.slice(1).join(' · ')}</span>{/if}
            {:else}
              <span class="brest">—</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .bkk {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    padding: 7px 9px;
    display: flex;
    flex-direction: column;
  }
  /* A panelen (3,95" / 480px) a korábbi méretek karnyújtásnyiról nehezen
     olvashatók voltak. A sorok KÖZTI hézag ment el 6→3-ra, a megspórolt hely
     pedig a sorok magasságába és a betűkbe: így ugyanannyi sor fér ki. */
  .blist { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; touch-action: pan-y; }
  /* a sorok kitöltik a rendelkezésre álló helyet (2 járat = fél-fél), több járatnál
     a min-height tartja a méretet és a lista scrollozódik */
  .brow { flex: 1 1 auto; min-height: 40px; display: flex; align-items: center; gap: 10px; }
  .badge {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 34px;
    padding: 0 11px;
    border-radius: 10px;
    font-weight: 800;
    font-size: 19px;
  }
  .bic { display: inline-flex; }
  .bic :global(svg) { display: block; }
  .bno { line-height: 1; }
  .bdir { flex: 1; min-width: 0; font-size: 17px; color: var(--txt-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* a margin-left:auto akkor is jobbra tolja, ha az irány-felirat (a rugalmas
     kitöltő elem) el van hagyva */
  .bmins { flex: 0 0 auto; margin-left: auto; display: flex; align-items: baseline; gap: 4px; }
  .bfirst { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
  .bunit { font-size: 14px; color: var(--txt-mute); }
  .brest { font-size: 19px; color: var(--txt-mute); }
  .empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--txt-mute); font-size: 13px; text-align: center; padding: 0 8px; }
</style>
