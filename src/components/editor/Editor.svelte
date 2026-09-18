<script>
  import { fly, fade } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import Widget from '../Widget.svelte'
  import WidgetConfig from '../../admin/WidgetConfig.svelte'
  import DashboardConfig from '../../admin/DashboardConfig.svelte'
  import ScrollList from '../../admin/ScrollList.svelte'
  import { icon } from '../../lib/icons.js'
  import {
    dashboards,
    activeId,
    activeDashboard,
    addDashboard,
    removeDashboard,
    addPage,
    removePage,
    renamePage,
    reorderPage,
    addWidget,
    maxSizeOf,
    updateWidget,
    PALETTE,
    panelOf,
  } from '../../lib/dashboards.js'

  /* A vászon a dashboard PANEL-PROFILJÁBÓL méreteződik (480×480/4×4, Pro 120
     álló 480×854/4×7, fekvő 854×480/7×4). A cellák a futásidejű elrendezéssel
     egyező padding/gap-ből jönnek — korábban a szerkesztő 14px-es paddinggel
     számolt, a panel viszont 10-zel, ezért 2px-et csúszott. */
  const PAD = 10,
    GAP = 10

  const PAL_ICON = { weather: 'weather', thermostat: 'thermo', sliderGroup: 'sliders', button: 'power', chart: 'chart', mood: 'mood', bkk: 'bus', info: 'gauge', mohu: 'trash', qr: 'qr' }
  const PAL_COLOR = { weather: '#ffb84d', thermostat: '#ff7a59', sliderGroup: '#37d3b0', button: '#4c8dff', chart: '#7ed957', mood: '#b39cff', bkk: '#009ee3', info: '#4fd1ff', mohu: '#7ed957', qr: '#e879f9' }

  let selPageId = $state(null)
  let selWidgetId = $state(null)
  let drag = $state(null)
  let dragFrom = $state(null)
  let overIdx = $state(null)

  const dash = $derived($activeDashboard)
  const dashId = $derived($activeId)
  const pages = $derived(dash?.pages ?? [])
  const panel = $derived(panelOf(dash))
  const CELL = $derived((panel.w - 2 * PAD - (panel.cols - 1) * GAP) / panel.cols)
  const CELL_Y = $derived((panel.h - 2 * PAD - (panel.rows - 1) * GAP) / panel.rows)
  /* A vászon a rendelkezésre álló magasságba skálázva (a Pro 120 álló 854-e
     különben kilógna). A MÉRÉS a vászon KONTÉNERÉN történik: annak magasságát
     a szerkesztő elrendezése adja, nem a tartalom — így nincs visszacsatolás
     a zoom és a mért magasság között. A levonások a konténer belső díszei:
     függőlegesen padding + lapfelirat, vízszintesen padding + a két nyílgomb. */
  let wrapH = $state(0)
  let wrapW = $state(0)
  const zoom = $derived(
    wrapH > 0 && wrapW > 0 ? Math.min(1, (wrapH - 104) / panel.h, (wrapW - 140) / panel.w) : 1,
  )

  $effect(() => {
    if (!pages.find((p) => p.id === selPageId)) {
      selPageId = pages[0]?.id ?? null
      selWidgetId = null
    }
  })
  const idx = $derived(Math.max(0, pages.findIndex((p) => p.id === selPageId)))
  const page = $derived(pages[idx] ?? null)
  const sel = $derived(page?.widgets?.find((w) => w.id === selWidgetId) ?? null)

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const keyOf = (w) => { const { pos, size, ...rest } = w; return w.id + '|' + JSON.stringify(rest) }
  /* Oldalváltás iránya (1 = jobbra, -1 = balra) — ebből tudja az animáció,
     merről ússzon be az új vászon. Sima let: csak a következő renderhez kell,
     nem akarunk tőle külön frissítést. */
  let dir = 1
  function go(i) {
    const t = clamp(i, 0, pages.length - 1)
    dir = t > idx ? 1 : t < idx ? -1 : dir
    selPageId = pages[t]?.id ?? null
    selWidgetId = null
  }

  function boxStyle(w, active) {
    let x = w.pos?.x ?? 1, y = w.pos?.y ?? 1, ww = w.size.w, hh = w.size.h
    if (active && drag && drag.id === w.id) { x = drag.pos.x; y = drag.pos.y; ww = drag.size.w; hh = drag.size.h }
    const left = PAD + (x - 1) * (CELL + GAP)
    const top = PAD + (y - 1) * (CELL_Y + GAP)
    const width = ww * CELL + (ww - 1) * GAP
    const height = hh * CELL_Y + (hh - 1) * GAP
    return `left:${left}px;top:${top}px;width:${width}px;height:${height}px`
  }

  function onDown(e, w, mode) {
    e.preventDefault(); e.stopPropagation()
    selWidgetId = w.id
    drag = { id: w.id, type: w.type, mode, sx: e.clientX, sy: e.clientY, origPos: { x: w.pos?.x ?? 1, y: w.pos?.y ?? 1 }, origSize: { ...w.size }, pos: { x: w.pos?.x ?? 1, y: w.pos?.y ?? 1 }, size: { ...w.size } }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  function onMove(e) {
    if (!drag) return
    // a vászon skálázva lehet (álló panel), ezért a kliens-elmozdulást visszaosztjuk
    const sx = Math.round((e.clientX - drag.sx) / zoom / (CELL + GAP))
    const sy = Math.round((e.clientY - drag.sy) / zoom / (CELL_Y + GAP))
    const maxX = panel.cols + 1,
      maxY = panel.rows + 1
    if (drag.mode === 'move')
      drag.pos = {
        x: clamp(drag.origPos.x + sx, 1, maxX - drag.size.w),
        y: clamp(drag.origPos.y + sy, 1, maxY - drag.size.h),
      }
    else {
      // a rács széle ÉS a típus maximuma közül a szűkebb határ érvényes
      const mx = maxSizeOf(drag.type, panel)
      drag.size = {
        w: clamp(drag.origSize.w + sx, 1, Math.min(maxX - drag.origPos.x, mx.w)),
        h: clamp(drag.origSize.h + sy, 1, Math.min(maxY - drag.origPos.y, mx.h)),
      }
    }
  }
  function onUp() {
    if (drag) {
      const w = page?.widgets.find((x) => x.id === drag.id)
      if (w) { const { id, ...rest } = w; updateWidget(dashId, selPageId, id, { ...rest, pos: drag.pos, size: drag.size }) }
    }
    drag = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }

  function findFree(size, widgets) {
    const { cols, rows } = panel
    const occ = Array.from({ length: rows }, () => Array(cols).fill(false))
    for (const w of widgets) {
      const x = (w.pos?.x ?? 1) - 1, y = (w.pos?.y ?? 1) - 1
      for (let j = 0; j < w.size.h; j++) for (let i = 0; i < w.size.w; i++) if (y + j < rows && x + i < cols) occ[y + j][x + i] = true
    }
    for (let y = 1; y <= rows + 1 - size.h; y++) for (let x = 1; x <= cols + 1 - size.w; x++) {
      let ok = true
      for (let j = 0; j < size.h && ok; j++) for (let i = 0; i < size.w && ok; i++) if (occ[y - 1 + j][x - 1 + i]) ok = false
      if (ok) return { x, y }
    }
    return { x: 1, y: 1 }
  }
  function addFromPalette(item) {
    if (!selPageId) return
    const def = structuredClone(item.def)
    // a paletta alapméretei 4×4-re készültek: szűkebb rácson vágjuk vissza
    def.size = { w: Math.min(def.size.w, panel.cols), h: Math.min(def.size.h, panel.rows) }
    def.pos = findFree(def.size, page?.widgets ?? [])
    selWidgetId = addWidget(dashId, selPageId, { type: item.type, ...def })
  }
</script>

<div class="ed">
  <!-- Bal: oldalak (DnD) + színes paletta -->
  <aside class="left">
    <div class="sec">Dashboardok</div>
    <ScrollList>
      {#each $dashboards as d (d.id)}
        <div
          class="prow drow {d.id === dashId ? 'sel' : ''}"
          role="button" tabindex="0"
          onclick={() => activeId.set(d.id)}
        >
          <span class="pt">{d.name}</span>
          <button
            class="del" title="Törlés"
            disabled={$dashboards.length <= 1}
            onclick={(e) => { e.stopPropagation(); removeDashboard(d.id) }}
          >✕</button>
        </div>
      {/each}
    </ScrollList>
    <button class="wide add" onclick={() => addDashboard()}>+ Dashboard</button>

    <div class="sec">Oldalak</div>
    <ScrollList>
      {#each pages as p, i (p.id)}
        <div
          class="prow {selPageId === p.id ? 'sel' : ''} {overIdx === i ? 'over' : ''} {dragFrom === i ? 'ghost' : ''}"
          role="button" tabindex="0"
          onclick={() => go(i)}
          ondragover={(e) => { e.preventDefault(); overIdx = i }}
          ondragleave={() => { if (overIdx === i) overIdx = null }}
          ondrop={(e) => { e.preventDefault(); if (dragFrom != null && dragFrom !== i) reorderPage(dashId, dragFrom, i); dragFrom = null; overIdx = null }}
        >
          <span class="grip" draggable="true" ondragstart={() => (dragFrom = i)} ondragend={() => { dragFrom = null; overIdx = null }}>{@html icon('grip', { w: 16, h: 16 })}</span>
          <span class="pt">{p.title}</span>
          <button class="del" title="Törlés" onclick={(e) => { e.stopPropagation(); removePage(dashId, p.id) }}>✕</button>
        </div>
      {/each}
    </ScrollList>
    <button class="wide add" onclick={() => (selPageId = addPage(dashId))}>+ Oldal</button>

    <div class="sec">Widgetek — kattints a hozzáadáshoz</div>
    <div class="palette">
      {#each PALETTE as item}
        <button class="chip" style="--c:{PAL_COLOR[item.type]}" onclick={() => addFromPalette(item)} disabled={!selPageId}>
          <span class="pic">{@html icon(PAL_ICON[item.type], { w: 20, h: 20 })}</span>{item.name}
        </button>
      {/each}
    </div>
    <p class="tip">Húzd a widgeteket a vásznon a mozgatáshoz, a sarkukat az átméretezéshez. Az oldalakat a fogantyúval rendezheted.</p>
  </aside>

  <!-- Közép: oldal-karusszel -->
  <main class="canvas-wrap" bind:clientHeight={wrapH} bind:clientWidth={wrapW}>
    {#if page}
      {#snippet preview(pg)}
        <div class="cv">
          <div class="guides">{#each Array(panel.cols * panel.rows) as _}<div></div>{/each}</div>
          {#each pg.widgets as wdg (wdg.id)}
            <div class="box" style={boxStyle(wdg, false)}><div class="inner"><Widget w={wdg} /></div></div>
          {/each}
        </div>
      {/snippet}

      <div
        class="stage"
        style="--cv-w:{panel.w}px;--cv-h:{panel.h}px;--cv-zoom:{zoom};--g-cols:{panel.cols};--g-rows:{panel.rows};--cv-pad:{PAD}px"
      >
        <button class="nav" onclick={() => go(idx - 1)} disabled={idx <= 0} aria-label="Előző">‹</button>
        <div class="viewport">
          {#if idx > 0}
            {#key pages[idx - 1].id}
              <div class="mini left" transition:fade={{ duration: 180 }} onclick={() => go(idx - 1)} role="button" tabindex="0" aria-label="Előző oldal">{@render preview(pages[idx - 1])}</div>
            {/key}
          {/if}
          {#if idx < pages.length - 1}
            {#key pages[idx + 1].id}
              <div class="mini right" transition:fade={{ duration: 180 }} onclick={() => go(idx + 1)} role="button" tabindex="0" aria-label="Következő oldal">{@render preview(pages[idx + 1])}</div>
            {/key}
          {/if}
          {#key page.id}
          <div
            class="cv center"
            in:fly={{ x: dir * 150, duration: 260, easing: cubicOut, opacity: 0.2 }}
            out:fly={{ x: dir * -150, duration: 200, easing: cubicOut, opacity: 0 }}
          >
            <div class="guides">{#each Array(panel.cols * panel.rows) as _}<div></div>{/each}</div>
            {#each page.widgets as wdg (keyOf(wdg))}
              <div
                class="box {selWidgetId === wdg.id ? 'sel' : ''} {drag?.id === wdg.id ? 'dragging' : ''}"
                style={boxStyle(wdg, true)}
                onpointerdown={(e) => onDown(e, wdg, 'move')}
                role="button" tabindex="0"
              >
                <div class="inner"><Widget w={wdg} /></div>
                <div class="resize" onpointerdown={(e) => onDown(e, wdg, 'resize')} role="button" tabindex="0" aria-label="Átméretezés"></div>
              </div>
            {/each}
          </div>
          {/key}
        </div>
        <button class="nav" onclick={() => go(idx + 1)} disabled={idx >= pages.length - 1} aria-label="Következő">›</button>
      </div>
      <div class="cap">{page.title} — {page.widgets.length} widget · {idx + 1}/{pages.length}</div>
    {:else}
      <div class="empty">Nincs oldal — hozz létre egyet balra.</div>
    {/if}
  </main>

  <!-- Jobb: űrlapos config -->
  <aside class="right">
    <!-- a dashboardra (nem az egész rendszerre) szóló beállítások -->
    <div class="sec first">Dashboard</div>
    <DashboardConfig />

    {#if page}
      <div class="sec">Oldal</div>
      <label class="pagename">Oldal neve
        <input value={page.title} oninput={(e) => renamePage(dashId, page.id, e.target.value)} placeholder="Oldal neve" />
      </label>
    {/if}
    {#if sel && page}
      {#key sel.id}<WidgetConfig {dashId} pageId={selPageId} widget={sel} />{/key}
    {:else}
      <div class="hint">Válassz ki egy widgetet a vásznon a szerkesztéshez, vagy adj hozzá egyet a palettáról.</div>
    {/if}
  </aside>
</div>

<style>
  .ed { height: 100%; display: flex; min-height: 0; }
  aside { width: 272px; flex: 0 0 272px; padding: 14px; overflow: auto; display: flex; flex-direction: column; gap: 10px; }
  aside.left { border-right: 1px solid var(--line); background: #0e0e12; }
  /* a config-panel 1.5× (272 → 408px): a widget-űrlapok (grafikon-sorozatok,
     log-választó, indikátor-állapotok) nem férnek el keskenyebben */
  aside.right { width: 408px; flex: 0 0 408px; border-left: 1px solid var(--line); background: #0e0e12; }
  .sec.first { margin-top: 0; }
  .sec { font-size: 11px; font-weight: 700; color: var(--txt-mute); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  input, button { font: inherit; color: var(--txt); }

  /* A listák görgetését a ScrollList intézi (négy sor látszik, utána saját,
     mindig látható sáv) — itt már csak a sorok kinézete marad. */
  .prow {
    display: flex; align-items: center; gap: 6px; padding: 5px; border-radius: 12px;
    border: 1px solid var(--line); background: var(--card-2); cursor: pointer; transition: 0.12s;
  }
  .prow.sel { border-color: var(--blue); box-shadow: 0 0 0 2px rgba(76, 141, 255, 0.22); background: #17202e; }
  .prow.over { border-color: var(--teal); box-shadow: 0 -2px 0 0 var(--teal) inset; }
  .prow.ghost { opacity: 0.4; }
  .grip { display: inline-flex; color: var(--txt-mute); cursor: grab; padding: 2px; }
  .grip:active { cursor: grabbing; }
  .pt { flex: 1; min-width: 0; padding: 0 4px; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
  .pagename { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--txt-dim); padding-bottom: 12px; margin-bottom: 4px; border-bottom: 1px solid var(--line); }
  .pagename input { height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--card-2); color: var(--txt); padding: 0 10px; font: inherit; font-size: 14px; }
  .pagename input:focus { outline: none; border-color: var(--blue); }
  /* a dashboard-sorban nincs fogantyú, a név kapja meg a bal térközt */
  .drow .pt { padding-left: 8px; }
  .del:disabled { opacity: 0.3; cursor: default; }
  .del { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: #ff7a89; cursor: pointer; }
  .wide { width: 100%; }
  .add { height: 36px; border-radius: 10px; border: 1px dashed rgba(76, 141, 255, 0.5); background: var(--blue-soft); color: #cfe0ff; cursor: pointer; }

  /* palette */
  .palette { display: flex; flex-direction: column; gap: 8px; }
  .chip {
    display: flex; align-items: center; gap: 11px; text-align: left; padding: 11px 12px; border-radius: 12px; cursor: pointer;
    border: 1px solid color-mix(in srgb, var(--c) 45%, var(--line));
    background: linear-gradient(135deg, color-mix(in srgb, var(--c) 20%, transparent), transparent);
    font-weight: 600;
  }
  .chip:hover { background: linear-gradient(135deg, color-mix(in srgb, var(--c) 32%, transparent), transparent); }
  .chip:disabled { opacity: 0.4; cursor: default; }
  .chip .pic { display: inline-flex; color: var(--c); }
  .tip { font-size: 11px; color: var(--txt-mute); line-height: 1.5; margin-top: 4px; }

  /* stage / carousel */
  .canvas-wrap {
    flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 20px; overflow: hidden;
    background: radial-gradient(1000px 460px at 50% -10%, rgba(76, 141, 255, 0.1), transparent 60%), #0b0b0f;
  }
  .stage { display: flex; align-items: center; gap: 6px; width: 100%; }
  .nav {
    flex: 0 0 auto; width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--line);
    background: var(--card-2); color: var(--txt); font-size: 22px; line-height: 1; cursor: pointer;
  }
  .nav:hover { background: #2c2c33; }
  .nav:disabled { opacity: 0.3; cursor: default; }
  /* a vászon a panel-profil méretét veszi fel, és ha nem fér ki (álló Pro 120),
     a --cv-zoom kicsinyíti — a húzás-matematika ezt visszaosztja */
  .viewport {
    position: relative; flex: 1; height: calc(var(--cv-h) * var(--cv-zoom) + 28px);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .cv {
    position: relative; width: var(--cv-w); height: var(--cv-h); flex: 0 0 auto;
    background: var(--bg); border-radius: 18px; border: 1px solid var(--line);
    transform: scale(var(--cv-zoom)); transform-origin: center center;
  }
  /* abszolút pozíció: váltáskor a régi és az új vászon egy pillanatig együtt él,
     flex-ben egymás mellé ugranának */
  .center {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(var(--cv-zoom));
    z-index: 3; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55); touch-action: none; user-select: none;
  }
  .mini { position: absolute; top: 50%; z-index: 1; opacity: 0.3; cursor: pointer; filter: saturate(0.8); }
  .mini.left { left: calc(50% - var(--cv-w) * var(--cv-zoom) / 2); transform: translate(-50%, -50%); }
  .mini.right { left: calc(50% + var(--cv-w) * var(--cv-zoom) / 2); transform: translate(-50%, -50%); }
  .mini :global(.inner) { pointer-events: none; }
  .guides {
    position: absolute; inset: var(--cv-pad, 10px); display: grid;
    grid-template-columns: repeat(var(--g-cols, 4), 1fr);
    grid-template-rows: repeat(var(--g-rows, 4), 1fr);
    gap: 10px;
  }
  .guides > div { border: 1px dashed rgba(255, 255, 255, 0.06); border-radius: 12px; }
  .box { position: absolute; border-radius: var(--radius); cursor: grab; transition: left 0.08s, top 0.08s, width 0.08s, height 0.08s; }
  .box.dragging { cursor: grabbing; z-index: 10; transition: none; }
  .box.sel { outline: 2px solid var(--blue); outline-offset: 2px; }
  .inner { width: 100%; height: 100%; pointer-events: none; border-radius: var(--radius); overflow: hidden; }
  .resize { position: absolute; right: -4px; bottom: -4px; width: 18px; height: 18px; border-radius: 6px; background: var(--blue); border: 2px solid #0b0b0f; cursor: nwse-resize; opacity: 0; transition: opacity 0.15s; }
  .box.sel .resize, .box:hover .resize { opacity: 1; }
  .cap { font-size: 12px; color: var(--txt-mute); }
  .empty, .hint { color: var(--txt-mute); font-size: 13px; padding: 10px; line-height: 1.5; }
</style>
