<script>
  /* Görgethető lista LÁTHATÓ sávval.

     A natív sáv nem jó erre: a macOS alapbeállítása („Show scroll bars: When
     scrolling") overlay-sávot ad, ami csak görgetés közben villan fel, és a
     ::-webkit-scrollbar / scrollbar-width szabályokat is elnyeli. Ezért a natív
     sávot elrejtjük, és a scrollTop/scrollHeight alapján magunk rajzoljuk ki —
     így bármelyik rendszeren látszik, hogy a lista folytatódik.

     A `rows` (alapból 4) a görgetés nélkül látszó sorok száma; a magasság a
     sormagasságból és a résekből jön, nem a tartalomból. */
  let { rows = 4, row = 40, gap = 6, children } = $props()

  let el
  let scrollH = $state(0)
  let clientH = $state(0)
  let top = $state(0)

  const maxH = $derived(rows * row + (rows - 1) * gap)
  const over = $derived(scrollH > clientH + 1)
  const thumbH = $derived(over ? Math.max(24, (clientH / scrollH) * clientH) : 0)
  const thumbY = $derived(over ? (top / (scrollH - clientH)) * (clientH - thumbH) : 0)

  const measure = () => {
    if (!el) return
    scrollH = el.scrollHeight
    clientH = el.clientHeight
    top = el.scrollTop
  }

  // a magasság ritkán, a GYEREKEK viszont gyakran változnak (oldal/dashboard
  // hozzáadás, törlés, átnevezés) — mindkettőt figyelni kell
  $effect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const mo = new MutationObserver(measure)
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  })
</script>

<div class="wrap" style="--max:{maxH}px;--gap:{gap}px">
  <div class="list" bind:this={el} onscroll={measure}>{@render children()}</div>
  {#if over}
    <div class="bar"><div class="thumb" style="height:{thumbH}px;transform:translateY({thumbY}px)"></div></div>
  {/if}
</div>

<style>
  .wrap { position: relative; flex: 0 0 auto; }
  .list {
    display: flex; flex-direction: column; gap: var(--gap);
    max-height: var(--max); overflow-y: auto; padding-right: 10px;
    scrollbar-width: none; /* a natív sáv helyett a sajátunk látszik */
  }
  .list::-webkit-scrollbar { width: 0; height: 0; }
  .bar {
    position: absolute; top: 0; bottom: 0; right: 0; width: 6px;
    border-radius: 3px; background: rgba(255, 255, 255, 0.07); pointer-events: none;
  }
  .thumb { width: 100%; border-radius: 3px; background: #5f5f6e; }
</style>
