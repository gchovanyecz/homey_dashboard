<script>
  /* Sablon-szerkesztő az infografika-csempékhez.

     A sablon MEGJELENÍT: a behúzott capability-k helyére a formázott érték
     kerül, a köztük lévő szöveg (nyíl, szavak) marad, ahogy beírtad:

       [Kazán.Hőmérséklet #] → [Kazán.Elvárt hőm.]   →   "24.9 → 25 °C"

     A tokenek nem nyers szövegként, hanem „pill”-ként látszanak
     (eszköznév.capability), és kattintásra váltanak mértékegység ⇄ csak szám
     között. A tárolt sablonban alias áll ({device_1.measure_temperature}),
     így az eszköz átnevezése/cseréje nem rontja el a sablont.

     Fontos: az IGAZSÁG a sablon-szöveg, a DOM csak vetület. Minden beszúrás a
     szövegben, karakter-offszettel történik, utána rajzolunk újra — a DOM-range-ek
     az újrarajzolás után elavulnak (emiatt fordult meg korábban a beszúrási sorrend). */
  import { devices } from '../lib/stores.js'
  import { ensureSource, normalizeTemplate, splitTemplate, srcDeviceId, tokenText } from '../lib/template.js'
  import { itemValue, capMeta } from '../lib/capval.js'

  let { value = '', sources = [], unit = '', onchange } = $props()

  let box = $state(null) // contenteditable
  let over = $state(false)
  let q = $state('') // paletta-kereső
  let open = $state({}) // kinyitott eszközök a palettán
  let last = '' // amit legutóbb MI rajzoltunk ki
  let caret = 0 // utolsó ismert kurzor a sablon-szövegben

  // szövegbeszúró csippek: nem műveletek, csak elválasztók/címkék
  const SEPS = ['→', '/', '·', '–', '|', 'most:', 'cél:']

  const devName = (src) => $devices[srcDeviceId(sources, src)]?.name ?? null
  const capTitle = (src, cap) => capMeta($devices, srcDeviceId(sources, src), cap)?.title ?? cap

  /* ---------- DOM ⇄ sablon-szöveg ---------- */

  function nodeText(n) {
    if (n.nodeType === 3) return n.nodeValue
    if (n.nodeType !== 1) return ''
    if (n.dataset?.src) return tokenText(n.dataset.src, n.dataset.cap, n.dataset.bare === '1')
    if (n.tagName === 'BR') return ' '
    return [...n.childNodes].map(nodeText).join('')
  }
  const serialize = () => [...box.childNodes].map(nodeText).join('')

  function pill(src, cap, bare, name = devName(src)) {
    const el = document.createElement('span')
    el.className = 'tok'
    el.contentEditable = 'false'
    el.dataset.src = src
    el.dataset.cap = cap
    if (bare) el.dataset.bare = '1'
    el.classList.toggle('missing', !name)
    el.title = name
      ? `${name}.${cap}${bare ? ' — csak a szám' : ''}\nKattints: mértékegység ki/be`
      : `Ismeretlen forrás: ${src}`
    const d = document.createElement('b')
    d.textContent = name ?? src
    const t = document.createElement('i')
    t.textContent = '.' + capTitle(src, cap)
    el.append(d, t)
    if (bare) {
      const u = document.createElement('u')
      u.textContent = '#'
      el.append(u)
    }
    return el
  }

  /** Sablon-szöveg → DOM. */
  function render(expr = value) {
    if (!box) return
    box.textContent = ''
    for (const p of splitTemplate(expr)) {
      if (p.t === 'text') box.append(document.createTextNode(p.v))
      else box.append(pill(p.src, p.cap, p.bare))
    }
    last = expr
  }

  /* A pill-eken látszó nevek „aláírása”: csak névváltozásra rajzolunk újra, nem
     minden beérkező Homey-értékre (az elugrasztaná a kurzort). */
  const nameSig = $derived(
    splitTemplate(value)
      .filter((p) => p.t === 'ref')
      .map((p) => `${devName(p.src) ?? '?'}.${capTitle(p.src, p.cap)}`)
      .join('|'),
  )
  let renderedSig = null
  $effect(() => {
    const sig = nameSig
    if (!box) return
    if (value !== last || sig !== renderedSig || !box.childNodes.length) {
      render()
      renderedSig = sig
    }
  })

  /* ---------- kurzor: DOM-range ⇄ karakter-offszet ---------- */

  /** A box elejétől a range kezdetéig tartó sablon-szöveg hossza. */
  function offsetOf(container, off) {
    const r = document.createRange()
    r.setStart(box, 0)
    try {
      r.setEnd(container, off)
    } catch {
      return null
    }
    return [...r.cloneContents().childNodes].map(nodeText).join('').length
  }
  function readCaret() {
    const sel = document.getSelection()
    if (!sel?.rangeCount) return
    const r = sel.getRangeAt(0)
    if (!box?.contains(r.startContainer)) return
    const off = offsetOf(r.startContainer, r.startOffset)
    if (off !== null) caret = off
  }
  /** Kurzor a sablon-szöveg adott karakter-pozíciójára (a DOM-ban). */
  function placeCaret(off) {
    if (!box) return
    let acc = 0
    for (const n of box.childNodes) {
      const len = nodeText(n).length
      if (off <= acc + len) {
        const r = document.createRange()
        if (n.nodeType === 3) r.setStart(n, Math.max(0, Math.min(off - acc, n.nodeValue.length)))
        else off - acc <= 0 ? r.setStartBefore(n) : r.setStartAfter(n)
        r.collapse(true)
        const sel = document.getSelection()
        sel.removeAllRanges()
        sel.addRange(r)
        box.focus()
        return
      }
      acc += len
    }
    const r = document.createRange()
    r.selectNodeContents(box)
    r.collapse(false)
    const sel = document.getSelection()
    sel.removeAllRanges()
    sel.addRange(r)
    box.focus()
  }

  /* ---------- beszúrás (mindig a SZÖVEGBE) ---------- */

  /** Token ne kerüljön egy másik token közepébe: a záró } utánra csúsztatjuk. */
  function snapOut(s, i) {
    const o = s.lastIndexOf('{', Math.max(0, i - 1))
    if (o < 0) return i
    const c = s.indexOf('}', o)
    return c >= i ? c + 1 : i
  }
  // két token/szó ne folyjon egybe („25 °C74.5 %”)
  const glue = (s, i, text) => {
    const b = s.slice(0, i).slice(-1)
    const a = s.slice(i).slice(0, 1)
    return (b && !/\s/.test(b) ? ' ' : '') + text + (a && !/\s/.test(a) ? ' ' : '')
  }

  function commit(next, list = sources) {
    const n = normalizeTemplate(next, list, (id) => !!$devices[id])
    last = n.expr
    onchange(n.expr, n.sources)
    return n.expr
  }
  /** Beszúrás offszetre → commit → újrarajzolás → kurzor a beszúrás után. */
  function insert(text, list = sources, at = null) {
    const i = snapOut(value, at ?? caret)
    const glued = glue(value, i, text)
    const next = value.slice(0, i) + glued + value.slice(i)
    const norm = commit(next, list)
    render(norm)
    caret = norm === next ? i + glued.length : norm.length
    placeCaret(caret)
  }
  const insertText = (t, at = null) => insert(t, sources, at)
  function insertCap(deviceId, cap, at = null) {
    const r = ensureSource(sources, deviceId)
    insert(tokenText(r.alias, cap), r.sources, at)
  }

  /* ---------- események ---------- */

  function onInput() {
    // gépelésnél a DOM az igazság; ha a normalizálás átírta, újrarajzolunk
    const next = serialize()
    const norm = commit(next)
    if (norm !== next) {
      render(norm)
      placeCaret(norm.length)
    } else readCaret()
  }
  function onDragStart(e, deviceId, cap) {
    e.dataTransfer.setData('text/plain', tokenText(deviceId, cap))
    e.dataTransfer.effectAllowed = 'copy'
  }
  function onDrop(e) {
    e.preventDefault()
    over = false
    const txt = (e.dataTransfer?.getData('text/plain') ?? '').trim()
    if (!txt) return
    // a mutató alatti pozíció (Chrome/WebKit); ha nincs, az utolsó kurzor
    const r = document.caretRangeFromPoint?.(e.clientX, e.clientY)
    const at = r && box.contains(r.startContainer) ? offsetOf(r.startContainer, r.startOffset) : null
    const hit = /^\{([^.:]+)\.([^:}]+)\}$/.exec(txt)
    if (hit) insertCap(hit[1], hit[2], at)
    else insertText(txt, at)
  }
  function onPaste(e) {
    e.preventDefault()
    const t = e.clipboardData?.getData('text/plain') ?? ''
    if (t) insertText(t)
  }
  /** Pill-re kattintás: mértékegység ki/be (a szövegben, index szerint). */
  function onBoxClick(e) {
    const t = e.target.closest?.('.tok')
    if (!t) return void readCaret()
    const k = [...box.querySelectorAll('.tok')].indexOf(t)
    let seen = -1
    let out = ''
    for (const p of splitTemplate(value)) {
      if (p.t === 'text') { out += p.v; continue }
      seen++
      out += tokenText(p.src, p.cap, seen === k ? !p.bare : p.bare)
    }
    const norm = commit(out)
    render(norm)
  }

  /* ---------- paletta: MINDEN eszköz és capability egy helyen ---------- */

  const readable = (d) => {
    const meta = d.capsMeta ?? {}
    const ids = Object.keys(meta).filter((id) => meta[id]?.getable !== false)
    return (ids.length ? ids : Object.keys(d.capabilities ?? {})).map((id) => ({
      id,
      title: meta[id]?.title ?? id,
      units: meta[id]?.units ?? '',
    }))
  }
  const palette = $derived.by(() => {
    const term = q.trim().toLowerCase()
    return Object.values($devices)
      .map((d) => {
        const caps = readable(d)
        const devHit = !term || d.name.toLowerCase().includes(term)
        return {
          id: d.id,
          name: d.name,
          caps: devHit ? caps : caps.filter((c) => (c.title + ' ' + c.id).toLowerCase().includes(term)),
        }
      })
      .filter((d) => d.caps.length)
      .sort((a, b) => a.name.localeCompare(b.name, 'hu'))
  })
  const isOpen = (id) => (q.trim() ? true : !!open[id])
  const toggle = (id) => (open = { ...open, [id]: !open[id] })

  const preview = $derived(itemValue($devices, { expr: value, sources, unit: unit || undefined }))
</script>

<div class="te">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={box}
    class="expr"
    class:over
    class:empty={!value.trim()}
    contenteditable="true"
    role="textbox"
    tabindex="0"
    spellcheck="false"
    data-ph="Húzz be egy capability-t a listából, és írj közé szöveget — pl. [Kazán.Hőmérséklet] → [Kazán.Elvárt]"
    oninput={onInput}
    onclick={onBoxClick}
    onkeyup={readCaret}
    onmouseup={readCaret}
    onpaste={onPaste}
    ondragover={(e) => { e.preventDefault(); over = true }}
    ondragleave={() => (over = false)}
    ondrop={onDrop}
  ></div>

  <div class="prev" class:dim={preview.dim}>
    <span class="pl">A csempén</span>
    <b>{preview.text}</b>{#if preview.unit}<span class="pu">{preview.unit}</span>{/if}
  </div>

  <div class="chips">
    <span class="chl">Beszúrás</span>
    {#each SEPS as t (t)}
      <button type="button" class="chip sep" onclick={() => insertText(t)}>{t}</button>
    {/each}
  </div>

  <div class="pal">
    <input class="q" placeholder="Eszköz vagy capability keresése…" value={q} oninput={(e) => (q = e.target.value)} />
    <div class="list">
      {#each palette as d (d.id)}
        <div class="dev">
          <button type="button" class="dhd" onclick={() => toggle(d.id)}>
            <span class="caret">{isOpen(d.id) ? '▾' : '▸'}</span>
            <span class="dn">{d.name}</span>
            <span class="cnt">{d.caps.length}</span>
          </button>
          {#if isOpen(d.id)}
            <div class="caps">
              {#each d.caps as c (c.id)}
                <button
                  type="button"
                  class="chip cap"
                  draggable="true"
                  ondragstart={(e) => onDragStart(e, d.id, c.id)}
                  title={`${d.name}.${c.id} — húzd a sablonba vagy kattints`}
                  onclick={() => insertCap(d.id, c.id)}
                >
                  <b>{d.name}</b><i>.{c.title}</i>{#if c.units}<span class="cu">{c.units}</span>{/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <p class="hint">{Object.keys($devices).length ? 'Nincs találat.' : 'Csatlakozz a Homey-hoz, hogy az eszközök betöltsenek.'}</p>
      {/each}
    </div>
  </div>

  <p class="hint">
    A tokenre kattintva ki/bekapcsolható a mértékegység (<code>#</code> = csak a szám), így nem
    ismétlődik a °C: <code>24.9 → 25 °C</code>. Az érték formázása (tizedes, mértékegység,
    enum-címke) a Homey capability-adataiból jön.
  </p>
</div>

<style>
  .te { display: flex; flex-direction: column; gap: 8px; }

  /* sablon-mező: sima szöveg + „pill”-ek */
  .expr {
    min-height: 62px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--txt);
    padding: 9px 10px;
    font-size: 13px;
    line-height: 2;
    overflow-wrap: anywhere;
  }
  .expr:focus { outline: none; border-color: var(--blue); }
  .expr.over { border-color: var(--blue); background: var(--blue-soft); }
  .expr.empty::before { content: attr(data-ph); color: var(--txt-mute); font-size: 12px; pointer-events: none; }
  .expr :global(.tok) {
    display: inline-flex;
    align-items: baseline;
    gap: 1px;
    padding: 2px 8px;
    margin: 0 1px;
    border-radius: 999px;
    background: var(--blue-soft);
    border: 1px solid rgba(76, 141, 255, 0.45);
    font-size: 12px;
    line-height: 1.5;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  .expr :global(.tok b) { font-weight: 700; color: #cfe0ff; }
  .expr :global(.tok i) { font-style: normal; color: #9db8e8; }
  .expr :global(.tok u) { text-decoration: none; color: #7f9dd6; font-size: 10px; margin-left: 3px; }
  .expr :global(.tok.missing) { background: rgba(255, 122, 137, 0.14); border-color: rgba(255, 122, 137, 0.45); }
  .expr :global(.tok.missing b) { color: #ffc2c9; }

  .prev {
    display: flex; align-items: baseline; gap: 7px;
    background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 7px 10px;
    font-size: 15px; color: var(--txt); min-width: 0; overflow: hidden;
  }
  .prev b { font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .prev.dim b { color: var(--txt-mute); }
  .pl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--txt-mute); flex: 0 0 auto; }
  .pu { font-size: 11px; color: var(--txt-mute); }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .chl { font-size: 11px; color: var(--txt-mute); }
  .chip {
    height: 26px; padding: 0 9px; border-radius: 8px; border: 1px solid var(--line);
    background: var(--card); color: var(--txt-dim); font: inherit; font-size: 12px; cursor: pointer;
  }
  .chip:hover { border-color: var(--blue); color: var(--txt); }

  /* paletta: minden eszköz + capability egy helyen, kereshetően */
  .pal { border: 1px solid var(--line); border-radius: 10px; background: var(--card); overflow: hidden; }
  .q {
    width: 100%; height: 34px; border: 0; border-bottom: 1px solid var(--line);
    background: transparent; color: var(--txt); padding: 0 10px; font: inherit; font-size: 12px;
  }
  .q:focus { outline: none; }
  .list { max-height: 260px; overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 2px; }
  .dhd {
    width: 100%; display: flex; align-items: center; gap: 7px; padding: 5px 6px;
    border: 0; border-radius: 8px; background: transparent; color: var(--txt-dim);
    font: inherit; font-size: 12px; cursor: pointer; text-align: left;
  }
  .dhd:hover { background: var(--card-2); color: var(--txt); }
  .dhd .caret { color: var(--txt-mute); font-size: 10px; width: 10px; }
  .dhd .dn { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dhd .cnt { font-size: 10px; color: var(--txt-mute); }
  .caps { display: flex; flex-wrap: wrap; gap: 5px; padding: 2px 6px 8px 23px; }
  .chip.cap { cursor: grab; display: inline-flex; align-items: baseline; gap: 1px; height: auto; padding: 3px 9px; border-radius: 999px; }
  .chip.cap:active { cursor: grabbing; }
  .chip.cap b { font-weight: 700; color: var(--txt-dim); }
  .chip.cap i { font-style: normal; color: var(--txt-mute); }
  .cu { font-size: 10px; color: var(--txt-mute); margin-left: 4px; }

  .hint { font-size: 11px; color: var(--txt-mute); line-height: 1.5; margin: 0; }
  .hint code { font-family: ui-monospace, Menlo, monospace; color: var(--txt-dim); }
</style>
