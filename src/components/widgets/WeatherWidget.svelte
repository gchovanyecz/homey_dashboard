<script>
  import { onMount } from 'svelte'
  import { icon, wxIcon } from '../../lib/icons.js'
  import { fetchWeather } from '../../lib/weather.js'
  import { weather as weatherCfg, panel } from '../../lib/dashboards.js'

  let { w } = $props()

  // Kezdeti (mock) adat, hogy azonnal renderelhessen; Open-Meteo felülírja.
  const DEF = {
    temp: 21,
    cond: 'partly',
    condText: 'Részben felhős',
    loc: 'Budapest',
    details: { rain: 20, wind: 12, humidity: 62, pressure: 1014, uv: '4 (mérsékelt)', sunrise: '05:42' },
    forecast: [
      { d: 'Sze', cond: 'sun', hi: 24, lo: 14 },
      { d: 'Csü', cond: 'partly', hi: 23, lo: 13 },
      { d: 'Pén', cond: 'rain', hi: 19, lo: 12 },
      { d: 'Szo', cond: 'cloud', hi: 20, lo: 11 },
      { d: 'Vas', cond: 'sun', hi: 25, lo: 14 },
      { d: 'Hét', cond: 'partly', hi: 22, lo: 13 },
      { d: 'Ked', cond: 'rain', hi: 18, lo: 10 },
    ],
  }
  let data = $state({ ...DEF, ...(w.data ?? {}) })
  const size = w.size

  /* Élő időjárás lekérése (Open-Meteo, cache-elve). Hiba esetén marad a mock.
     A beállítás FIGYELVE van: induláskor még az alapérték van a store-ban (a
     mentett állapot a szerverről csak utána érkezik), és az adminban is menet
     közben írják át — mindkettő új lekérést indít. */
  async function load(wcfg) {
    try {
      const live = await fetchWeather({ ...wcfg, name: wcfg.name ?? DEF.loc })
      data = { ...DEF, ...live }
    } catch (e) {
      console.warn('[weather] fetch failed, mock marad', e)
    }
  }
  $effect(() => {
    load($weatherCfg)
  })
  onMount(() => {
    // kioszk: 15 percenként frissít (a cache miatt csak lejáratkor kér le újra)
    const id = setInterval(() => load($weatherCfg), 15 * 60 * 1000)
    return () => clearInterval(id)
  })

  /* Méret-döntés a PANEL rácsához viszonyítva: a „teljes” változat az, ami a
     rács szélességét és magasságának legalább felét kitölti (4×4-es panelen ez
     a régi 4×4, a Pro 120 álló 4×7-es rácsán 4×4-től felfelé). */
  const isSmall = $derived(size.w <= $panel.cols / 2 && size.h <= Math.max(2, $panel.rows / 2))
  const isFull = $derived(size.w >= $panel.cols && size.h >= Math.min(4, $panel.rows))
  const fcDays = $derived(isSmall ? 3 : 5)
  const heroSize = $derived(isFull ? 84 : isSmall ? 36 : 68)
  const tempSize = $derived(isFull ? 60 : isSmall ? 32 : 46)

  const forecast = $derived(data.forecast.slice(0, fcDays))
  const det = $derived(data.details)
  const detailItems = $derived([
    { icon: 'droplet', label: 'Páratartalom', value: det.humidity + '%' },
    { icon: 'wind', label: 'Szél', value: det.wind + ' km/h' },
    { icon: 'umbrella', label: 'Eső esély', value: det.rain + '%' },
    { icon: 'gauge', label: 'Légnyomás', value: det.pressure + ' hPa' },
    { icon: 'sun', label: 'UV index', value: det.uv },
    { icon: 'sunrise', label: 'Napkelte', value: det.sunrise },
  ])
</script>

<div class="widget weather" class:full={isFull}>
  <div class="wx-top">
    <div class="wx-cur">
      <div class="wx-temp" style="font-size:{tempSize}px">{data.temp}°</div>
      <div class="wx-meta">
        {#if !isSmall}<div class="wx-loc">{data.loc}</div>{/if}
        <div class="wx-cond">{data.condText}</div>
      </div>
    </div>
    <span class="wx-ic">{@html wxIcon(data.cond, heroSize)}</span>
  </div>

  {#if !isSmall}
    <!-- 4×2: kompakt részletsor ikonokkal -->
    <div class="wx-mini">
      <div class="m"><span class="di">{@html icon('umbrella')}</span>Eső esély <b>{det.rain}%</b></div>
      <div class="m"><span class="di">{@html icon('wind')}</span>Szél <b>{det.wind} km/h</b></div>
      <div class="m"><span class="di">{@html icon('droplet')}</span>Pára <b>{det.humidity}%</b></div>
    </div>
  {/if}

  <div class="wx-fc">
    {#each forecast as f}
      <div class="day">
        <div class="dd">{f.d}</div>
        <span class="fic">{@html wxIcon(f.cond, 36)}</span>
        <div><span class="hi">{f.hi}°</span><span class="lo">{f.lo}°</span></div>
      </div>
    {/each}
  </div>

  {#if isFull}
    <div class="wx-det">
      {#each detailItems as it}
        <div class="di-row"><span class="di">{@html icon(it.icon)}</span>{it.label} <b>{it.value}</b></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .widget {
    width: 100%;
    height: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .widget.full {
    padding: 16px 18px;
  }
  .wx-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .wx-temp {
    font-weight: 400;
    letter-spacing: -1px;
    line-height: 1;
  }
  .wx-cur {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .wx-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .wx-cond {
    font-size: 14px;
    color: var(--txt-dim);
  }
  .wx-loc {
    font-size: 15px;
    color: var(--txt-dim);
  }
  .wx-ic :global(svg) {
    display: block;
  }
  .wx-mini {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .wx-mini .m {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
    color: var(--txt-dim);
  }
  .wx-mini .m b {
    color: var(--txt);
    font-weight: 600;
  }
  .di {
    display: inline-flex;
    color: var(--txt-mute);
  }
  .wx-mini .di :global(svg) {
    width: 21px;
    height: 21px;
  }
  .wx-fc {
    display: flex;
    gap: 7px;
    margin-top: auto;
    flex: 0 0 auto;
    align-items: stretch;
  }
  .wx-fc .day {
    flex: 1;
    background: var(--card-2);
    border-radius: 14px;
    padding: 9px 5px;
    text-align: center;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }
  .wx-fc .dd {
    font-size: 14px;
    line-height: 1;
    color: var(--txt-dim);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .wx-fc .fic :global(svg) {
    display: block;
    margin: 0 auto;
  }
  .wx-fc .day > div:last-child {
    line-height: 1;
  }
  .wx-fc .hi {
    font-size: 17px;
    font-weight: 600;
  }
  .wx-fc .lo {
    font-size: 14px;
    color: var(--txt-mute);
    margin-left: 3px;
  }
  .wx-det {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 22px;
    margin-top: 8px;
  }
  .di-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--txt-dim);
    border-top: 1px solid var(--line);
    padding: 7px 0;
  }
  .di-row .di :global(svg) {
    width: 15px;
    height: 15px;
  }
  .di-row b {
    margin-left: auto;
    color: var(--txt);
    font-weight: 600;
  }
</style>
