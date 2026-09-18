<script>
  import { moods } from '../../lib/stores.js'
  import { setMood } from '../../lib/homey.js'

  let { w } = $props()
  const source = w.source ?? 'favorite' // 'favorite' | 'zone' | 'selected'
  // A címke elrejthető (admin); ilyenkor a chipek kapják meg a felszabadult helyet.
  const showLabel = !!w.label && w.showLabel !== false

  let flashId = $state(null)

  const list = $derived.by(() => {
    const all = $moods ?? []
    if (source === 'zone') return all.filter((m) => m.zone === w.zoneId)
    if (source === 'selected') {
      const ids = w.moodIds ?? []
      return ids.map((id) => all.find((m) => m.id === id)).filter(Boolean)
    }
    return all.filter((m) => m.favorite)
  })

  // Szín-korong: ha a mood-nak van színe, azt használjuk; különben a névből
  // képzünk stabil, egyedi színátmenetet (mint a Homey színes körei).
  function hueOf(str) {
    let h = 0
    for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return h % 360
  }
  function dotStyle(m) {
    if (m.color) return `background:${m.color}`
    const h = hueOf(m.id || m.name)
    return `background:linear-gradient(135deg, hsl(${h} 72% 60%), hsl(${(h + 45) % 360} 72% 52%))`
  }
  const lights = (n) => `${n} light${n === 1 ? '' : 's'}`

  function activate(m) {
    flashId = m.id
    setTimeout(() => { if (flashId === m.id) flashId = null }, 500)
    setMood(m.id)
  }
</script>

<div class="mood">
  {#if showLabel}<div class="mhead">{w.label}</div>{/if}
  {#if list.length}
    <div
      class="mlist"
      class:fill={list.length <= 3}
      style={list.length <= 3 ? `grid-template-rows: repeat(${list.length}, 1fr)` : ''}
    >
      {#each list as m (m.id)}
        <button
          class="mchip {flashId === m.id ? 'flash' : ''}"
          onclick={() => activate(m)}
          onpointerdown={(e) => e.stopPropagation()}
        >
          <span class="mdot" style={dotStyle(m)}></span>
          <span class="mtxt">
            <span class="mnm">{m.name}</span>
            <span class="msub">{lights(m.deviceCount ?? 0)}</span>
          </span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="empty">
      {source === 'favorite'
        ? 'Nincs kedvenc mood.'
        : source === 'zone'
          ? 'Nincs mood ebben a zónában.'
          : 'Nincs kiválasztott mood.'}
    </div>
  {/if}
</div>

<style>
  .mood {
    width: 100%;
    height: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .mhead { font-size: 12px; font-weight: 600; color: var(--txt-dim); }
  .mlist {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
    align-content: start;
    touch-action: pan-y;
    /* görgetéskor a chipek border-e ne érjen a vágási élhez */
    padding: 1px;
  }
  /* max 3 hangulat: kitöltik a magasságot, görgetés (és így levágás) nélkül */
  .mlist.fill {
    overflow: visible;
    align-content: stretch;
  }
  .mchip {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 40px;
    min-width: 0;
    padding: 5px 10px;
    border-radius: 11px;
    border: 1px solid transparent;
    background: var(--card-2);
    color: var(--txt);
    cursor: pointer;
    text-align: left;
    font: inherit;
  }
  .mchip:hover { background: #24242c; }
  .mchip.flash { border-color: var(--teal); background: rgba(55, 211, 176, 0.16); color: #fff; }
  .mdot { width: 26px; height: 26px; border-radius: 50%; flex: 0 0 auto; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
  .mtxt { display: flex; flex-direction: column; gap: 0; min-width: 0; }
  .mnm { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .msub { font-size: 11px; color: var(--txt-mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--txt-mute); font-size: 12px; text-align: center; }
</style>
