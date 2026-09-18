<script>
  import { updateWidget, removeWidget, maxSizeOf, panelOf, activeDashboard } from '../lib/dashboards.js'
  import { devices, moods, zones, insightLogs } from '../lib/stores.js'
  import DevicePicker from './DevicePicker.svelte'
  import FlowPicker from './FlowPicker.svelte'
  import Select from './Select.svelte'
  import Toggle from './Toggle.svelte'
  import IconPicker from './IconPicker.svelte'
  import BkkRoutePicker from './BkkRoutePicker.svelte'
  import InsightPicker from './InsightPicker.svelte'
  import TemplateEditor from './TemplateEditor.svelte'
  import { ensureSource } from '../lib/template.js'
  import { itemRef, itemValue } from '../lib/capval.js'
  import { SERIES_COLORS, seriesColor } from '../lib/charts.js'
  import { STATE_COLORS, stateColor } from '../lib/colors.js'

  let { dashId, pageId, widget } = $props()

  const TYPE_NAME = { weather: 'Időjárás', thermostat: 'Termosztát', sliderGroup: 'Csúszka-csoport', button: 'Gomb', chart: 'Grafikon', mood: 'Mood-ok', bkk: 'BKK indulások', info: 'Infografika', mohu: 'Szemétszállítás', qr: 'QR-kód' }
  const QR_MODE_OPTS = [
    { value: 'wifi', label: 'Wi-Fi csatlakozás' },
    { value: 'text', label: 'Szöveg vagy URL' },
  ]
  const QR_SEC_OPTS = [
    { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
    { value: 'WEP', label: 'WEP (régi)' },
    { value: 'none', label: 'Nyílt (nincs jelszó)' },
  ]
  const MOOD_SOURCE_OPTS = [
    { value: 'favorite', label: 'Kedvenc mood-ok' },
    { value: 'zone', label: 'Zóna mood-jai' },
    { value: 'selected', label: 'Kiválasztott mood-ok' },
  ]
  const ICON_OPTS = [
    { value: 'bulb', label: 'Izzó' }, { value: 'tv', label: 'TV' }, { value: 'speaker', label: 'Hangszóró' },
    { value: 'blind', label: 'Redőny' }, { value: 'flow', label: 'Flow' }, { value: 'lock', label: 'Zár' },
    { value: 'fan', label: 'Ventilátor' }, { value: 'power', label: 'Kapcsoló' }, { value: 'away', label: 'Távozás' },
    { value: 'coffee', label: 'Kávé' }, { value: 'movie', label: 'Mozi' },
  ]
  const ACCENT_OPTS = [
    { value: 'amber', label: 'Borostyán' }, { value: 'blue', label: 'Kék' },
    { value: 'red', label: 'Piros' }, { value: 'green', label: 'Zöld' },
  ]
  const VARIANT_OPTS = [
    { value: 'light', label: 'Világítás (vízszintes)' }, { value: 'speaker', label: 'Hangerő (vízszintes)' },
    { value: 'shade', label: 'Árnyékolás (vízszintes)' }, { value: 'vertical', label: 'Vertikális (vegyes)' },
  ]
  const KIND_OPTS = [{ value: 'device', label: 'Eszköz (be/ki)' }, { value: 'flow', label: 'Flow indítás' }]
  const INFO_VARIANT_OPTS = [
    { value: 'grid', label: 'Egyenlő csempék' },
    { value: 'hero', label: 'Kiemelt első érték' },
  ]
  const CHART_OPTS = [{ value: 'donut', label: 'Fánk' }, { value: 'pie', label: 'Torta' }, { value: 'line', label: 'Vonal' }]
  // Fánk végigpörgetés sebessége. A Select szigorú === egyezéssel dolgozik → szám maradjon.
  const ROTATE_OPTS = [
    { value: 2000, label: '2 másodperc' },
    { value: 3000, label: '3 másodperc' },
    { value: 4000, label: '4 másodperc' },
    { value: 6000, label: '6 másodperc' },
    { value: 10000, label: '10 másodperc' },
    { value: 20000, label: '20 másodperc' },
  ]
  const VCAP_OPTS = [{ value: 'dim', label: 'Fény' }, { value: 'volume_set', label: 'Hang' }, { value: 'windowcoverings_set', label: 'Árnyék' }]
  // A Homey által elfogadott felbontások (a többire 'Invalid Resolution' jön).
  const RES_OPTS = [
    { value: 'lastHour', label: '1 óra' }, { value: 'last6Hours', label: '6 óra' },
    { value: 'today', label: 'Ma' }, { value: 'yesterday', label: 'Tegnap' },
    { value: 'last24Hours', label: '24 óra' }, { value: 'last7Days', label: '7 nap' },
    { value: 'thisWeek', label: 'Ez a hét' }, { value: 'last14Days', label: '14 nap' },
    { value: 'last31Days', label: '31 nap' }, { value: 'thisMonth', label: 'Ez a hónap' },
    { value: 'last3Months', label: '3 hónap' }, { value: 'last6Months', label: '6 hónap' },
    { value: 'lastYear', label: '1 év' },
  ]
  const CAPS_BY_VARIANT = { light: ['dim'], speaker: ['volume_set'], shade: ['windowcoverings_set'], vertical: ['dim', 'volume_set', 'windowcoverings_set'] }
  const IND_MODE_OPTS = [
    { value: 'dot', label: 'Színes pont' },
    { value: 'value', label: 'Érték (szöveg / szám)' },
    { value: 'icon', label: 'Ikon állapotonként' },
  ]
  // Infografika: minden OLVASHATÓ capability (a getable false csak írható
  // gombokat jelent, azoknak nincs megjelenítendő értékük).
  const readCapOpts = (deviceId) => {
    const d = deviceId ? $devices[deviceId] : null
    const meta = d?.capsMeta ?? {}
    const list = Object.keys(meta).filter((id) => meta[id]?.getable !== false)
    return (list.length ? list : Object.keys(d?.capabilities ?? {})).map((id) => {
      const m = meta[id] ?? {}
      return { value: id, label: `${m.title ?? id}${m.units ? ' (' + m.units + ')' : ''} — ${id}` }
    })
  }

  // Torta/fánk források: minden SZÁMOS capability, ne csak a measure_power —
  // az energiamérők pl. energy_power néven mérnek.
  const numCapOpts = (deviceId) => {
    const d = deviceId ? $devices[deviceId] : null
    const meta = d?.capsMeta ?? {}
    const list = Object.keys(meta).filter((id) => meta[id]?.type === 'number')
    return (list.length ? list : Object.keys(d?.capabilities ?? {})).map((id) => ({
      value: id,
      label: `${meta[id]?.title ?? id} (${id})`,
    }))
  }
  const capOpts = (deviceId) => {
    const d = deviceId ? $devices[deviceId] : null
    const meta = d?.capsMeta ?? {}
    return Object.keys(d?.capabilities ?? {}).map((c) => ({ value: c, label: meta[c]?.title ?? c }))
  }
  // kapcsolható capability-k: setable ÉS (boolean VAGY kétértékű enum, pl. off/on)
  const isToggleMeta = (m) =>
    m?.setable === true &&
    (m.type === 'boolean' || (m.type === 'enum' && Array.isArray(m.values) && m.values.length === 2))
  const toggleCapOpts = (deviceId) => {
    const d = deviceId ? $devices[deviceId] : null
    if (!d) return [{ value: 'onoff', label: 'Be / ki' }]
    const meta = d.capsMeta ?? {}
    let list = Object.keys(meta).filter((id) => isToggleMeta(meta[id]))
    if (!list.length) list = Object.keys(d.capabilities ?? {}) // fallback: minden capability
    return list.map((id) => ({ value: id, label: meta[id]?.title ?? (id === 'onoff' ? 'Be / ki' : id) }))
  }
  const setInd = (obj) => patch({ indicator: { ...(widget.indicator ?? {}), ...obj } })
  const setIState = (i, obj) => {
    const st = [...(widget.indicator?.states ?? [])]
    st[i] = { ...st[i], ...obj }
    setInd({ states: st })
  }
  const addIState = () => setInd({ states: [...(widget.indicator?.states ?? []), { value: '', icon: 'power', label: '' }] })
  const delIState = (i) => setInd({ states: (widget.indicator?.states ?? []).filter((_, k) => k !== i) })

  // Típus-maximum (pl. az infografika 3×3): a szerkesztő átméretezése betartja,
  // a MÁR kirakott, nagyobb widgetet viszont nem írjuk át magától — itt lehet.
  const panel = $derived(panelOf($activeDashboard))
  const max = $derived(maxSizeOf(widget.type, panel))
  const oversize = $derived(widget.size.w > max.w || widget.size.h > max.h)
  // panelváltás után a mentett hely is kieshet a rácsból (pl. 7×4 → 4×4)
  const outside = $derived(
    (widget.pos?.x ?? 1) + widget.size.w - 1 > panel.cols || (widget.pos?.y ?? 1) + widget.size.h - 1 > panel.rows,
  )
  const fitToMax = () => {
    const w2 = Math.min(widget.size.w, max.w)
    const h2 = Math.min(widget.size.h, max.h)
    // ha a pozíció miatt kilógna, húzzuk vissza a rácsba
    const x = Math.min(widget.pos?.x ?? 1, panel.cols + 1 - w2)
    const y = Math.min(widget.pos?.y ?? 1, panel.rows + 1 - h2)
    patch({ size: { w: w2, h: h2 }, pos: { x, y } })
  }

  // a wifi-adatok egy beágyazott objektumban élnek — csak a megadott mezőt írjuk
  const patchWifi = (p) => patch({ wifi: { security: 'WPA', ...(widget.wifi ?? {}), ...p } })

  function patch(obj) {
    const { id, ...rest } = widget
    updateWidget(dashId, pageId, id, { ...rest, ...obj })
  }
  const zoneOpts = $derived(($zones ?? []).map((z) => ({ value: z.id, label: z.name })))
  const toggleMood = (id, on) => {
    const cur = widget.moodIds ?? []
    patch({ moodIds: on ? [...cur, id] : cur.filter((x) => x !== id) })
  }
  function patchData(obj) {
    patch({ data: { ...(widget.data ?? {}), ...obj } })
  }
  const deviceName = (id) => $devices[id]?.name ?? id

  const items = $derived(widget.items ?? [])
  const setItem = (i, o) => { const a = [...items]; a[i] = { ...a[i], ...o }; patch({ items: a }) }
  const addItem = () => patch({ items: [...items, { label: 'Új', value: 50 }] })
  const delItem = (i) => patch({ items: items.filter((_, k) => k !== i) })

  /* Infografika-elem: sima capability ⇄ sablon. Váltásnál átvisszük, ami
     átvihető — a meglévő capability tokenként, illetve az egy tokenes sablon
     vissza sima hivatkozássá. */
  const isTpl = (it) => it?.expr !== undefined && it?.expr !== null
  function toTpl(i) {
    const it = items[i]
    if (isTpl(it)) return
    if (it?.deviceId && it?.capability) {
      const r = ensureSource([], it.deviceId)
      setItem(i, { expr: `{${r.alias}.${it.capability}}`, sources: r.sources })
    } else setItem(i, { expr: '', sources: [] })
  }
  function toSingle(i) {
    const it = items[i]
    const ref = itemRef($devices, it)
    setItem(i, {
      expr: undefined,
      sources: undefined,
      deviceId: ref?.deviceId ?? it?.deviceId ?? null,
      capability: ref?.capability ?? it?.capability,
    })
  }

  const sources = $derived(widget.data?.sources ?? [])
  const insights = $derived(widget.data?.insights ?? [])
  const setSrc = (i, o) => { const a = [...sources]; a[i] = { ...a[i], ...o }; patchData({ sources: a }) }
  const logOf = (ins) => ($insightLogs ?? []).find((l) => l.id === insLogId(ins)) ?? null
  // Ha a beállított log nem létezik, felajánljuk ugyanannak az eszköznek a
  // tényleges logjait (tipikus eset: measure_power helyett energy_power).
  // Az általános előtagok (measure_, meter_) nem mondanak semmit arról, MIT mérünk,
  // ezért a rangsorhoz csak a beszédes szavakat használjuk (measure_power → "power").
  const GENERIC = new Set(['measure', 'meter', 'alarm', 'onoff', 'target'])
  const altLogs = (ins) => {
    const id = insLogId(ins)
    const dev = ins?.deviceId ?? (id?.startsWith('homey:device:') ? id.split(':')[2] : null)
    if (!dev) return []
    const want = String(ins?.capability ?? id?.split(':').pop() ?? '').toLowerCase()
    const tok = want.split(/[_.]/).filter((w) => w.length > 2 && !GENERIC.has(w))
    const score = (l) => {
      const c = l.cap.toLowerCase()
      let s = 0
      if (tok.some((w) => c.includes(w))) s -= 4 // ugyanarról a mérésről szól
      if (!c.includes('.')) s -= 2 // a fő capability előbb, mint az al-mérések
      if (l.lastValue !== null && l.lastValue !== undefined) s -= 1 // amiben van adat
      return s
    }
    return ($insightLogs ?? [])
      .filter((l) => l.deviceId === dev)
      .sort((a, b) => score(a) - score(b) || a.title.localeCompare(b.title, 'hu'))
      .slice(0, 6)
  }
  // A régi konfig ({ deviceId, capability }) is működik — ugyanaz a leképezés, mint a widgetben.
  const insLogId = (ins) =>
    ins?.logId ?? (ins?.deviceId && (ins.capability ?? ins.id) ? `homey:device:${ins.deviceId}:${ins.capability ?? ins.id}` : null)
  const insLabel = (ins, k) => {
    if (ins?.label) return ins.label
    const l = logOf(ins)
    return l ? `${l.owner} · ${l.title}` : `Sorozat ${k + 1}`
  }
  const setIns = (i, o) => {
    const a = [...insights]; a[i] = { ...a[i], ...o }
    patchData({ insights: a, labels: a.map((x, k) => insLabel(x, k)), legend: widget.data?.legend !== false })
  }
</script>

<div class="cfg">
  <div class="head">
    <span class="badge">{TYPE_NAME[widget.type] ?? widget.type}</span>
    <span class="dim">{widget.size.w}×{widget.size.h} · ({widget.pos?.x ?? 1},{widget.pos?.y ?? 1})</span>
    <button class="danger" onclick={() => removeWidget(dashId, pageId, widget.id)}>Törlés</button>
  </div>
  {#if oversize || outside}
    <p class="note warn">
      {#if oversize}
        Ez a típus ezen a panelen legfeljebb {max.w}×{max.h} lehet, ez a widget viszont {widget.size.w}×{widget.size.h}.
      {:else}
        Ez a widget kilóg a panel {panel.cols}×{panel.rows}-es rácsából.
      {/if}
      Az átméretezés már tartja a korlátot, de a meglévő méret és hely nem változott meg magától.
      <button class="chip" onclick={fitToMax}>Igazítás a rácshoz</button>
    </p>
  {/if}

  {#if widget.type === 'weather'}
    <p class="note">Az időjárás a dashboard koordinátáit használja — a <b>Beállítások</b> fülön állítható.</p>

  {:else if widget.type === 'thermostat'}
    <label>Címke<input value={widget.label ?? ''} oninput={(e) => patch({ label: e.target.value })} /></label>
    <div class="trow"><Toggle checked={widget.showLabel !== false} onchange={(c) => patch({ showLabel: c })} /><span>Címke megjelenítése</span></div>
    <label>Eszköz (termosztát)
      <DevicePicker value={widget.deviceId ?? null} caps={['target_temperature']} onchange={(v) => patch({ deviceId: v })} />
    </label>
    <label>Ikon<IconPicker value={widget.icon ?? 'thermo'} onchange={(v) => patch({ icon: v })} /></label>

  {:else if widget.type === 'button'}
    <label>Címke<input value={widget.label ?? ''} oninput={(e) => patch({ label: e.target.value })} /></label>
    <div class="trow"><Toggle checked={widget.showLabel !== false} onchange={(c) => patch({ showLabel: c })} /><span>Címke megjelenítése</span></div>
    <label>Ikon<IconPicker value={widget.icon ?? 'power'} onchange={(v) => patch({ icon: v })} /></label>
    <label>Típus<Select value={widget.kind ?? 'device'} options={KIND_OPTS} onchange={(v) => patch({ kind: v })} /></label>
    {#if (widget.kind ?? 'device') === 'device'}
      <label>Eszköz<DevicePicker value={widget.deviceId ?? null} caps={['onoff']} onchange={(v) => patch({ deviceId: v })} /></label>
      <label>Kapcsolható capability<Select value={widget.capability ?? 'onoff'} options={toggleCapOpts(widget.deviceId)} onchange={(v) => patch({ capability: v })} /></label>
    {:else}
      <label>Flow
        <FlowPicker value={widget.flowId ?? null} onchange={(v, f) => patch({ flowId: v, advanced: !!f?.advanced })} />
      </label>
    {/if}

    <div class="trow"><Toggle checked={!!widget.indicator} onchange={(c) => patch({ indicator: c ? (widget.indicator ?? { mode: 'dot', states: [] }) : undefined })} /><span>Indikátor (állapot)</span></div>
    {#if widget.indicator}
      {@const ind = widget.indicator}
      <label class="mini">Eszköz<DevicePicker value={ind.deviceId ?? null} caps={[]} onchange={(v) => setInd({ deviceId: v })} /></label>
      <label class="mini">Capability<Select value={ind.capability ?? ''} options={capOpts(ind.deviceId)} onchange={(v) => setInd({ capability: v })} /></label>
      <label class="mini">Megjelenés<Select value={ind.mode ?? 'dot'} options={IND_MODE_OPTS} onchange={(v) => setInd({ mode: v })} /></label>
      {#if (ind.mode ?? 'dot') === 'value'}
        <label class="mini">Mértékegység<input value={ind.unit ?? ''} oninput={(e) => setInd({ unit: e.target.value })} /></label>
      {:else}
        <div class="sec2">Állapotok</div>
        <div class="rows">
          {#each ind.states ?? [] as s, i}
            <div class="item">
              <div class="item-head">
                <input class="lbl" placeholder="Érték (pl. true, open, 1)" value={s.value ?? ''} oninput={(e) => setIState(i, { value: e.target.value })} />
                <button class="danger sm" title="Törlés" onclick={() => delIState(i)}>✕</button>
              </div>
              <input placeholder="Címke (opcionális)" value={s.label ?? ''} oninput={(e) => setIState(i, { label: e.target.value })} />
              {#if (ind.mode ?? 'dot') === 'icon'}
                <label class="mini">Ikon<IconPicker value={s.icon ?? 'power'} onchange={(v) => setIState(i, { icon: v })} /></label>
              {/if}
              <!-- a szín az ikonos módra is érvényes, állapotonként külön -->
              <div class="mini">Szín</div>
              <div class="swatches">
                {#each STATE_COLORS as c (c.value)}
                  <button
                    class="sw"
                    class:on={(s.color ?? null) === c.value}
                    style="background:{c.hex}"
                    title={c.label}
                    aria-label={c.label}
                    onclick={() => setIState(i, { color: c.value })}
                  ></button>
                {/each}
                <button
                  class="sw auto"
                  class:on={!s.color}
                  style="--auto:{(ind.mode ?? 'dot') === 'dot' ? stateColor('green') : 'var(--txt-dim)'}"
                  title={(ind.mode ?? 'dot') === 'dot' ? 'Alapértelmezett (zöld/szürke az érték szerint)' : 'Alapértelmezett (semleges)'}
                  aria-label="Alapértelmezett szín"
                  onclick={() => setIState(i, { color: undefined })}
                >A</button>
              </div>
            </div>
          {/each}
        </div>
        <button class="add" onclick={addIState}>+ Állapot</button>
      {/if}
    {/if}

  {:else if widget.type === 'sliderGroup'}
    <label>Típus<Select value={widget.variant ?? 'light'} options={VARIANT_OPTS} onchange={(v) => patch({ variant: v })} /></label>
    <div class="trow"><Toggle checked={widget.showLabel !== false} onchange={(c) => patch({ showLabel: c })} /><span>Fejléc (címke) megjelenítése</span></div>
    <div class="rows">
      {#each items as it, i}
        <div class="item">
          <div class="item-head">
            <input class="lbl" placeholder="Címke" value={it.label ?? ''} oninput={(e) => setItem(i, { label: e.target.value })} />
            <button class="danger sm" title="Törlés" onclick={() => delItem(i)}>✕</button>
          </div>
          <label class="mini">Homey eszköz
            <DevicePicker value={it.deviceId ?? null} caps={CAPS_BY_VARIANT[widget.variant ?? 'light']} onchange={(v) => setItem(i, { deviceId: v })} />
          </label>
          {#if (widget.variant ?? 'light') === 'vertical'}
            <label class="mini">Típus
              <Select value={it.capability ?? 'dim'} options={VCAP_OPTS} onchange={(v) => setItem(i, { capability: v })} />
            </label>
          {/if}
          <div class="trow"><Toggle checked={!!it.invert} onchange={(c) => setItem(i, { invert: c })} /><span>Inverz irány</span></div>
        </div>
      {/each}
    </div>
    <button class="add" onclick={addItem}>+ Csúszka</button>

  {:else if widget.type === 'chart'}
    <div class="two">
      <label>Típus<Select value={widget.chart ?? 'donut'} options={CHART_OPTS} onchange={(v) => patch({ chart: v })} /></label>
      <label>Cím<input value={widget.data?.title ?? ''} oninput={(e) => patchData({ title: e.target.value })} /></label>
    </div>
    <div class="trow"><Toggle checked={widget.showLabel !== false} onchange={(c) => patch({ showLabel: c })} /><span>Cím megjelenítése</span></div>

    {#if (widget.chart ?? 'donut') !== 'line'}
      <div class="trow"><Toggle checked={!!widget.data?.sources} onchange={(c) => patchData({ sources: c ? sources : undefined })} /><span>Élő adat (fogyasztás, measure_power)</span></div>
      {#if widget.data?.sources}
        <div class="trow"><Toggle checked={widget.data?.legend !== false} onchange={(c) => patchData({ legend: c })} /><span>Fogyasztólista (jelmagyarázat)</span></div>
        {#if (widget.chart ?? 'donut') === 'donut'}
          <div class="trow"><Toggle checked={!!widget.data?.full} onchange={(c) => patchData({ full: c })} /><span>Középső összeg + kiemelt elem</span></div>
          <div class="trow"><Toggle checked={!!widget.data?.rotate} onchange={(c) => patchData({ rotate: c })} /><span>Fogyasztók végigpörgetése</span></div>
          {#if widget.data?.rotate}
            <label>Váltás sebessége
              <Select value={widget.data?.rotateMs ?? 4000} options={ROTATE_OPTS} onchange={(v) => patchData({ rotateMs: v })} />
            </label>
            <p class="note">A fánk ciklikusan kiemeli az egyes fogyasztókat: középen a nevük és a mért értékük látszik, a jelmagyarázatban is az aktuális elem van kiemelve.</p>
          {/if}
        {/if}
        <label>Mértékegység<input placeholder="pl. W" value={widget.data?.unit ?? ' W'} oninput={(e) => patchData({ unit: e.target.value })} /></label>
        <div class="rows">
          {#each sources as s, i}
            <div class="item">
              <div class="item-head">
                <input class="lbl" placeholder="Címke" value={s.label ?? ''} oninput={(e) => setSrc(i, { label: e.target.value })} />
                <button class="danger sm" title="Törlés" onclick={() => patchData({ sources: sources.filter((_, k) => k !== i) })}>✕</button>
              </div>
              <label class="mini">Homey eszköz
                <DevicePicker value={s.deviceId ?? null} caps={[]} onchange={(v) => setSrc(i, { deviceId: v })} />
              </label>
              <label class="mini">Mért érték
                <Select value={s.cap ?? 'measure_power'} options={numCapOpts(s.deviceId)} placeholder="Válassz capability-t" onchange={(v) => setSrc(i, { cap: v })} />
              </label>
              {#if s.deviceId && s.cap && $devices[s.deviceId]?.capabilities?.[s.cap] === undefined}
                <p class="note">Ennek az eszköznek nincs ilyen capability-je.</p>
              {/if}
            </div>
          {/each}
        </div>
        <button class="add" onclick={() => patchData({ sources: [...sources, { label: '', deviceId: null }] })}>+ Forrás</button>
      {:else}
        <p class="note">Minta adat jelenik meg. Kapcsold be az élő adatot fent.</p>
      {/if}
    {:else}
      <div class="trow"><Toggle checked={!!widget.data?.insights} onchange={(c) => patchData({ insights: c ? (insights.length ? insights : [{ logId: null, resolution: 'last24Hours' }]) : undefined })} /><span>Élő adat (Insights idősor)</span></div>
      {#if widget.data?.insights}
        {#if !$insightLogs.length}
          <p class="note">Csatlakozz a Homey-hoz (Beállítások), hogy a log-lista betöltsön.</p>
        {/if}
        <div class="rows">
          {#each insights as ins, i}
            {@const lg = logOf(ins)}
            <div class="item">
              <label class="mini">Insights-log
                <InsightPicker
                  value={insLogId(ins)}
                  onchange={(v, l) => setIns(i, { logId: v, deviceId: undefined, capability: undefined, label: ins.label ?? (l ? `${l.owner} · ${l.title}` : undefined) })}
                />
              </label>
              {#if insLogId(ins) && $insightLogs.length && !lg}
                <p class="note warn">Ehhez a beállításhoz nincs log a Homey-n — ezért maradt üres a grafikon. Válassz a listából (pl. az energiamérők <code>energy_power</code> néven logolnak, nem <code>measure_power</code>).</p>
                {#if altLogs(ins).length}
                  <div class="chips">
                    <span class="chl">Ennek az eszköznek van:</span>
                    {#each altLogs(ins) as a (a.id)}
                      <button class="chip" onclick={() => setIns(i, { logId: a.id, deviceId: undefined, capability: undefined, label: `${a.owner} · ${a.title}` })}>
                        {a.title} <code>{a.cap}</code>
                      </button>
                    {/each}
                  </div>
                {/if}
              {:else if lg && lg.lastValue === null}
                <p class="note">Ez a log létezik, de még nincs benne adat.</p>
              {/if}
              <div class="two">
                <label class="mini">Címke<input placeholder={insLabel(ins, i)} value={ins.label ?? ''} oninput={(e) => setIns(i, { label: e.target.value || undefined })} /></label>
                <label class="mini">Időszak<Select value={ins.resolution ?? 'last24Hours'} options={RES_OPTS} onchange={(v) => setIns(i, { resolution: v })} /></label>
              </div>
              <div class="trow">
                <Toggle checked={ins.fill ?? !!widget.data?.fill} onchange={(c) => setIns(i, { fill: c })} />
                <span>Kitöltés a vonal alatt</span>
              </div>
              <div class="mini">Szín</div>
              <div class="swatches">
                {#each SERIES_COLORS as c (c.value)}
                  <button
                    class="sw"
                    class:on={(ins.color ?? null) === c.value}
                    style="background:{c.hex}"
                    title={c.label}
                    aria-label={c.label}
                    onclick={() => setIns(i, { color: c.value })}
                  ></button>
                {/each}
                <button
                  class="sw auto"
                  class:on={!ins.color}
                  style="--auto:{seriesColor(null, i)}"
                  title="Alapértelmezett (sorszám szerint)"
                  aria-label="Alapértelmezett szín"
                  onclick={() => setIns(i, { color: undefined })}
                >A</button>
              </div>
              <button class="danger sm end" onclick={() => patchData({ insights: insights.filter((_, k) => k !== i), labels: insights.filter((_, k) => k !== i).map((x, k) => insLabel(x, k)) })}>✕ Sorozat</button>
            </div>
          {/each}
        </div>
        <button class="add" onclick={() => patchData({ insights: [...insights, { logId: null, resolution: 'last24Hours' }] })}>+ Sorozat</button>
        <div class="sec2">Megjelenés</div>
        <div class="trow"><Toggle checked={widget.data?.legend !== false} onchange={(c) => patchData({ legend: c })} /><span>Jelmagyarázat (utolsó értékkel)</span></div>
        <div class="trow"><Toggle checked={!!widget.data?.axis} onchange={(c) => patchData({ axis: c })} /><span>Segédvonalak + min/max érték</span></div>
<!-- a kitöltés sorozatonként állítható (lásd fent), itt nincs globális kapcsoló -->
        {#if insights.length > 1}
          <div class="trow"><Toggle checked={widget.data?.ownScale !== false} onchange={(c) => patchData({ ownScale: c })} /><span>Sorozatok külön skálázása</span></div>
          <p class="note">Külön skálázás nélkül a nagyobb értékű sorozat (pl. W) laposra nyomja a kisebbet (pl. °C).</p>
        {/if}
      {:else}
        <p class="note">Minta adat jelenik meg. Kapcsold be az élő adatot fent.</p>
      {/if}
    {/if}

  {:else if widget.type === 'mood'}
    <label>Címke<input value={widget.label ?? ''} oninput={(e) => patch({ label: e.target.value })} /></label>
    <div class="trow"><Toggle checked={widget.showLabel !== false} onchange={(c) => patch({ showLabel: c })} /><span>Címke megjelenítése</span></div>
    <label>Ikon<IconPicker value={widget.icon ?? 'mood'} onchange={(v) => patch({ icon: v })} /></label>
    <label>Forrás<Select value={widget.source ?? 'favorite'} options={MOOD_SOURCE_OPTS} onchange={(v) => patch({ source: v })} /></label>
    {#if (widget.source ?? 'favorite') === 'zone'}
      <label>Zóna<Select value={widget.zoneId ?? ''} options={zoneOpts} placeholder="Válassz zónát" onchange={(v) => patch({ zoneId: v })} /></label>
      {#if !$zones.length}<p class="note">Csatlakozz a Homey-hoz (Beállítások), hogy a zónák betöltsenek.</p>{/if}
    {:else if (widget.source ?? 'favorite') === 'selected'}
      <div class="sec2">Mood-ok</div>
      {#if $moods.length}
        <div class="rows">
          {#each $moods as m (m.id)}
            <label class="mrow"><Toggle checked={(widget.moodIds ?? []).includes(m.id)} onchange={(c) => toggleMood(m.id, c)} /><span>{m.name}</span></label>
          {/each}
        </div>
      {:else}
        <p class="note">Csatlakozz a Homey-hoz (Beállítások), hogy a mood-ok betöltsenek.</p>
      {/if}
    {:else}
      <p class="note">A Homey-ban <b>kedvencnek</b> jelölt mood-ok jelennek meg.</p>
    {/if}

  {:else if widget.type === 'qr'}
    <label>Címke<input value={widget.label ?? ''} oninput={(e) => patch({ label: e.target.value })} /></label>
    <div class="trow"><Toggle checked={widget.showLabel !== false} onchange={(c) => patch({ showLabel: c })} /><span>Címke megjelenítése</span></div>
    <label>Ikon<IconPicker value={widget.icon ?? 'wifi'} onchange={(v) => patch({ icon: v })} /></label>
    <label>Tartalom<Select value={widget.mode ?? 'wifi'} options={QR_MODE_OPTS} onchange={(v) => patch({ mode: v })} /></label>
    {#if (widget.mode ?? 'wifi') === 'wifi'}
      <label>Hálózat neve (SSID)
        <input value={widget.wifi?.ssid ?? ''} oninput={(e) => patchWifi({ ssid: e.target.value })} autocomplete="off" />
      </label>
      {#if (widget.wifi?.security ?? 'WPA') !== 'none'}
        <label>Jelszó
          <input value={widget.wifi?.password ?? ''} oninput={(e) => patchWifi({ password: e.target.value })} autocomplete="off" />
        </label>
      {/if}
      <label>Titkosítás
        <Select value={widget.wifi?.security ?? 'WPA'} options={QR_SEC_OPTS} onchange={(v) => patchWifi({ security: v })} />
      </label>
      <div class="trow">
        <Toggle checked={!!widget.wifi?.hidden} onchange={(c) => patchWifi({ hidden: c })} /><span>Rejtett hálózat</span>
      </div>
      <p class="note">
        A csempén csak az ikon (és a címke) látszik; a kód a <b>kattintásra nyíló ablakban</b> jelenik meg
        nagyban, hogy a telefon kamerájával be lehessen olvasni. A jelszó <b>titkosítatlanul</b> kerül a
        mentett állapotba (<code>data/state.json</code>) — vendég-hálózathoz való, nem a fő wifidhez.
      </p>
    {:else}
      <label>Szöveg vagy URL
        <textarea rows="3" value={widget.text ?? ''} oninput={(e) => patch({ text: e.target.value })}></textarea>
      </label>
      <p class="note">Bármi lehet, amit a telefon kamerája felismer: URL, telefonszám, szöveg.</p>
    {/if}

  {:else if widget.type === 'bkk'}
    <BkkRoutePicker value={widget.routes ?? []} onchange={(v) => patch({ routes: v })} />

  {:else if widget.type === 'mohu'}
    <label>Címke<input value={widget.label ?? ''} oninput={(e) => patch({ label: e.target.value })} /></label>
    <div class="trow"><Toggle checked={widget.showLabel !== false} onchange={(c) => patch({ showLabel: c })} /><span>Címke megjelenítése</span></div>
    <p class="note">
      A cím (kerület, közterület, házszám) <b>globális</b>: a <b>Beállítások</b> fülön állítható, és minden
      Szemétszállítás widget azt használja. A widget hulladék-típusonként a következő szállítás dátumát mutatja.
    </p>

  {:else if widget.type === 'info'}
    <label>Címke<input value={widget.label ?? ''} oninput={(e) => patch({ label: e.target.value })} /></label>
    <div class="trow"><Toggle checked={widget.showLabel !== false} onchange={(c) => patch({ showLabel: c })} /><span>Címke megjelenítése</span></div>
    <label>Elrendezés<Select value={widget.variant ?? 'grid'} options={INFO_VARIANT_OPTS} onchange={(v) => patch({ variant: v })} /></label>
    <p class="note">A mértékegység, a tizedesek és a kitöltés-sáv a Homey capability-adataiból jön — nem kell beírni. Az elemek száma nincs korlátozva, a csempék a widget méretéhez rendeződnek. Egy csempe lehet <b>sablon</b> is: több capability egy értékben, közé írt szöveggel — pl. <b>24.9 °C → 25 °C</b> (aktuális → elvárt).</p>
    <div class="sec2">Értékek</div>
    <div class="rows">
      {#each items as it, i}
        {@const m = it.deviceId ? ($devices[it.deviceId]?.capsMeta ?? {})[it.capability] : null}
        <div class="item">
          <div class="item-head">
            <input class="lbl" placeholder={m?.title ?? 'Címke (opcionális)'} value={it.label ?? ''} oninput={(e) => setItem(i, { label: e.target.value })} />
            <button class="danger sm" title="Törlés" onclick={() => delItem(i)}>✕</button>
          </div>
          <div class="seg">
            <button class:on={!isTpl(it)} onclick={() => toSingle(i)}>Egy érték</button>
            <button class:on={isTpl(it)} onclick={() => toTpl(i)}>Sablon</button>
          </div>
          {#if isTpl(it)}
            <TemplateEditor
              value={it.expr ?? ''}
              sources={it.sources ?? []}
              unit={it.unit ?? ''}
              onchange={(expr, srcs) => setItem(i, { expr, sources: srcs })}
            />
            <label class="mini">Mértékegység a végére (opcionális)
              <input value={it.unit ?? ''} placeholder="pl. kWh, %, Ft" oninput={(e) => setItem(i, { unit: e.target.value || undefined })} />
            </label>
          {:else}
            <label class="mini">Homey eszköz
              <DevicePicker value={it.deviceId ?? null} caps={[]} onchange={(v) => setItem(i, { deviceId: v, capability: undefined })} />
            </label>
            <label class="mini">Érték (capability)
              <Select value={it.capability ?? ''} options={readCapOpts(it.deviceId)} placeholder="Válassz capability-t" onchange={(v) => setItem(i, { capability: v })} />
            </label>
            {#if m}
              <p class="note">
                {m.title ?? it.capability} · {m.type}{m.units ? ' · ' + m.units : ''}{m.min !== null && m.max !== null ? ` · ${m.min}–${m.max}` : ''}
                — most: <b>{String($devices[it.deviceId]?.capabilities?.[it.capability] ?? '—')}</b>
              </p>
            {/if}
          {/if}
          <label class="mini">Ikon<IconPicker value={it.icon ?? 'gauge'} onchange={(v) => setItem(i, { icon: v })} /></label>
          <div class="mini">Szín</div>
          <div class="swatches">
            {#each SERIES_COLORS as c (c.value)}
              <button
                class="sw"
                class:on={(it.color ?? null) === c.value}
                style="background:{c.hex}"
                title={c.label}
                aria-label={c.label}
                onclick={() => setItem(i, { color: c.value })}
              ></button>
            {/each}
            <button
              class="sw auto"
              class:on={!it.color}
              style="--auto:{seriesColor(null, i)}"
              title="Alapértelmezett (sorszám szerint)"
              aria-label="Alapértelmezett szín"
              onclick={() => setItem(i, { color: undefined })}
            >A</button>
          </div>
        </div>
      {/each}
    </div>
    <button class="add" onclick={() => patch({ items: [...items, { deviceId: null, capability: undefined, icon: 'gauge' }] })}>+ Érték</button>
  {/if}
</div>

<style>
  .cfg { display: flex; flex-direction: column; gap: 12px; }
  .head { display: flex; align-items: center; gap: 8px; }
  .badge { font-weight: 700; padding: 3px 11px; border-radius: 999px; background: linear-gradient(135deg, var(--teal), var(--blue)); color: #05130f; font-size: 12px; }
  .dim { font-size: 11px; color: var(--txt-mute); }
  .head .danger { margin-left: auto; }

  label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--txt-dim); }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  input { width: 100%; height: 36px; border-radius: 10px; border: 1px solid var(--line); background: var(--card-2); color: var(--txt); padding: 0 10px; font: inherit; font-size: 13px; }
  input:focus { outline: none; border-color: var(--blue); }
  .note { font-size: 12px; color: var(--txt-mute); line-height: 1.5; background: var(--card-2); padding: 10px; border-radius: 10px; }
  .note.warn { color: #ffc2c9; background: rgba(255, 122, 137, 0.12); }
  /* sorozat-szín választó: a paletta nyolc színe + "A" = sorszám szerinti alap */
  .swatches { display: flex; flex-wrap: wrap; gap: 7px; }
  .sw {
    width: 26px; height: 26px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.14);
    cursor: pointer; padding: 0; transition: 0.12s;
  }
  .sw:hover { transform: translateY(-1px); }
  .sw.on { box-shadow: 0 0 0 2px var(--card), 0 0 0 4px var(--blue); }
  .sw.auto {
    background: var(--card-2); color: var(--txt-mute); font: inherit; font-size: 11px; font-weight: 700;
    border-color: var(--auto);
  }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .chl { font-size: 11px; color: var(--txt-mute); }
  .chip {
    height: 26px; padding: 0 9px; border-radius: 8px; border: 1px solid var(--line);
    background: var(--card-2); color: var(--txt-dim); font: inherit; font-size: 11px; cursor: pointer;
  }
  .chip:hover { border-color: var(--blue); color: var(--txt); }
  .chip code { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: var(--txt-mute); }
  .note code { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--txt-dim); }
  .trow { display: flex; align-items: center; gap: 10px; font-size: 13px; }
  textarea {
    font: inherit; font-size: 13px; color: var(--txt); background: var(--card-2);
    border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; resize: vertical;
  }
  textarea:focus { outline: none; border-color: var(--blue); }
  .sec2 { font-size: 11px; font-weight: 700; color: var(--txt-mute); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 4px; }
  label.mrow { flex-direction: row; align-items: center; gap: 10px; font-size: 13px; color: var(--txt); }

  .rows { display: flex; flex-direction: column; gap: 8px; }
  .item {
    display: flex; flex-direction: column; gap: 8px;
    background: var(--card-2); border: 1px solid var(--line); border-radius: 12px; padding: 10px;
  }
  .item-head { display: flex; align-items: center; gap: 8px; }
  /* mód-váltó: egy érték ⇄ sablon */
  .seg { display: flex; gap: 0; align-self: flex-start; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .seg button { border: 0; border-radius: 0; background: transparent; color: var(--txt-mute); font-size: 12px; padding: 6px 12px; }
  .seg button.on { background: var(--blue-soft); color: #cfe0ff; }
  .item-head .lbl { flex: 1; min-width: 0; }
  label.mini { gap: 4px; font-size: 11px; color: var(--txt-mute); }
  button { cursor: pointer; border: 1px solid var(--line); background: var(--card-2); color: var(--txt); border-radius: 10px; padding: 8px 12px; font: inherit; }
  button:hover { background: #2c2c33; }
  button.add { align-self: flex-start; background: var(--blue-soft); border-color: rgba(76, 141, 255, 0.4); color: #cfe0ff; }
  button.danger { color: #ff7a89; }
  button.danger.sm { padding: 8px 9px; }
  button.danger.end { align-self: flex-end; }
</style>
