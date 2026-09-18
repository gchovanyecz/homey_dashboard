<script>
  import Widget from './Widget.svelte'

  let { page } = $props()

  // grid-area stílus egy widgethez (pos = 1-alapú kezdő oszlop/sor; ha nincs, auto)
  function areaStyle(w) {
    const col = w.pos?.x ? `${w.pos.x} / span ${w.size.w}` : `span ${w.size.w}`
    const row = w.pos?.y ? `${w.pos.y} / span ${w.size.h}` : `span ${w.size.h}`
    return `grid-column:${col};grid-row:${row}`
  }
</script>

<section class="page">
  <div class="page-grid">
    {#each page.widgets as w (JSON.stringify(w))}
      <div class="cell" style={areaStyle(w)}>
        <Widget {w} />
      </div>
    {/each}
  </div>
</section>
