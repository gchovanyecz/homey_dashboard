<script>
  // Húzás-követő, transzformáció-alapú lapozó.
  //
  // Gesztus-politika (EGY helyen, itt él — a widgetek nem döntenek róla):
  //   • egy ujj  → mindig a vezérlőké (csúszka, gomb, hangulat-chip)
  //   • két ujj  → oldal-lapozás a pointerek centroidja alapján; a folyamatban lévő
  //                vezérlő-interakciót megszakítja (elvesszük tőle a pointer-capture-t)
  //   • egér/pen → egypointeres, irány-lockolt lapozás (fizikailag nincs 2 ujj), hogy a
  //                böngészős előnézet/dev használható maradjon
  // Az üzemmód az adminban állítható (ui.swipeFingers: 2 | 1).
  //
  // A gesztust CAPTURE fázisban ismerjük fel, hogy a widgetek buborékolási
  // stopPropagation-je ne nyelhesse el a mozdulat kezdetét. Elengedéskor CSAK
  // konkrét oldalon áll meg.
  import { gesture, DRAG_SEL, MODAL_SEL } from '../lib/gesture.js'
  import { ui, panel } from '../lib/dashboards.js'

  let { count, index = $bindable(0), children } = $props()

  /* A lap szélessége a panel-profilból (480, Pro 120 fekvőben 854). Sima let,
     mert a capture-handlerek szinkron olvassák — lásd lentebb a $effect-et. */
  let W = $panel.w
  let THRESHOLD = W * 0.15 // elengedéskori küszöb a lap TÉNYLEGES elmozdulására
  const LOCK1 = 10 // px — egypointeres ág irány-döntése
  const LOCK2 = 12 // px — kétujjas ág: ennyi centroid-út után dönt (elnyeli az ujjak "beülését")
  const VFLICK = 0.35 // px/ms — pöccintés-sebesség
  const FLICK_MIN = 20 // px — a sebesség-ág minimális elmozdulása (rezgés ne lapozzon)
  const TAIL = 120 // ms — sebesség-mintaablak

  // Diagnosztika a panelen: ?gesture=debug vagy localStorage.gestureDebug = '1'
  const DEBUG =
    new URLSearchParams(location.search).has('gesture') || localStorage.getItem('gestureDebug') === '1'

  let curTX = $state(0)
  let animate = $state(false)
  let pagerEl
  let dbg = $state(DEBUG ? 'gesztus-debug' : null)

  // Lapozási mód az adminból. Sima let: a capture-handlerek szinkron olvassák,
  // és nem akarjuk a listener-regisztrációt újrafuttatni miatta.
  let fingers = 2
  $effect(() => {
    fingers = $ui?.swipeFingers === 1 ? 1 : 2
    tick()
  })

  // ---- gesztus-állapot (nem reaktív) ----
  const pts = new Map() // pointerId -> { x, y, type }
  let armed = false // van érvényes lapozási szándék (még a küszöb előtt)
  let paging = false // fut a lapozás: elvettük a pointer-capture-t
  let locked = null // null | 'page' | 'other'
  let blocked = false // modál felett indult a gesztus → a gesztus végéig tilos lapozni
  let baseCX = 0
  let baseCY = 0
  let startTX = 0
  let samples = [] // [{ t, x }] — sebességbecslés a curTX történetéből
  let pagedAt = 0
  let maxTouches = 0 // debug: a valaha látott legtöbb egyidejű érintés
  let stolen = 0 // debug: hányszor vettük el sikeresen a capture-t

  function go(i) {
    index = Math.max(0, Math.min(count - 1, i))
    animate = true
    curTX = -index * W
  }

  // Külső index-változást (pl. admin átrendezés) és panel-váltást is kövessük.
  $effect(() => {
    W = $panel.w
    THRESHOLD = W * 0.15
    if (!paging) curTX = -index * W
  })

  function touchCount() {
    let n = 0
    for (const p of pts.values()) if (p.type !== 'mouse' && p.type !== 'pen') n++
    return n
  }
  function centroid() {
    let x = 0
    let y = 0
    for (const p of pts.values()) {
      x += p.x
      y += p.y
    }
    const n = pts.size || 1
    return { x: x / n, y: y / n }
  }

  // Minden pointer-készlet-változásnál újra kell alapozni: különben a centroid ugrik
  // (ujj hozzáadása/elvétele akár 100px-t is), és vele ugrik a lap.
  function rebase() {
    const c = centroid()
    baseCX = c.x
    baseCY = c.y
    startTX = curTX
  }
  function syncGesture() {
    gesture.touches = touchCount()
    gesture.paging = paging
  }

  // 1. fokozat — a 2. ujj leért: a vezérlők befagynak (gesture.touches), de a capture még náluk van.
  function arm() {
    armed = true
    locked = null
    gesture.epoch++ // a vezérlők ebből tudják, hogy kétujjas gesztus kezdődött
    rebase()
  }
  // 2. fokozat — tényleges elmozdulás: elvesszük a capture-t MINDEN pointerre, így a
  // folyamatban lévő vezérlő-interakció `lostpointercapture`-t kap és tisztán leáll.
  function promote() {
    locked = 'page'
    paging = true
    syncGesture()
    for (const id of pts.keys()) {
      try {
        pagerEl.setPointerCapture(id)
        stolen++
      } catch {}
    }
  }

  function reset() {
    pts.clear()
    armed = false
    paging = false
    locked = null
    blocked = false
    samples = []
    syncGesture()
    tick()
  }

  function translate(dx) {
    let x = startTX + dx
    const min = -(count - 1) * W
    if (x > 0) x *= 0.3 // gumis szél
    if (x < min) x = min + (x - min) * 0.3
    curTX = x
    const t = performance.now()
    samples.push({ t, x })
    while (samples.length > 2 && t - samples[0].t > TAIL) samples.shift()
  }
  function velocity() {
    if (samples.length < 2) return 0
    const a = samples[0]
    const b = samples[samples.length - 1]
    return b.t - a.t > 8 ? (b.x - a.x) / (b.t - a.t) : 0
  }

  function onDown(e) {
    const type = e.pointerType || 'touch'
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, type })
    if (touchCount() > maxTouches) maxTouches = touchCount()
    // A modál-tiltás a gesztus EGÉSZÉRE ragad: ha az első ujj a popup backdropján indult
    // (ami be is zárja a popupot), a második ujj se indíthasson lapozást.
    if (e.target?.closest && e.target.closest(MODAL_SEL)) blocked = true
    syncGesture()

    const onePointer = type === 'mouse' || type === 'pen' || fingers === 1
    if (onePointer) {
      // Egypointeres ág: a húzható vezérlő-sávok ([data-drag]) megtartják a gesztust.
      if (!armed && !paging) {
        animate = false
        locked = null
        armed = !blocked && !(e.target?.closest && e.target.closest(DRAG_SEL))
        if (armed) rebase()
      } else if (armed) {
        rebase() // további pointer az egypointeres ágon: ne ugorjon a centroid
      }
    } else if (paging) {
      rebase() // 3. (vagy további) ujj lapozás közben — nincs ugrás
    } else if (touchCount() >= 2 && !blocked) {
      animate = false
      arm()
    }
    tick()
  }

  function onMove(e) {
    const p = pts.get(e.pointerId)
    if (!p) return
    p.x = e.clientX
    p.y = e.clientY
    if (blocked || !armed) return
    const c = centroid()
    const dx = c.x - baseCX
    const dy = c.y - baseCY
    if (locked === null) {
      const lock = touchCount() >= 2 ? LOCK2 : LOCK1
      if (Math.hypot(dx, dy) < lock) return
      if (Math.abs(dx) > Math.abs(dy)) promote()
      else {
        locked = 'other' // függőleges/egyéb szándék → nem a lapozóé
        return
      }
    }
    if (locked === 'page') {
      e.preventDefault()
      translate(dx)
      tick()
    }
  }

  function onUp(e) {
    if (!pts.delete(e.pointerId)) return
    syncGesture()
    // A maradék ujj folytatja; döntés CSAK az utolsó felengedésnél. Így egy pillanatnyi
    // kontaktus-vesztés nem szakítja meg félbe a swipe-ot.
    if (pts.size === 0) finish()
    else if (paging) rebase()
    tick()
  }

  function finish() {
    if (paging) {
      // A döntés a lap tényleges elmozdulásából jön, nem a dx-ből: a rebase() nullázza a dx-et,
      // a travel viszont rebase-immun (és a gumis szélen sem lép át a küszöbön).
      const travel = curTX + index * W
      const v = velocity()
      pagedAt = performance.now()
      if (travel <= -THRESHOLD || (v <= -VFLICK && travel < -FLICK_MIN)) go(index + 1)
      else if (travel >= THRESHOLD || (v >= VFLICK && travel > FLICK_MIN)) go(index - 1)
      else go(index)
    }
    reset()
  }

  function onCancel(e) {
    if (!pts.delete(e.pointerId)) return
    syncGesture()
    if (pts.size === 0) {
      if (paging) go(index) // visszapattan az aktuális oldalra
      reset()
    } else if (paging) {
      rebase() // részleges cancel: folytatás ugrás nélkül
    }
    tick()
  }

  // Kioszkban hetekig fut: egy elveszett pointerup a Map-modellben tartósan elrontana
  // mindent (a panel örökké "2 ujjat" látna → minden vezérlő befagyva).
  function hardReset() {
    if (pts.size === 0) return
    if (paging) go(index)
    reset()
  }

  // A capture-elvétel után a click a pagerEl-re retargetál, tehát a gomb nem sül el.
  // Ez másodlagos biztosíték, ha a WebView mégis a gombra küldené.
  function onClickCapture(e) {
    if (performance.now() - pagedAt < 350) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  function tick() {
    if (!DEBUG) return
    const types = [...pts.values()].map((p) => p.type[0]).join('')
    dbg =
      `max:${maxTouches} now:${pts.size}${types ? ' ' + types : ''} mód:${fingers}ujj\n` +
      `armed:${armed ? 1 : 0} page:${paging ? 1 : 0} lock:${locked ?? '-'} blk:${blocked ? 1 : 0}\n` +
      `travel:${Math.round(curTX + index * W)} steal:${stolen} v:${velocity().toFixed(2)}`
  }

  // Capture-fázisú listenerek: a target saját (buborékolási) kezelői ELŐTT futnak.
  $effect(() => {
    const el = pagerEl
    if (!el) return
    const opts = { capture: true, passive: false }
    el.addEventListener('pointerdown', onDown, opts)
    el.addEventListener('pointermove', onMove, opts)
    el.addEventListener('pointerup', onUp, opts)
    el.addEventListener('pointercancel', onCancel, opts)
    el.addEventListener('click', onClickCapture, { capture: true })
    window.addEventListener('blur', hardReset)
    document.addEventListener('visibilitychange', hardReset)
    return () => {
      el.removeEventListener('pointerdown', onDown, opts)
      el.removeEventListener('pointermove', onMove, opts)
      el.removeEventListener('pointerup', onUp, opts)
      el.removeEventListener('pointercancel', onCancel, opts)
      el.removeEventListener('click', onClickCapture, { capture: true })
      window.removeEventListener('blur', hardReset)
      document.removeEventListener('visibilitychange', hardReset)
    }
  })

  function onKey(e) {
    if (e.key === 'ArrowRight') go(index + 1)
    if (e.key === 'ArrowLeft') go(index - 1)
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="pager-wrap">
  <div
    class="pager"
    class:animate
    bind:this={pagerEl}
    style="transform: translateX({curTX}px)"
  >
    {@render children()}
  </div>

  <!-- A .pager transzformált, ezért a debug overlay a TESTVÉRE: benne együtt csúszna a lapokkal. -->
  {#if DEBUG && dbg}<div class="gdbg">{dbg}</div>{/if}
</div>

<style>
  .pager-wrap {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .pager {
    display: flex;
    width: var(--panel-w);
    height: var(--panel-h);
    will-change: transform;
    touch-action: none;
  }
  .pager.animate {
    transition: transform 0.34s cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  .gdbg {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 999;
    pointer-events: none;
    font: 9px/1.3 ui-monospace, Menlo, monospace;
    background: rgba(0, 0, 0, 0.72);
    color: var(--chart-hl);
    padding: 2px 4px;
    white-space: pre;
  }
</style>
