<script>
  /* Az ÉPP SZERKESZTETT dashboardra vonatkozó beállítások: panel-profil,
     kezdőoldal, időjárás. Azért a szerkesztő bal oldali paneljén élnek, és nem
     a Beállítások fülön, mert az a Homey-kapcsolatot, a BKK-kulcsot, a MOHU
     címet és a gesztust tartja — vagyis az EGÉSZ rendszerre szólót.

     A blokkok összecsukhatók, és a fejlécük kiírja az aktuális értéket, hogy a
     lista és a paletta ne szoruljon le a látóterből. */
  import Select from './Select.svelte'
  import {
    activeId,
    activeDashboard,
    PANEL_PRESETS,
    panelOf,
    renameDashboard,
    setPanel,
    setStartPage,
    setIdleReturn,
  } from '../lib/dashboards.js'

  const dash = $derived($activeDashboard)

  /* Panel-profil: melyik NSPanel-re készül ez a dashboard. A méret CSS-pixelben
     értendő — a panel böngészője a kalibrált viewporttal erre skáláz. */
  const panel = $derived(panelOf(dash))
  const panelOpts = [
    ...Object.entries(PANEL_PRESETS).map(([k, v]) => ({ value: k, label: v.name })),
    { value: 'custom', label: 'Egyedi méret' },
  ]
  const panelName = $derived(PANEL_PRESETS[panel.preset]?.name ?? 'Egyedi')
  const setP = (k, v) => setPanel($activeId, { [k]: Math.max(1, Math.round(+v || 0)) })
  // Kilógó widgetek: panelváltás után NEM rendezzük át magától a mentett elrendezést.
  const oversize = $derived(
    (dash?.pages ?? []).flatMap((pg, i) =>
      (pg.widgets ?? [])
        .filter(
          (w) =>
            (w.pos?.x ?? 1) + (w.size?.w ?? 1) - 1 > panel.cols ||
            (w.pos?.y ?? 1) + (w.size?.h ?? 1) - 1 > panel.rows,
        )
        .map((w) => `${i + 1}. oldal`),
    ),
  )

  /* Kezdőoldal: oldal-ID-t tárolunk, de sorszámmal is jelöljük, mert a
     felhasználó „hanyadik oldal”-ban gondolkodik. */
  const pageOpts = $derived((dash?.pages ?? []).map((p, i) => ({ value: p.id, label: `${i + 1}. ${p.title}` })))
  const startPageId = $derived(dash?.startPageId ?? dash?.pages?.[0]?.id ?? '')
  const startLabel = $derived(pageOpts.find((o) => o.value === startPageId)?.label ?? '1. oldal')

  // Tétlenségi visszatérés. A Select szigorú === egyezéssel dolgozik → szám maradjon.
  const IDLE_OPTS = [
    { value: 0, label: 'Soha (marad, ahol hagyták)' },
    { value: 15, label: '15 másodperc' },
    { value: 30, label: '30 másodperc' },
    { value: 60, label: '1 perc' },
    { value: 120, label: '2 perc' },
    { value: 300, label: '5 perc' },
    { value: 600, label: '10 perc' },
    { value: 1800, label: '30 perc' },
  ]
  const idleSec = $derived(dash?.idleReturnSec ?? 0)
  // ha a mentett érték nincs a listában (kézzel írt state), tegyük hozzá
  const idleOpts = $derived(
    IDLE_OPTS.some((o) => o.value === idleSec)
      ? IDLE_OPTS
      : [...IDLE_OPTS, { value: idleSec, label: `${idleSec} másodperc` }].sort((a, b) => a.value - b.value),
  )

</script>

<label class="dname">Dashboard neve
  <input
    type="text"
    value={dash?.name ?? ''}
    oninput={(e) => renameDashboard($activeId, e.target.value)}
    placeholder="Dashboard neve"
  />
</label>

<details class="blk">
  <summary>
    <span class="t">Panel</span>
    <span class="v">{panelName.split(' — ')[0]} · {panel.cols}×{panel.rows}</span>
    {#if oversize.length}<span class="dot" title="Kilógó widgetek"></span>{/if}
  </summary>
  <div class="body">
    <label>Panel-típus
      <Select value={panel.preset} options={panelOpts} onchange={(v) => setPanel($activeId, { preset: v })} />
    </label>
    {#if panel.preset === 'custom'}
      <div class="g2">
        <label>Szélesség (px)<input type="number" min="240" step="2" value={panel.w} oninput={(e) => setP('w', e.target.value)} /></label>
        <label>Magasság (px)<input type="number" min="240" step="2" value={panel.h} oninput={(e) => setP('h', e.target.value)} /></label>
        <label>Oszlopok<input type="number" min="1" max="12" value={panel.cols} oninput={(e) => setP('cols', e.target.value)} /></label>
        <label>Sorok<input type="number" min="1" max="12" value={panel.rows} oninput={(e) => setP('rows', e.target.value)} /></label>
      </div>
    {:else}
      <p class="muted">{panel.w}×{panel.h} px · {panel.cols}×{panel.rows} widget-rács</p>
    {/if}
    {#if oversize.length}
      <p class="warn">
        {oversize.length} widget kilóg az új rácsból ({[...new Set(oversize)].join(', ')}). A mentett
        elrendezést nem írjuk át — húzd be a vásznon, vagy a widget beállításánál használd az
        „Igazítás” gombot.
      </p>
    {/if}
    <p class="muted">
      A Pro 86 és a Gen2 is 480×480-as, a Pro 120 fizikailag 750×1334 — azt álló módban 480×854-es,
      fekvőben 854×480-as keretre rajzoljuk, hogy a cellák és a betűk ugyanakkorák maradjanak.
    </p>
  </div>
</details>

<details class="blk">
  <summary>
    <span class="t">Kezdőoldal</span>
    <span class="v">{startLabel}{idleSec ? ` · ${idleSec} mp` : ''}</span>
  </summary>
  <div class="body">
    <label>Induló oldal
      <Select value={startPageId} options={pageOpts} placeholder="Első oldal" onchange={(v) => setStartPage($activeId, v)} />
    </label>
    <label>Visszatérés tétlenség után
      <Select value={idleSec} options={idleOpts} onchange={(v) => setIdleReturn($activeId, v)} />
    </label>
    <p class="muted">
      Az oldal <b>azonosítója</b> mentődik, nem a sorszáma — átrendezés után is ugyanazzal indul. A
      tétlenségi órát minden érintés újraindítja; nyitott ablak (pl. termosztát) fölött nem lép vissza.
    </p>
  </div>
</details>

<style>
  .dname { gap: 6px; font-size: 12px; }
  .dname input { height: 38px; font-size: 14px; }
  /* a blokkok a panel FLEX-oszlopának elemei: overflow:hidden mellett a
     min-height:auto elveszne, és összenyomódva levágnák a tartalmukat */
  .blk { flex: 0 0 auto; border: 1px solid var(--line); border-radius: 12px; background: var(--card-2); overflow: hidden; }
  summary {
    display: flex; align-items: center; gap: 8px; padding: 9px 10px; cursor: pointer;
    font-size: 13px; list-style: none;
  }
  summary::-webkit-details-marker { display: none; }
  /* nyíl: csukva ▸, nyitva ▾ */
  summary::before { content: '▸'; color: var(--txt-mute); font-size: 10px; transition: transform 0.15s; }
  .blk[open] summary::before { transform: rotate(90deg); }
  .blk[open] summary { border-bottom: 1px solid var(--line); }
  summary .t { font-weight: 600; }
  summary .v { flex: 1; min-width: 0; text-align: right; font-size: 11px; color: var(--txt-mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  summary .dot { flex: 0 0 auto; width: 7px; height: 7px; border-radius: 50%; background: #ffb84d; }
  .body { display: flex; flex-direction: column; gap: 10px; padding: 10px; }
  label { display: flex; flex-direction: column; gap: 5px; font-size: 11px; color: var(--txt-dim); }
  input {
    height: 34px; border-radius: 10px; border: 1px solid var(--line);
    background: var(--card); color: var(--txt); padding: 0 9px; font: inherit; font-size: 13px;
    /* a number-input alap szélessége ~166px: min-width nélkül szétfeszítené a
       kétoszlopos rácsot a 272px-es panelen */
    width: 100%; min-width: 0; box-sizing: border-box;
  }
  input:focus { outline: none; border-color: var(--blue); }
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .g2 > label { min-width: 0; }
  .muted { font-size: 11px; color: var(--txt-mute); line-height: 1.45; }
  .muted b { color: var(--txt-dim); }
  .warn {
    font-size: 11px; line-height: 1.45; color: #ffb84d;
    background: rgba(255, 184, 77, 0.1); border: 1px solid rgba(255, 184, 77, 0.3);
    border-radius: 10px; padding: 7px 9px;
  }
</style>
