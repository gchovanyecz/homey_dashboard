<script>
  import { icon } from '../../lib/icons.js'
  import { devices, connection } from '../../lib/stores.js'
  import { setCapability, subscribe } from '../../lib/homey.js'
  import { gesture } from '../../lib/gesture.js'

  let {
    orientation = 'horizontal',
    value = 50,
    accent = 'amber', // amber | teal | blue
    mode = 'live', // 'live' = húzás közben küld (throttle) | 'release' = csak elengedéskor
    label = '',
    iconName = null,
    deviceId = null,
    capability = null,
    invert = false, // fordított irány: függőleges fentről le, vízszintes jobbról balra nő
  } = $props()

  const bound = !!deviceId && !!capability

  let val = $state(value)
  let trackEl = $state()
  // `dragging` SZÁNDÉKOSAN sima let (nem $state): ha reaktív lenne, az alábbi $effect minden
  // elengedésnél újrafutna — amikor a store még a régi értéket tartja (Homey echo 100-500 ms) —,
  // és a csúszka látványosan visszapattanna. Az újraszinkront az abort() kéri, syncTick-kel.
  let dragging = false
  let activePid = null // csak ez a pointer vezérli a sávot (kétujjas cross-talk ellen)
  let moved = false
  let epoch = 0 // gesture.epoch a lenyomás pillanatában
  let startX = 0
  let startY = 0
  const MOVE_EPS = 3 // px — ennyi elmozdulás után kezd követni
  let syncTick = $state(0)
  const THROTTLE = 200
  let lastSend = 0

  // élő érték szinkron a store-ból, amíg nem húz a felhasználó (0..1 → %).
  // inverz esetén a MEGJELENÍTETT érték is fordul (pl. redőnynél a kitöltés = mennyire van lehúzva).
  $effect(() => {
    syncTick // szándékos olvasás: az abort() ezzel kényszeríti az újraszinkront a store-ból
    if (bound && !dragging) {
      const v = $devices[deviceId]?.capabilities?.[capability]
      if (typeof v === 'number') {
        const p = Math.round(v * 100)
        val = invert ? 100 - p : p
      }
    }
  })
  $effect(() => {
    if (bound && $connection.status === 'connected') subscribe(deviceId, capability)
  })

  function pct(e) {
    const r = trackEl.getBoundingClientRect()
    let p
    if (orientation === 'vertical') {
      const fromTop = (e.clientY - r.top) / r.height
      p = invert ? fromTop : 1 - fromTop
    } else {
      const fromLeft = (e.clientX - r.left) / r.width
      p = invert ? 1 - fromLeft : fromLeft
    }
    return Math.max(0, Math.min(100, Math.round(p * 100)))
  }
  function send() {
    // dim / volume_set / windowcoverings_set: 0..1 tartomány. Inverznél a küldött érték is fordul.
    const out = (invert ? 100 - val : val) / 100
    if (bound) setCapability(deviceId, capability, out)
    else console.log(`[slider:${accent}:${mode}] ${label} = ${val}% → ${out}`)
  }
  function maybeLive() {
    if (mode !== 'live') return
    const now = performance.now()
    if (now - lastSend > THROTTLE) {
      lastSend = now
      send()
    }
  }
  function down(e) {
    e.stopPropagation() // szándék-jelzés; a lapozó capture fázisú, ezt nem látja
    if (activePid !== null) return // ugyanezen a sávon a 2. ujj ne szóljon bele
    if (gesture.touches > 1 || gesture.paging) return // épp kétujjas gesztus → a lapozóé
    activePid = e.pointerId
    dragging = true
    moved = false
    epoch = gesture.epoch
    startX = e.clientX
    startY = e.clientY
    try { trackEl.setPointerCapture(e.pointerId) } catch {}
    // Az érték SZÁNDÉKOSAN nem változik lenyomásra: így egy kétujjas lapozás első ujja
    // nem rántja meg a lámpát/redőnyt. Koppintásnál az up() állítja be.
  }
  function move(e) {
    if (!dragging || e.pointerId !== activePid) return
    if (stale()) return // kétujjas gesztus kezdődött → ez a húzás érvénytelen (sticky)
    if (!moved) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < MOVE_EPS) return
      moved = true
    }
    val = pct(e)
    maybeLive()
  }
  function up(e) {
    if (!dragging || (e && e.pointerId !== activePid)) return
    if (stale()) return abort()
    if (!moved) val = pct(e) // koppintás → ide álljon (nem lenyomásra, lásd down())
    dragging = false
    activePid = null
    send() // végső érték (release módnál ez az egyetlen küldés)
  }
  // Megszakítás: NEM küldünk (se régit, se újat), és újraszinkront kérünk a store-ból.
  function abort() {
    dragging = false
    activePid = null
    moved = false
    syncTick++
  }
  // "Elavult" a húzás, ha közben kétujjas gesztus indult (epoch nőtt) vagy már lapozunk.
  // Sticky: az epoch a húzás végéig eltér, tehát a 2. ujj felemelése után sem folytatódik —
  // a befagyás alatt az ujj elmozdulhatott, folytatásnál az érték ugrana.
  const stale = () => gesture.paging || gesture.epoch !== epoch
  const onCancel = (e) => { if (e.pointerId === activePid) abort() }
  // A lapozó elvette a capture-t: innen már NEM jön pointerup erre az elemre,
  // ezért ez az egyetlen tisztító hook — nélküle a `dragging` örökre igaz maradna.
  const onLost = (e) => { if (e.pointerId === activePid) abort() }
</script>

{#if orientation === 'vertical'}
  <div class="vcol">
    <span class="vv">{val}%</span>
    <div
      class="vtrk"
      class:inv={invert}
      data-drag
      role="slider"
      tabindex="0"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={val}
      aria-orientation="vertical"
      bind:this={trackEl}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={onCancel}
      onlostpointercapture={onLost}
    >
      <div class="vf {accent}-v" class:inv={invert} style="height:{val}%"></div>
      {#if iconName}<span class="vic {accent} no-bg">{@html icon(iconName)}</span>{/if}
    </div>
    <span class="vcap">{label}</span>
  </div>
{:else}
  <div class="slrow">
    <div class="l"><span class="nm">{label}</span><span class="pc">{val}%</span></div>
    <div
      class="trk"
      class:inv={invert}
      data-drag
      role="slider"
      tabindex="0"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={val}
      bind:this={trackEl}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={onCancel}
      onlostpointercapture={onLost}
    >
      <div class="f {accent}" class:inv={invert} style="width:{val}%"><span class="g"></span></div>
    </div>
  </div>
{/if}

<style>
  /* fill színek. A --dir a sávon van (öröklődik ide), és a kitöltés irányát követi,
     így a világos vég MINDIG a 100%-os oldal — a sötét vég a 0%, ahol az ikon is ül. */
  .amber { background: linear-gradient(var(--dir), #8a5a12, var(--amber)); }
  .teal  { background: linear-gradient(var(--dir), #1c6f5e, var(--teal)); }
  .blue  { background: linear-gradient(var(--dir), #254a86, var(--blue)); }
  .amber-v { background: linear-gradient(var(--dir), #8a5a12, var(--amber)); }
  .teal-v  { background: linear-gradient(var(--dir), #1c6f5e, var(--teal)); }
  .blue-v  { background: linear-gradient(var(--dir), #254a86, var(--blue)); }

  /* vízszintes */
  .slrow { display: flex; flex-direction: column; gap: 4px; }
  .l { display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
  .l .nm { color: var(--txt-dim); }
  .l .pc { color: var(--txt); font-variant-numeric: tabular-nums; }
  .trk {
    --dir: 90deg;
    position: relative; height: 24px; border-radius: 9px;
    /* A sáv háttere is az irányba világosodik: 0%-on, üres sávnál (ikon nélküli
       csúszkán) ez az egyetlen jel. A két vég a --card-2 (#232329) sötétebb/
       világosabb változata — fix hex, mint a fill színeknél, mert a panel
       WebView-ja nem biztos, hogy tudja a color-mix()-et. */
    background: linear-gradient(var(--dir), #1e1e24, #2b2b33);
    overflow: hidden; touch-action: none; cursor: pointer;
  }
  .trk.inv { --dir: 270deg; }
  .f {
    position: absolute; left: 0; top: 0; bottom: 0; border-radius: 9px;
    display: flex; align-items: center; justify-content: flex-end;
  }
  .f .g { width: 3px; height: 14px; border-radius: 2px; background: rgba(255, 255, 255, 0.9); margin-right: 7px; }
  /* fordított vízszintes: jobbról balra tölt */
  .f.inv { left: auto; right: 0; justify-content: flex-start; }
  .f.inv .g { margin-right: 0; margin-left: 7px; }

  /* függőleges */
  .vcol { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; height: 100%; }
  .vv { font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .vtrk {
    --dir: 0deg;
    position: relative; width: 24px; flex: 1; min-height: 36px; border-radius: 9px;
    background: linear-gradient(var(--dir), #1e1e24, #2b2b33); /* lásd .trk */
    overflow: hidden; touch-action: none; cursor: pointer;
  }
  .vtrk.inv { --dir: 180deg; }
  .vf { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 9px; }
  /* fordított függőleges: fentről lefelé tölt (a --dir a .vtrk.inv-en fordul) */
  .vf.inv { bottom: auto; top: 0; }
  .vic { position: absolute; left: 50%; transform: translateX(-50%); bottom: 5px; }
  .vtrk.inv .vic { bottom: auto; top: 5px; }
  .vic :global(svg) { width: 18px; height: 18px; }
  .vic.amber { color: var(--amber); }
  .vic.teal { color: var(--teal); }
  .vic.blue { color: var(--blue); }
  .vic.no-bg { background: none;}
  .vcap {
    font-size: 9px; color: var(--txt-mute); max-width: 100%;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
</style>
