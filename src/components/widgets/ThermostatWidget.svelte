<script>
  import { devices, connection } from '../../lib/stores.js'
  import { panel } from '../../lib/dashboards.js'
  import { setCapability, subscribe } from '../../lib/homey.js'
  import { icon } from '../../lib/icons.js'

  let { w } = $props()
  const iconName = w.icon ?? 'thermo'

  const label = w.label ?? 'Termosztát'
  const showLabel = w.showLabel !== false
  const isFull = $derived(w.size.w >= $panel.cols && w.size.h >= Math.min(4, $panel.rows))
  const horizontal = w.size.h === 1 // 2×1 / 3×1 / 4×1 → readonly csempe + popup
  const bound = !!w.deviceId

  /* A tárcsa skálája (és a beállítható tartomány) az eszköz
     target_temperature capability-jéből jön, így pontosan annyit engedünk,
     amennyit a Homey elfogad. Ha nincs meta (nincs kapcsolat / mock eszköz)
     vagy hibás (max <= min), 0..30 az alap.
     Egy osztás mindig 0.5 °C — ezért az osztásszám a tartományból adódik. */
  const STEP = 0.5
  const tMeta = $derived(bound ? ($devices[w.deviceId]?.capsMeta?.target_temperature ?? null) : null)
  const scale = $derived.by(() => {
    const lo = tMeta?.min,
      hi = tMeta?.max
    return typeof lo === 'number' && typeof hi === 'number' && hi > lo ? { lo, hi } : { lo: 0, hi: 30 }
  })
  const MIN = $derived(scale.lo)
  const MAX = $derived(scale.hi)
  const N = $derived(Math.max(2, Math.round((MAX - MIN) / STEP)))

  let target = $state(clamp(w.target ?? 22))
  let adjusting = false
  let showPopup = $state(false)

  const current = $derived(
    bound ? ($devices[w.deviceId]?.capabilities?.measure_temperature ?? w.current ?? 21.5) : (w.current ?? 21.5),
  )
  // irány: aktuális > cél → le, aktuális < cél → fel, egyenlő → vízszintes
  const dir = $derived(current > target + 0.05 ? 'down' : current < target - 0.05 ? 'up' : 'eq')

  $effect(() => {
    if (bound && !adjusting) {
      const t = $devices[w.deviceId]?.capabilities?.target_temperature
      if (typeof t === 'number') target = clamp(t)
    }
  })
  $effect(() => {
    if (bound && $connection.status === 'connected') {
      subscribe(w.deviceId, 'measure_temperature')
      subscribe(w.deviceId, 'target_temperature')
    }
  })

  // A rács a MIN-től indul (nem a nullától): ha az eszköz min-je pl. 4.7, akkor
  // a beállítható értékek 4.7 / 5.2 / 5.7 … — ugyanaz, amit a tárcsa rajzol.
  function clamp(v) {
    const lo = MIN,
      hi = MAX
    return Math.min(hi, Math.max(lo, lo + Math.round((v - lo) / STEP) * STEP))
  }
  function adj(delta) {
    adjusting = true
    target = clamp(target + delta)
    commit()
  }
  let sendT
  function commit() {
    clearTimeout(sendT)
    sendT = setTimeout(() => {
      if (bound) setCapability(w.deviceId, 'target_temperature', target)
      else console.log('[thermostat] set target_temperature =', target)
      adjusting = false
    }, 400)
  }

  /* „Scene" (jelenlét/üzemmód) választó a popupban.
     A Homey-nál ez eszközfüggő enum: a Tado-féléknél `location_preset`
     („Scene": home / away / asleep / vacation / no_frost), másutt
     `thermostat_mode` vagy hasonló. Ezért nem drótozzuk be: az első
     ÁLLÍTHATÓ enumot vesszük, aminek az azonosítója/címe erre utal. */
  const SCENE_HINT = /(location_preset|preset|scene|mode)/i
  const sceneCap = $derived.by(() => {
    if (!bound) return null
    const meta = $devices[w.deviceId]?.capsMeta ?? {}
    const ok = (id) => meta[id]?.type === 'enum' && meta[id]?.setable !== false && Array.isArray(meta[id]?.values)
    const id = ok('location_preset')
      ? 'location_preset'
      : Object.keys(meta).find((k) => ok(k) && SCENE_HINT.test(`${k} ${meta[k].title ?? ''}`))
    return id ? { id, title: meta[id].title ?? 'Scene', values: meta[id].values } : null
  })
  $effect(() => {
    if (bound && sceneCap && $connection.status === 'connected') subscribe(w.deviceId, sceneCap.id)
  })
  // alapból csak az AKTUÁLIS scene látszik; koppintásra nyílik a választó
  let sceneOpen = $state(false)
  /* A fekvő csempe MÉRT szélessége dönti el, mennyi fér ki a scene-ből. A
     címke és a hőmérséklet betűmérete NEM változik — inkább a scene marad el:
       4 rács-egység (≈452px): ikon + megnevezés
       3 egység       (≈343px): csak ikon
       2 egység       (≈221px): semmi (a hőmérséklet-sor kitölti a helyet) */
  let hW = $state(0)
  const sceneShows = $derived(hW >= 300)
  const sceneNameFits = $derived(hW >= 400)
  $effect(() => {
    if (!showPopup) sceneOpen = false
  })
  // a Homey visszaigazolásáig a saját választásunk látszik (mint a célhőmérsékletnél)
  let scenePending = $state(null)
  let sceneT
  const sceneValue = $derived(scenePending ?? (bound && sceneCap ? $devices[w.deviceId]?.capabilities?.[sceneCap.id] : null))
  function pickScene(v) {
    if (!sceneCap) return
    scenePending = v
    sceneOpen = false
    setCapability(w.deviceId, sceneCap.id, v)
    clearTimeout(sceneT)
    sceneT = setTimeout(() => (scenePending = null), 3000)
  }
  /* A scene NEVE a Homey-tól jönne (enum values[].title), az viszont a Homey
     nyelvén van — ezért a panelen hol angolul, hol magyarul jelent meg. A
     ismert értékeket saját magyar névre képezzük; ami nincs a listán, arra
     marad a Homey címkéje (végső esetben maga az azonosító). */
  const SCENE_LABEL = {
    home: 'Otthon', away: 'Távol', asleep: 'Alvás', sleep: 'Alvás', night: 'Éjszaka',
    vacation: 'Nyaralás', holiday: 'Nyaralás', no_frost: 'Fagyvédelem', frost_protection: 'Fagyvédelem',
    heat: 'Fűtés', heating: 'Fűtés', cool: 'Hűtés', cooling: 'Hűtés',
    auto: 'Automata', schedule: 'Program', off: 'Ki', on: 'Be', manual: 'Kézi',
    eco: 'Eco', comfort: 'Komfort', boost: 'Rásegítés',
  }
  const sceneTitle = (id) =>
    SCENE_LABEL[String(id ?? '').toLowerCase()] ?? sceneCap?.values?.find((x) => x.id === id)?.title ?? id ?? ''
  // érték → ikon; ami nincs a listában, az általános kapcsoló-ikont kap
  const SCENE_ICON = {
    home: 'home', away: 'away', asleep: 'bed', sleep: 'bed', night: 'bed',
    vacation: 'suitcase', holiday: 'suitcase', no_frost: 'snowflake', frost_protection: 'snowflake',
    heat: 'flame', heating: 'flame', cool: 'snowflake', cooling: 'snowflake',
    auto: 'clock', schedule: 'clock', off: 'power', manual: 'sliders',
    eco: 'leaf', comfort: 'sun', boost: 'bolt',
  }
  const sceneIcon = (id) => SCENE_ICON[String(id).toLowerCase()] ?? 'sliders'

  // kis irány-nyíl badge (fűt/hűt/tart)
  const arrow = (d) =>
    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="${d === 'up' ? 'M12 19V6M6 12l6-6 6 6' : d === 'down' ? 'M12 5v13M6 12l6 6 6-6' : 'M6 12h12'}"/></svg>`

  // --- tick-tárcsa SVG (viewBox 200) ---
  function dialSVG(tgt, cur) {
    const cx = 100,
      cy = 100,
      D = (x) => (x * Math.PI) / 180,
      pt = (a, r) => [cx + r * Math.cos(D(a)), cy + r * Math.sin(D(a))]
    // Finomabb tárcsa: rövidebb és vékonyabb osztások, kisebb jelölők.
    // (osztás hossza 10 → 7, vonalvastagság 2 → 1.5; jelölő 20 → 15)
    const START = 125,
      SWEEP = 290,
      rIn = 84,
      rOut = 91,
      // a cél jelölő hosszabb (77..98 = 21), a mért rövidebb (80..95 = 15)
      rInHi = 80,
      rOutHi = 95,
      rInTgt = 77,
      rOutTgt = 98
    /* Két jelölő: a MÉRT és a KÍVÁNT hőmérséklet, közöttük világosabb osztások.
       MINDEN index-alapú: a hőmérsékletet először osztás-indexre képezzük, és a
       szöget az indexből számoljuk — így a jelölő garantáltan pontosan egy
       osztás helyén van. (Korábban a jelölő szöge a nyers hőmérsékletből jött,
       az osztás pedig i/N-ből: ha a min nem esett a 0.5-es rácsra, vagy a mért
       érték folytonos volt (pl. 23.87), a vonal az osztások KÖZÉ csúszott.) */
    const cl = (v) => Math.min(MAX, Math.max(MIN, v))
    const iOf = (v) => Math.max(0, Math.min(N, Math.round((cl(v) - MIN) / STEP)))
    const angOf = (i) => START + (i / N) * SWEEP
    const tgtI = iOf(tgt),
      curI = iOf(cur),
      hiAng = angOf(tgtI),
      curAng = angOf(curI),
      lo = Math.min(tgtI, curI),
      hi = Math.max(tgtI, curI),
      // ha ugyanarra az osztásra esnek, csak a célt rajzoljuk
      showCur = tgtI !== curI
    const line = (a, r1, r2, c, wdt, cls) => {
      const [x1, y1] = pt(a, r1),
        [x2, y2] = pt(a, r2)
      return `<line class="${cls}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="${wdt}" stroke-linecap="round"/>`
    }
    let t = ''
    for (let i = 0; i <= N; i++) {
      if (i === tgtI) continue // itt a cél jelölő áll
      if (showCur && i === curI) continue // itt a mért jelölő áll
      const mid = i > lo && i < hi // a két érték KÖZÖTT világosabb
      t += line(angOf(i), rIn, rOut, mid ? '#6f6f7d' : '#3d3d47', mid ? 1.9 : 1.5, mid ? 'tkm' : 'tk')
    }
    // kívánt: egyetlen, hosszabb vonal (ezt állítod) — mért: rövidebb vonal
    t += line(hiAng, rInTgt, rOutTgt, '#fff', 2.8, 'hi')
    if (showCur) t += line(curAng, rInHi, rOutHi, '#fff', 2.4, 'hc')
    // A gombok a tárcsa ALSÓ RÉSÉBEN ülnek (a tick-ív 55°..125° között nyitott).
    // Kisebb méret: keskenyebb gyűrű + szűkebb szög; a stroke csak lekerekít
    // (fill színnel egyezik), ezért kicsi, különben ~3px-t hízna minden irányba.
    /* A +/- gomb SZEKTOR: radiális oldalak, ívelt tető és alj — ahogy a
       referencián. A lekerekítést a fill színével egyező stroke adja
       (linejoin: round), ezért a rajzolt geometria a stroke felével kisebb,
       hogy a LÁTHATÓ gomb pont a kért méretű legyen (67..83, 28°).

       FONTOS: a gomb színe OPAK (a telt háttéren a fehér 24%-ának megfelelő
       kevert szín). Áttetsző színnél a fill és a stroke átfedésénél az alfa
       összeadódott, és az adta a világosabb "fura keretet". */
    /* A gomb KÜLSŐ (alsó) íve pontosan az osztásgyűrű külső ívére (rOut = 91)
       simul: a rajzolt ív sugara ezért rOut - sw/2, a stroke fele adja hozzá a
       hiányzó félvastagságot. Korábban 86.5 + 1.5 = 88 volt, vagyis a gomb 3
       egységgel beljebb ült, és emiatt tűnt „magasnak". A sáv vastagsága
       változatlan (16 egység), tehát a belső ív is ennyivel kijjebb kerül. */
    const sw = 3,
      band = 16,
      pOut = rOut - sw / 2,
      pIn = pOut - band + sw,
      aPad = (sw / 2 / ((pIn + pOut) / 2)) * (180 / Math.PI) // a stroke szögben is kifelé nő
    const sec = (a0, a1) => {
      const [x1, y1] = pt(a0, pOut),
        [x2, y2] = pt(a1, pOut),
        [x3, y3] = pt(a1, pIn),
        [x4, y4] = pt(a0, pIn)
      return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${pOut} ${pOut} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${pIn} ${pIn} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`
    }
    const chv = (a, d) => {
      const [x, y] = pt(a, (pIn + pOut) / 2)
      const dd = d === 'up' ? 'M -3.4 1.9 L 0 -1.9 L 3.4 1.9' : 'M -3.4 -1.9 L 0 1.9 L 3.4 -1.9'
      return `<path class="cv" d="${dd}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" fill="none" stroke="#e7e7ec" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`
    }
    const btn = (a0, a1, d) =>
      `<path class="bt" d="${sec(a0 + aPad, a1 - aPad)}" fill="#34343c" stroke="#34343c" stroke-width="${sw}" stroke-linejoin="round"/>` +
      chv((a0 + a1) / 2, d)
    return `<svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${t}${btn(91.5, 119.5, 'down')}${btn(60.5, 88.5, 'up')}</svg>`
  }
  const dial = $derived(dialSVG(target, current))
</script>

{#snippet dialBlock(big)}
  <div class="dialwrap">
    <div class="dial {big ? 'lg' : 'sm'}" class:picking={sceneOpen}>
      {@html dial}
      <div class="center" class:picking={sceneOpen}>
        {#if !sceneOpen}
          <div class="big">{current.toFixed(1)}°</div>
          <div class="small">{target.toFixed(1)}°</div>
        {/if}
        {#if big && sceneCap}
          {#if sceneOpen}
            <!-- váltás közben a lista kapja a teret: ikon + MEGNEVEZÉS, a
                 hőmérsékletek és a tárcsa háttérbe húzódnak -->
            <div class="scene-pick" role="group" aria-label={sceneCap.title}>
              {#each sceneCap.values as v (v.id)}
                <button
                  class:on={sceneValue === v.id}
                  aria-pressed={sceneValue === v.id}
                  onpointerdown={(e) => e.stopPropagation()}
                  onclick={() => pickScene(v.id)}
                >
                  <span class="i">{@html icon(sceneIcon(v.id), { w: 21, h: 21, sw: 2.2 })}</span>
                  <span class="t">{sceneTitle(v.id)}</span>
                </button>
              {/each}
            </div>
          {:else}
            <button
              class="scene-now"
              aria-label={`${sceneCap.title}: ${sceneTitle(sceneValue)} — módosítás`}
              onpointerdown={(e) => e.stopPropagation()}
              onclick={() => (sceneOpen = true)}
            >
              <span class="sic">{@html icon(sceneIcon(sceneValue), { w: 39, h: 39, sw: 2 })}</span>
              <span class="snm">{sceneTitle(sceneValue)}</span>
            </button>
          {/if}
        {/if}
      </div>
      {#if !sceneOpen}
        <div class="hits">
          <button aria-label="csökkentés" onpointerdown={(e) => e.stopPropagation()} onclick={() => adj(-STEP)}></button>
          <button aria-label="növelés" onpointerdown={(e) => e.stopPropagation()} onclick={() => adj(STEP)}></button>
        </div>
      {/if}
    </div>
  </div>
{/snippet}

{#if horizontal}
  <button class="thermo-h" bind:clientWidth={hW} onpointerdown={(e) => e.stopPropagation()} onclick={() => (showPopup = true)}>
    <span class="zicon">
      {@html icon(iconName, { w: 32, h: 32 })}
      <span class="dirbadge {dir}">{@html arrow(dir)}</span>
    </span>
    <div class="th-txt">
      {#if showLabel}<div class="th-label">{label}</div>{/if}
      <div class="th-temps">
        <span class="cur">{current.toFixed(1)}°</span>
        <span class="arw">→</span>
        <span class="tgt">{target.toFixed(1)}°</span>
      </div>
    </div>
    {#if sceneCap && sceneShows}
      <!-- aktuális scene jobbra rendezve; 3 egységnél csak az ikon -->
      <span class="th-scene" title={sceneTitle(sceneValue)}>
        <span class="si">{@html icon(sceneIcon(sceneValue), { w: 32, h: 32, sw: 1.8 })}</span>
        {#if sceneNameFits}<span class="sn">{sceneTitle(sceneValue)}</span>{/if}
      </span>
    {/if}
  </button>
{:else}
  <div class="widget thermo">
    {#if showLabel}<div class="tlabel" class:big={isFull}>{label}</div>{/if}
    {@render dialBlock(isFull)}
  </div>
{/if}

{#if showPopup}
  <div class="tpop" data-noswipe onpointerdown={(e) => { e.stopPropagation(); showPopup = false }} role="presentation">
    <!-- a háttér a tényleges és a kívánt hőmérséklet viszonyát mutatja:
         fűt (aktuális < kívánt) → narancs, hűt (aktuális > kívánt) → világoskék -->
    <div class="tpop-card {dir}" onpointerdown={(e) => e.stopPropagation()} role="dialog" aria-label={label}>
      <div class="tpop-head"><span>{label}</span><button class="x" aria-label="Bezárás" onclick={() => (showPopup = false)}>✕</button></div>
      {@render dialBlock(true)}
    </div>
  </div>
{/if}

<style>
  /* ---- fekvő readonly csempe ---- */
  .thermo-h {
    width: 100%;
    height: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    text-align: left;
    color: var(--txt);
    cursor: pointer;
    overflow: hidden;
    font: inherit;
  }
  .thermo-h:hover { background: #202027; }
  .zicon { position: relative; color: var(--txt-dim); flex: 0 0 auto; display: inline-flex; }
  .zicon :global(svg), .zicon :global(img) { display: block; }
  .dirbadge {
    position: absolute; right: -5px; bottom: -5px; width: 17px; height: 17px; border-radius: 50%;
    background: var(--card); display: flex; align-items: center; justify-content: center;
  }
  .dirbadge.up { color: var(--heat); }
  .dirbadge.down { color: var(--blue); }
  .dirbadge.eq { color: var(--txt-mute); }
  .th-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .th-label { font-size: 16px; font-weight: 600; color: var(--txt); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .th-temps { display: flex; align-items: baseline; gap: 6px; font-size: 24px; }
  .th-temps .cur { color: var(--txt-dim); }
  .th-temps .arw { color: var(--txt-mute); font-size: 19px; }
  .th-temps .tgt { color: #fff; font-weight: 700; }
  /* a scene mérete a csempe többi eleméhez igazodik: az ikon UGYANAKKORA, mint
     az eszközikon (32px), a felirat pedig a címkével egyező 16px */
  .th-scene {
    margin-left: auto; flex: 0 0 auto;
    display: flex; align-items: center; gap: 9px;
    color: var(--txt-dim); font-size: 16px; font-weight: 600; white-space: nowrap;
  }
  /* az ikon fehér, a megnevezés marad tompított — így az ikon elsőre kiugrik */
  .th-scene .si { display: inline-flex; color: #fff; }
  .th-scene .si :global(svg) { width: 32px; height: 32px; display: block; }

  /* ---- popup ----
     SZÁNDÉKOSAN absolute, nem fixed: a lapozó .pager eleme transzformált, és egy
     transzformált ős a fixed elemeknek is befoglaló dobozzá válik — a popup így
     a .pager origójához (az ELSŐ laphoz) tapadt, a 2. lapról nyitva a képernyőn
     kívülre került (mérve: x=-459). A .page position:relative, ehhez igazodunk. */
  .tpop {
    position: absolute;
    inset: 0;
    z-index: 60;
    background: rgba(0, 0, 0, 0.62);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .tpop-card {
    width: 100%;
    max-width: 340px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 22px;
    padding: 14px 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  /* Fűtés/hűtés visszajelzés a popup hátterén. A tárcsa alatti sugaras
     festés a nagy számot hagyja a legvilágosabb részen, így olvasható marad. */
  /* Fűt / hűt: TELT háttér. A tárcsa elemei (osztások, kiemelés, gombok,
     chevron) és a számok színe CSS-változókból jön, mert a sötét témás
     alapértékek (#3d3d47 osztás, #34343c gomb) a telt színen elveszne. */
  .tpop-card.up,
  .tpop-card.down {
    --tick: rgba(255, 255, 255, 0.42);
    --tick-mid: rgba(255, 255, 255, 0.85);
    --tick-hi: #fff;
    --btn: #f79251; /* narancs + 24% fehér, OPAK (lásd a dialSVG megjegyzését) */
    --chv: #fff;
    --num: #eaf1f8;
    --num2: #fff;
    --head: #fff;
    border-color: rgba(0, 0, 0, 0.14);
  }
  .tpop-card.up { background: #f4701a; --scene-on: #f4701a; }
  .tpop-card.down { background: #2fa1e6; --btn: #61b8ec; --scene-on: #2fa1e6; /* kék + 24% fehér */ }
  .tpop-card.up .tpop-head,
  .tpop-card.down .tpop-head { color: var(--head); }
  .tpop-card.up .tpop-head .x,
  .tpop-card.down .tpop-head .x { color: rgba(255, 255, 255, 0.85); }
  .tpop-card.up .hits button:active,
  .tpop-card.down .hits button:active { background: rgba(255, 255, 255, 0.12); }

  /* a @html-lel beszúrt SVG-t :global kell elérni */
  .dial :global(.tk) { stroke: var(--tick, #3d3d47); }
  .dial :global(.tkm) { stroke: var(--tick-mid, #6f6f7d); }
  .dial :global(.hi) { stroke: var(--tick-hi, #fff); }
  .dial :global(.hc) { stroke: var(--tick-cur, var(--tick-hi, #fff)); }
  .dial :global(.bt) { fill: var(--btn, #34343c); stroke: var(--btn, #34343c); }
  .dial :global(.cv) { stroke: var(--chv, #e7e7ec); }

  .tpop-head { display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 15px; }
  .tpop-head .x { background: transparent; border: none; color: var(--txt-dim); font-size: 16px; cursor: pointer; }

  /* ---- beépített tárcsa (2×2 / 4×4) ---- */
  .widget {
    width: 100%;
    height: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    padding: 9px 10px;
    display: flex;
    flex-direction: column;
  }
  .tlabel { font-size: 12px; font-weight: 600; color: var(--txt-dim); margin: 0 2px 2px; }
  .tlabel.big { font-size: 14px; }
  .dialwrap { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
  .dial { position: relative; width: 100%; aspect-ratio: 1; }
  .dial.lg { max-width: 300px; }
  .dial.sm { max-width: 170px; }
  /* CSAK a tárcsa saját SVG-je feszüljön ki (közvetlen gyermek): a scene-ikonok
     beljebb ülnek, azokat ez a szabály szétnyújtotta és olvashatatlanná tette. */
  .dial > :global(svg) { width: 100%; height: 100%; display: block; overflow: visible; }
  /* A kis tárcsán a számok kissé feljebb ülnek (alattuk a +/- gombok kapnak
     levegőt); a nagy tárcsán viszont a számok ÉS a scene EGY blokként, pontosan
     középen állnak. */
  .center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; transform: translateY(-6%); pointer-events: none; }
  .dial.lg .center { transform: none; }
  .big { font-weight: 700; letter-spacing: -1px; line-height: 1; color: var(--num, #fff); }
  .small { font-weight: 700; color: var(--num2, #bdbdc6); }
  .dial.lg .big { font-size: 54px; }
  .dial.lg .small { font-size: 22px; margin-top: 9px; }
  .dial.sm .big { font-size: 30px; }
  .dial.sm .small { font-size: 14px; margin-top: 5px; }
  /* Scene-választó: a hőmérsékletek alatt, a tárcsa belsejében. A .center
     pointer-events: none, ezért a gomboknak külön vissza kell kapcsolni. */
  /* a +/- érzékelő sáv (.hits) a DOM-ban később jön, ezért a pár pixeles
     átfedésben az nyerné a kattintást — a scene-sor kap z-indexet */
  /* Alapállapot: csak az aktuális scene — nagyobb ikon, alatta a megnevezés.
     Koppintásra nyílik a teljes választó (lásd .scenes). */
  .scene-now {
    position: relative; z-index: 2; pointer-events: auto;
    margin-top: 12px; padding: 5px 12px 6px;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: transparent; border: 0; border-radius: 14px;
    color: var(--num2, #fff); font: inherit; cursor: pointer;
  }
  .scene-now:active { background: rgba(255, 255, 255, 0.12); }
  .scene-now .sic { display: inline-flex; color: inherit; }
  .scene-now .sic :global(svg) { width: 39px; height: 39px; display: block; }
  .scene-now .snm { font-size: 13px; font-weight: 600; letter-spacing: 0.01em; opacity: 0.92; }

  /* Váltás közben: a tárcsa elhalványul, és a lista kapja a fókuszt. */
  /* CSAK a tárcsa saját SVG-je halványuljon — a leszármazott-szelektor a
     scene-lista ikonjait is 10%-ra vitte, ezért látszottak alig. */
  .dial.picking > :global(svg) { opacity: 0.1; }
  .center.picking { pointer-events: auto; }
  .scene-pick {
    display: flex; flex-direction: column; gap: 7px; width: 82%; max-width: 250px;
    pointer-events: auto;
  }
  .scene-pick button {
    display: flex; align-items: center; gap: 11px; width: 100%;
    padding: 9px 14px; border: 0; border-radius: 999px;
    background: rgba(255, 255, 255, 0.16); color: var(--num2, #fff);
    font: inherit; font-size: 14px; font-weight: 600; text-align: left; cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .scene-pick button:active { transform: scale(0.985); }
  .scene-pick button.on { background: #fff; color: var(--scene-on, #1b1b1f); }
  .scene-pick .i { display: inline-flex; flex: 0 0 auto; color: inherit; }
  .scene-pick .i :global(svg) { width: 21px; height: 21px; display: block; }
  .scene-pick .t { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .hits { position: absolute; left: 0; right: 0; bottom: 0; height: 34%; display: flex; }
  .hits button { flex: 1; background: transparent; border: none; cursor: pointer; }
  .hits button:active { background: rgba(255, 255, 255, 0.04); }
</style>
