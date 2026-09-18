<script>
  import { donutSVG, pieSVG, lineSVG, downsample, seriesColor } from '../../lib/charts.js'
  import { devices, connection, insightLogs } from '../../lib/stores.js'
  import { panel } from '../../lib/dashboards.js'
  import { subscribe, fetchInsights, insightLogId } from '../../lib/homey.js'

  let { w } = $props()
  const d = w.data ?? {}
  const type = w.chart ?? 'line'
  // „nagy” = a panel rácsának teljes szélessége és legalább 4 sor (a 4×4-es
  // panelen ez a régi 4×4 feltétel)
  const big = $derived(w.size.w >= $panel.cols && w.size.h >= Math.min(4, $panel.rows))
  const isLine = type === 'line'

  // ---- Élő torta/fánk források (measure_power összevetés) ----
  const sources = d.sources ?? null // [{ deviceId, cap?, label }]
  const unit = d.unit ?? (sources ? ' W' : '')

  $effect(() => {
    if (sources && $connection.status === 'connected')
      for (const s of sources) subscribe(s.deviceId, s.cap ?? 'measure_power')
  })

  function argmax(a) {
    let m = 0
    a.forEach((v, i) => {
      if (v > a[m]) m = i
    })
    return m
  }
  const fmt = (n) => `${n}${unit}`

  const vals = $derived(
    sources
      ? sources.map((s) =>
          Math.max(0, Math.round($devices[s.deviceId]?.capabilities?.[s.cap ?? 'measure_power'] ?? 0)),
        )
      : (d.vals ?? [1]),
  )
  const labels = $derived(sources ? sources.map((s) => s.label) : (d.labels ?? []))

  /* Végigpörgetés: a fánk ciklikusan kiemeli az egyes fogyasztókat, középen a
     nevükkel és a mért értékükkel. A sebesség az adminban állítható; egyetlen
     forrásnál nincs mit pörgetni. */
  const rotating = $derived(!isLine && !!d.rotate && vals.length > 1)
  const rotateMs = $derived(Math.max(1000, +d.rotateMs || 4000))
  let rotIdx = $state(0)
  $effect(() => {
    if (!rotating) return
    const n = vals.length
    const ms = rotateMs
    rotIdx = rotIdx % n
    const id = setInterval(() => (rotIdx = (rotIdx + 1) % n), ms)
    return () => clearInterval(id)
  })
  const highlight = $derived(rotating ? rotIdx % Math.max(1, vals.length) : (d.highlight ?? argmax(vals)))
  // a fánk közepén a hosszú név nem fér ki: levágjuk
  const shortLabel = (s) => (String(s ?? '').length > 15 ? String(s).slice(0, 14) + '…' : String(s ?? ''))

  // ---- Élő vonal (Insights historikus log) ----
  // A grafikon MAGA tölti le a historikus adatot, és percenként/negyedóránként
  // újra — a felbontáshoz illő ütemben (lásd refreshMs).
  const MAX_PTS = 140 // ennyi pontnál többet nincs értelme kirajzolni a panelen
  let seriesLive = $state(null) // [{ vals, meta } | null] — null = ehhez nincs adat
  let insState = $state('idle') // idle | loading | ok | empty | error

  const insCfg = $derived(isLine && Array.isArray(d.insights) && d.insights.length ? d.insights : null)
  const refreshMs = $derived.by(() => {
    const res = (insCfg ?? []).map((i) => i.resolution ?? d.resolution ?? 'last24Hours')
    if (res.some((r) => r === 'lastHour')) return 60 * 1000
    if (res.some((r) => r === 'last6Hours' || r === 'today' || r === 'last24Hours')) return 5 * 60 * 1000
    return 15 * 60 * 1000
  })

  $effect(() => {
    const cfg = insCfg
    const ms = refreshMs
    if (!cfg || $connection.status !== 'connected') return
    let dead = false
    const run = async () => {
      insState = 'loading'
      const out = []
      for (const ins of cfg) {
        const logId = insightLogId(ins)
        const r = logId ? await fetchInsights(logId, ins.resolution ?? d.resolution ?? 'last24Hours') : null
        const raw = r?.points?.length ? r.points.map((p) => p.v) : null
        // a min/max feliratot a RITKÍTÁS ELŐTTI adatból számoljuk, hogy a kiírt
        // szélsőérték a valóság legyen, ne a megrajzolt közelítés
        out.push(raw ? { logId, vals: downsample(raw, MAX_PTS), min: Math.min(...raw), max: Math.max(...raw) } : null)
      }
      if (dead) return
      seriesLive = out
      insState = out.some((x) => x) ? 'ok' : 'empty'
    }
    run()
    const t = setInterval(run, ms)
    return () => {
      dead = true
      clearInterval(t)
    }
  })

  // Csak a tényleges adatot adjuk a rajzolónak; a hiányzó sorozat KIMARAD
  // (korábban [0,0]-t kapott, ezért látszott minden nullán).
  const series = $derived(
    seriesLive ? seriesLive.filter(Boolean).map((x) => x.vals) : (d.series ?? []),
  )
  // A szín a KONFIG sorszámához tartozik, nem a kirajzoltéhoz: ha egy sorozat
  // épp adat nélkül marad, a többi színe nem csúszik el.
  const colors = $derived(
    seriesLive
      ? seriesLive.map((x, i) => (x ? seriesColor(insCfg?.[i]?.color, i) : null)).filter(Boolean)
      : (d.series ?? []).map((_, i) => seriesColor(null, i)),
  )
  // kitöltés sorozatonként; ami nincs beállítva, arra a régi, widget-szintű d.fill áll
  const fills = $derived(
    seriesLive
      ? seriesLive.flatMap((x, i) => (x ? [insCfg?.[i]?.fill ?? !!d.fill] : []))
      : (d.series ?? []).map(() => !!d.fill),
  )
  const logMeta = (logId) => ($insightLogs ?? []).find((l) => l.id === logId) ?? null
  const unitOf = (logId) => logMeta(logId)?.units ?? ''

  /* Skálázás. A „sorozatok külön skálázása” valójában a KÜLÖNBÖZŐ MÉRTÉKEGYSÉGEK
     miatt kell (W és °C egy grafikonon). Az azonos mértékegységű sorozatok
     viszont közös skálán kell fussanak, különben félrevezet: a konstans
     célhőmérséklet a saját tartománya alján ült, miközben a tengelyfelirat a
     mért hőmérséklet tartományát mutatta — így a 45 °C-os setpoint 24 °C-nak
     látszott. Ezért a csoport a mértékegység, nem a sorozat. */
  const drawn = $derived((seriesLive ?? []).filter(Boolean))
  const ownScale = $derived(d.ownScale !== false)
  const scaleGroups = $derived.by(() => {
    if (!ownScale) return drawn.map(() => 0)
    const seen = []
    return drawn.map((x) => {
      const u = unitOf(x.logId)
      let i = seen.indexOf(u)
      if (i < 0) i = seen.push(u) - 1
      return i
    })
  })
  const fmtVal = (v, logId) => {
    if (!Number.isFinite(v)) return '—'
    // nagyságrendhez illő tizedesek: 2414.47 W helyett 2414 W, de 13.3 °C marad
    const a = Math.abs(v)
    const dec = a >= 100 ? 0 : a >= 10 ? 1 : Math.min(logMeta(logId)?.decimals ?? 1, 2)
    const u = unitOf(logId)
    return u ? `${v.toFixed(dec)} ${u}` : v.toFixed(dec)
  }
  // jelmagyarázat: a beállított címke + a sorozat utolsó értéke
  const lineLegend = $derived.by(() => {
    const names = d.labels ?? []
    if (!seriesLive) return names.map((l, i) => ({ label: l, value: '', color: seriesColor(null, i) }))
    const out = []
    seriesLive.forEach((x, i) => {
      if (!x) return
      out.push({
        label: names[i] ?? logMeta(x.logId)?.title ?? `Sorozat ${i + 1}`,
        value: fmtVal(x.vals.at(-1), x.logId),
        color: seriesColor(insCfg?.[i]?.color, i),
      })
    })
    return out
  })
  /* A min/max felirat mérete: a panelen 9px olvashatatlan volt, ezért 13px —
     de nagyon alacsony grafikonon (2x1) két felirat kitakarná a vonalat, ott
     visszavesszük. A MÉRT magasságból, nem a rács-egységekből. */
  let boxH = $state(0)
  const axf = $derived(boxH && boxH < 80 ? 11 : 13)

  /* min/max felirat: annak a SKÁLÁNAK a tartománya, amin az első sorozat fut —
     vagyis az azonos mértékegységű sorozatok közös szélsőértéke. Így a felirat
     tényleg arra a vonalra (vonalakra) érvényes, amit mutat. */
  const lineRange = $derived.by(() => {
    const first = drawn[0]
    if (!first?.vals?.length) return null
    const g = scaleGroups[0]
    const same = drawn.filter((_, i) => scaleGroups[i] === g)
    const min = Math.min(...same.map((x) => x.min))
    const max = Math.max(...same.map((x) => x.max))
    return { min: fmtVal(min, first.logId), max: fmtVal(max, first.logId) }
  })

  // ---- SVG (reaktív) ----
  const bodyHTML = $derived(build(type, vals, series, highlight))
  function build(t, vv, ss, hl) {
    if (t === 'line')
      return lineSVG(ss, { axis: !!d.axis, fill: !!d.fill, colors, fills, groups: scaleGroups })
    if (t === 'pie') return pieSVG(vv, { highlight: hl })
    const opt = { highlight: hl }
    if (big && d.full) {
      opt.full = true
      opt.sublabel = shortLabel(labels[hl])
      opt.subvalue = fmt(vv[hl] ?? '')
      opt.total = fmt(vv.reduce((a, b) => a + b, 0))
    } else if (rotating) {
      // pörgetés közben a KIEMELT fogyasztó neve és értéke áll középen
      opt.sublabel = shortLabel(labels[hl])
      opt.subvalue = fmt(vv[hl] ?? '')
    } else {
      opt.center = d.center ?? (sources ? fmt(vv.reduce((a, b) => a + b, 0)) : '')
    }
    return donutSVG(vv, opt)
  }

  /* Jelmagyarázat (fogyasztólista). Eddig a fánk/torta csak akkor mutatta, ha a
     configban KIFEJEZETTEN `legend: true` volt — a szerkesztőben viszont nem volt
     rá kapcsoló, így a kitelepített widgeteken nem látszott. Mostantól minden
     típusnál a kapcsoló dönt, alapértelmezés: látszik. */
  const hasLegend = $derived(d.legend !== false && (isLine ? lineLegend.length : labels.length))
  // keskeny widgeten a lista a diagram ALÁ kerül (mellette már nem férne el)
  let boxW = $state(0)
  const legendBelow = $derived(boxW > 0 && boxW < 300)
  const legendDonut = $derived(labels.map((l, i) => ({ label: l, value: fmt(vals[i] ?? ''), hl: i === highlight })))
</script>

<div class="widget chart" bind:clientWidth={boxW}>
  {#if d.title && w.showLabel !== false}<div class="chd">{d.title}</div>{/if}

  <div class="chart-body" class:row={hasLegend && !isLine && !legendBelow}>
    {#if isLine}
      {#if bodyHTML}
        <div class="lcbox" bind:clientHeight={boxH} style="--axf:{axf}px">
          {@html bodyHTML}
          {#if d.axis && lineRange}
            <span class="mx">{lineRange.max}</span>
            <span class="mn">{lineRange.min}</span>
          {/if}
        </div>
        {#if hasLegend}
          <div class="chleg row">
            {#each lineLegend as l}
              <div class="li">
                <span class="dot" style="background:{l.color}"></span>{l.label}
                {#if l.value}<b class="lv">{l.value}</b>{/if}
              </div>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="nodata">
          {#if !insCfg}
            Nincs sorozat beállítva — add hozzá a szerkesztőben.
          {:else if $connection.status !== 'connected'}
            Nincs Homey-kapcsolat.
          {:else if insState === 'loading' || insState === 'idle'}
            Adatok letöltése…
          {:else}
            Ehhez a beállításhoz nincs Insights-adat a Homey-n.
          {/if}
        </div>
      {/if}
    {:else if hasLegend}
      <div class="chsvg">{@html bodyHTML}</div>
      <div class="chleg" class:row={legendBelow}>
        {#each legendDonut as it}
          <div class="li" class:hl={it.hl}>{it.label}<b>{it.value}</b></div>
        {/each}
      </div>
    {:else}
      {@html bodyHTML}
    {/if}
  </div>
</div>

<style>
  .widget {
    width: 100%;
    height: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    padding: 9px 12px 11px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .chd {
    font-size: 12px;
    font-weight: 600;
    color: var(--txt-dim);
  }
  .chart-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .chart-body.row {
    flex-direction: row;
    align-items: center;
    gap: 18px;
  }
  .chart-body > :global(svg) {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: block;
  }
  .chart-body.row .chsvg {
    flex: 1;
    height: 100%;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .chart-body.row .chsvg :global(svg) {
    width: 100%;
    height: 100%;
  }
  /* keskeny widget: a diagram fölül, a lista alatta — a diagram zsugorodjon,
     a lista pedig tömör (különben kilógna a csempéből) */
  .chart-body:not(.row) .chsvg {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .chart-body:not(.row) .chsvg :global(svg) { width: 100%; height: 100%; }
  .chleg.row .li { font-size: 11px; }
  .chleg.row .li b { margin-left: 4px; }
  .lcbox {
    position: relative;
    flex: 1;
    width: 100%;
    min-height: 0;
    display: flex;
  }
  /* a min/max SZÁNDÉKOSAN HTML, nem SVG-text: a vonal-SVG-t nyújtjuk
     (preserveAspectRatio="none"), ott a betűk is deformálódnának */
  .mx,
  .mn {
    position: absolute;
    left: 0;
    /* a panelen 9px-en olvashatatlan volt: nagyobb, félkövér, erősebb
       kontraszt és tömörebb háttér, hogy a vonalon is elváljon */
    font-size: var(--axf, 13px);
    font-weight: 600;
    color: var(--txt-dim);
    background: rgba(12, 12, 14, 0.86);
    padding: 1px 5px;
    border-radius: 5px;
    letter-spacing: 0.01em;
    pointer-events: none;
  }
  .mx { top: 0; }
  .mn { bottom: 0; }
  .nodata {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 11px;
    line-height: 1.4;
    color: var(--txt-mute);
    padding: 0 10px;
  }
  .chleg .li .lv {
    margin-left: 4px;
    color: var(--txt);
    font-weight: 600;
    padding-left: 0;
  }
  .chleg {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
  }
  .chleg.row {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px 16px;
    justify-content: center;
    flex: 0 0 auto;
  }
  .chleg .li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--txt-dim);
    white-space: nowrap;
  }
  .chleg .li .dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex: 0 0 auto;
  }
  .chleg .li b {
    margin-left: auto;
    color: var(--txt);
    font-weight: 600;
    padding-left: 12px;
  }
  .chleg .li.hl,
  .chleg .li.hl b {
    color: #6fd98c;
  }
</style>
