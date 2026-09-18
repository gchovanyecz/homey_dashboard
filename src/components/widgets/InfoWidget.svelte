<script>
  /* Infografika: akárhány eszköz-capability olvasható értéke, csempékben.
     Egy csempe lehet sima capability vagy sablon
     ("{device_1.measure_power} → {device_2.measure_power}") — a formázás és a
     kiértékelés a capval.js/template.js-ben van, hogy az admin élő előnézete
     ugyanazt adja. */
  import { icon } from '../../lib/icons.js'
  import { seriesColor } from '../../lib/charts.js'
  import { devices, connection } from '../../lib/stores.js'
  import { subscribe } from '../../lib/homey.js'
  import { itemRefs, itemValue, itemRatio, itemLabel } from '../../lib/capval.js'
  import { panel } from '../../lib/dashboards.js'

  let { w } = $props()
  // a rács MÉRT mérete (nem a rács-egységekből becsülve): ebből jön az
  // oszlopszám finomítása és az egységes betűméret
  let gridH = $state(0)
  let gridW = $state(0)
  const items = $derived(w.items ?? [])
  const hero = $derived((w.variant ?? 'grid') === 'hero' && items.length > 1)

  $effect(() => {
    if ($connection.status !== 'connected') return
    // sablonnál minden hivatkozott capability kell, nem csak egy
    for (const it of items) for (const r of itemRefs(it)) if (r.deviceId && r.capability) subscribe(r.deviceId, r.capability)
  })

  const fmt = (it) => itemValue($devices, it)
  const ratio = (it) => itemRatio($devices, it)
  const labelOf = (it, i) => itemLabel($devices, it, i)
  const colorOf = (it, i) => seriesColor(it.color, i)
  // az accent szín halvány háttérként: color-mix() helyett kézzel, mert a panel
  // WebView-ja nem biztos, hogy támogatja
  const tint = (hex, a) => {
    const h = hex.replace('#', '')
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
  }

  /* Szövegszélesség canvas-szal MÉRVE (1px betűméretre normalizálva), nem
     karakterszámból becsülve — a tabuláris számok és a mértékegység máskülönben
     félrevisznek. Ez adja az egységes érték-méretet és az oszlopszámot is. */
  let mctx = null
  function textW(s, weight) {
    if (!s) return 0
    if (!mctx) mctx = document.createElement('canvas').getContext('2d')
    mctx.font = `${weight} 100px system-ui, sans-serif`
    // ha a böngésző nem fogadta el a font-stringet, ne 10px-es alapon méricskéljünk
    const px = Number(mctx.font.match(/(\d+)px/)?.[1] ?? 100)
    return mctx.measureText(s).width / px
  }
  const GAP = 7
  const PADY = 12 // csempe belső margó (fent+lent)
  const PADX = 18 // csempe belső margó (bal+jobb) + keret
  const MINVF = 13 // ennél kisebb értéket ne kényszerítsünk ki oszlopszámmal

  /** A leghosszabb érték szélessége 1px betűméretre (+ a mértékegység px-ben). */
  const widest = $derived.by(() => {
    let w1 = 0
    let ux = 0
    for (const it of items) {
      const f = itemValue($devices, it)
      const t = textW(f.text, 800)
      if (t > w1) { w1 = t; ux = f.unit ? textW(' ' + f.unit, 400) : 0 }
    }
    return { w1, ux }
  })

  /* Oszlopszám a widget méretéből és az elemszámból (egy rács-egység ~112px,
     egy csempe kényelmesen ~84px-től olvasható), de úgy, hogy a leghosszabb
     érték még olvasható méretben (MINVF) kiférjen — különben kevesebb oszlop.
     Nem container query-vel, hogy a panel régebbi WebView-ján is működjön. */
  const cols = $derived.by(() => {
    const n = items.length || 1
    const wu = w.size?.w ?? 2
    const hu = w.size?.h ?? 2
    // egy rács-egység szélessége a PANEL profiljából (480/4 ≈ 117 a hézaggal)
    const unit = ($panel.w - 20) / $panel.cols
    const maxCols = Math.max(1, Math.min(4, Math.floor((wu * unit) / 84)))
    const wish = Math.ceil(Math.sqrt(n * (wu / Math.max(1, hu))))
    const base = Math.max(1, Math.min(maxCols, n, Math.max(1, wish)))
    if (!gridW || !widest.w1) return base
    const need = MINVF * widest.w1 + widest.ux * MINVF + PADX
    const fits = Math.max(1, Math.floor((gridW + GAP) / (need + GAP)))
    return Math.max(1, Math.min(base, fits))
  })
  const rows = $derived(Math.max(1, Math.ceil((hero ? items.length - 1 : items.length) / cols) + (hero ? 1 : 0)))

  /* A csempe MÉRT magasságából méretezünk, nem a rács-egységekből becsülve.
     Az ikon önálló sora (a címke alatta) egy negyedik sávot visz, és a becslés
     több méretben levágta a címkét/értéket — a szerkesztő kicsinyített
     vásznán pedig eleve más a valódi pixelméret, mint amit a size sugall. */
  const tileH = $derived(Math.max(28, (gridH - (rows - 1) * GAP) / rows - PADY))
  const tileW = $derived(Math.max(40, (gridW - (cols - 1) * GAP) / cols - PADX))

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)))

  /* A csempe sávjai fentről: ikon, címke, érték, (kitöltés-sáv). A magasságot
     ebben a sorrendben osztjuk el, hogy semmi ne csonkuljon:

       1. az ÉRTÉK betűmérete a SZÉLESSÉGBŐL jön — a leghosszabb érték szabja
          meg, és minden csempén ugyanannyi (így egységes a widget);
       2. a CÍMKE a magasság arányában kap méretet;
       3. az IKON a MARADÉK helyet kapja (ezért lehet jó nagy ott, ahol van hely).

     Ha nem fér el minden, ebben a sorrendben hagyunk el sávot: kitöltés-sáv →
     ikon → címke. Az érték és a címke hordozza az információt, az ikon dísz. */
  // a címke a magasságból, de nem nyomhatja el az értéket (lásd lf lentebb)
  const lfRaw = $derived(clamp(tileH * 0.17, 10, 20))
  const vf = $derived.by(() => {
    if (!widest.w1) return clamp(tileH * 0.3, 10, 40)
    const uw = widest.ux * lfRaw * 1.05 // a mértékegység kisebb betűvel megy
    return clamp(((tileW - uw) * 0.97) / widest.w1, 10, 40)
  })
  const lf = $derived(clamp(Math.min(lfRaw, vf * 1.15), 10, 20))
  const ICON_MIN = 16
  const ICON_MAX = 56
  const band = $derived.by(() => {
    const gap = tileH < 60 ? 1 : 3
    // egy sáv tényleges magassága: betűméret × sormagasság
    const need = (withIcon, withLabel, withBar) =>
      (withIcon ? ICON_MIN : 0) +
      (withLabel ? lf * 1.3 : 0) +
      vf * 1.25 +
      (withBar ? 3 : 0) +
      gap * ((withIcon ? 1 : 0) + (withLabel ? 1 : 0) + (withBar ? 1 : 0))
    let withIcon = true
    let withLabel = true
    let withBar = true
    if (need(withIcon, withLabel, withBar) > tileH) withBar = false
    if (need(withIcon, withLabel, withBar) > tileH) withIcon = false
    if (need(withIcon, withLabel, withBar) > tileH) withLabel = false
    // ami a címke, az érték és a sáv után marad, az az ikoné
    const rest = tileH - (need(withIcon, withLabel, withBar) - (withIcon ? ICON_MIN : 0))
    return { withIcon, withLabel, withBar, icon: withIcon ? clamp(rest, ICON_MIN, ICON_MAX) : 0 }
  })
  const iconPx = $derived(band.icon)
  const showIcon = $derived(band.withIcon)
  const showLabel = $derived(band.withLabel)
  const showBar = $derived(band.withBar)
  const tight = $derived(tileH < 60)
</script>

<div class="info">
  {#if w.label && w.showLabel !== false}<div class="hd">{w.label}</div>{/if}

  {#if !items.length}
    <div class="empty">Vegyél fel értékeket a szerkesztőben.</div>
  {:else}
    <div
      class="grid"
      class:hero
      class:tight
      bind:clientHeight={gridH}
      bind:clientWidth={gridW}
      style="--cols:{cols};--vf:{vf}px;--if:{iconPx}px;--lf:{lf}px"
    >
      {#each items as it, i ((it.expr ?? it.deviceId) + '|' + it.capability + '|' + i)}
        {@const f = fmt(it)}
        {@const c = colorOf(it, i)}
        {@const r = ratio(it)}
        <div class="tile" class:big={hero && i === 0} style="--c:{c};--tint:{tint(c, 0.16)}">
          <!-- ikon önálló sorban, alatta a címke, majd az érték -->
          {#if it.icon && showIcon}<span class="ic">{@html icon(it.icon)}</span>{/if}
          {#if showLabel}<span class="lb">{labelOf(it, i)}</span>{/if}
          <div class="val" class:off={f.off} class:dim={f.dim}>
            <span class="n">{f.text}</span>{#if f.unit}<span class="u">{f.unit}</span>{/if}
          </div>
          {#if r !== null && showBar}
            <div class="bar"><span style="width:{(r * 100).toFixed(1)}%"></span></div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .info {
    width: 100%;
    height: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    padding: 9px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .hd { font-size: 12px; font-weight: 600; color: var(--txt-dim); flex: 0 0 auto; }
  .empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--txt-mute); font-size: 12px; text-align: center; }

  .grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 7px;
  }
  /* „hero”: az első érték a teljes első sort kapja, kiemelt méretben */
  .grid.hero .tile.big { grid-column: 1 / -1; }

  .tile {
    min-width: 0;
    min-height: 0;
    border-radius: 12px;
    background: var(--tint);
    border: 1px solid var(--line);
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    /* fentről lefelé: ikon, címke, érték — az ikon HELYE fix, nem tolja el a
       tartalom mennyisége (középre igazításnál csempénként elmászott) */
    justify-content: flex-start;
    align-items: flex-start;
    gap: 3px;
    overflow: hidden;
  }
  .ic { display: inline-flex; color: var(--c); flex: 0 0 auto; align-self: flex-start; }
  .ic :global(svg) { width: var(--if); height: var(--if); display: block; }
  .lb {
    align-self: stretch;
    font-size: var(--lf);
    color: var(--txt-mute);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.01em;
    line-height: 1.25;
  }
  .val { display: flex; align-items: baseline; gap: 3px; min-width: 0; align-self: stretch; }
  .val .n {
    font-weight: 800;
    color: var(--c);
    font-size: var(--vf);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .val .u { font-size: 12px; color: var(--txt-mute); flex: 0 0 auto; }
  .val.off .n { color: var(--txt-mute); }
  .val.dim .n { color: var(--txt-mute); opacity: 0.7; }

  .bar { height: 3px; border-radius: 2px; background: rgba(255, 255, 255, 0.1); overflow: hidden; }
  .bar span { display: block; height: 100%; border-radius: 2px; background: var(--c); }

  /* Szűk csempén kisebb hézag és margó, hogy a négy sáv (ikon, címke, érték,
     sáv) elférjen; a címke és a sáv a magasságtól függően maradhat is el. */
  .grid.tight .tile { padding: 4px 7px; gap: 1px; }
  .val .u { font-size: calc(var(--lf) * 1.05); }
</style>
