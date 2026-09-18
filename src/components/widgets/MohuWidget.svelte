<script>
  /* Szemétszállítás (MOHU hulladéknaptár): hulladék-típusonként a KÖVETKEZŐ
     szállítás. A cím globális beállítás (admin → Beállítások), a naptárat a
     saját szerver-proxy adja kész JSON-ként (lásd server/mohu.js).

     A megjelenés a BKK indulások widgetét követi — ugyanaz a sor-anatómia:
     színes jelvény (típusszín + ikon) | leírás halványan | jobbra a nagy érték
     + mértékegység + halvány kiegészítés. Így a két „menetrend" jellegű widget
     egymás mellett is egy készletnek látszik.

     Hiba esetén marad a korábbi adat (csak console.warn): a panelnek sosem
     szabad kiürülnie egy pillanatnyi hálózati hiba miatt. */
  import { onMount } from 'svelte'
  import { icon } from '../../lib/icons.js'
  import { mohu } from '../../lib/dashboards.js'
  import { today } from '../../lib/clock.js'
  import { fetchCalendar, nextByType, isConfigured } from '../../lib/mohu.js'

  let { w } = $props()
  const showLabel = $derived(!!w.label && w.showLabel !== false)

  /* MÉRT szélesség: két rács-egység alatt (≈225 px) a nagyobb betűk mellett a
     típusnévből már csak egy-két betű + „…" férne ki — ott inkább elmarad, a
     típust a jelvény színe és ikonja azonosítja. */
  let boxW = $state(0)
  const showName = $derived(boxW === 0 || boxW >= 250)

  let entries = $state([])
  let loaded = $state(false)
  const addr = $derived($mohu)
  // a sorok a mai napból vezetődnek le → éjfélkor hálózat nélkül is átfordulnak
  const rows = $derived(nextByType(entries, $today, addr?.hiddenTypes))

  async function load() {
    if (!isConfigured(addr)) return
    try {
      const d = await fetchCalendar(addr)
      entries = d.entries ?? []
    } catch (e) {
      console.warn('[mohu] naptár letöltése nem sikerült', e)
    } finally {
      loaded = true
    }
  }

  // cím-változásra azonnal, utána 3 óránként (a naptár hetekre előre fix)
  $effect(() => {
    void addr?.district, addr?.publicPlace, addr?.houseNumber
    load()
  })
  onMount(() => {
    const id = setInterval(load, 3 * 3600e3)
    return () => clearInterval(id)
  })

  /* A jelvény szövegszíne a háttérhez: a típusszínek fele világos (zöld, szürke),
     azokon a fehér ikon elveszne. A BKK-nál ezt az API adja (textColor), itt a
     szín világosságából számoljuk. */
  const inkOn = (hex) => {
    const h = hex.replace('#', '')
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
    return lum > 0.6 ? '#10131a' : '#fff'
  }
</script>

<div class="mohu" bind:clientWidth={boxW}>
  {#if showLabel}<div class="hd">{w.label}</div>{/if}

  {#if !isConfigured(addr)}
    <div class="empty">Add meg a címet a Beállítások fülön (kerület, közterület, házszám).</div>
  {:else if rows.length}
    <div class="mlist">
      {#each rows as r (r.key)}
        <div class="mrow">
          <span class="badge" style="background:{r.color};color:{inkOn(r.color)}">
            <span class="mic">{@html icon(r.icon, { w: 20, h: 20 })}</span>
          </span>
          {#if showName}<span class="mname">{r.label}</span>{/if}
          <span class="mwhen">
            {#if r.days <= 1}
              <!-- ma / holnap: a dátum már nem mond többet, elmarad -->
              <span class="mfirst soon">{r.rel.toUpperCase()}</span>
            {:else}
              <span class="mfirst">{r.days}</span><span class="munit">nap</span><span class="mrest">· {r.dateText}</span>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  {:else if loaded && entries.length}
    <div class="empty">A megjelenítendő típusok ki vannak kapcsolva a Beállításoknál.</div>
  {:else if loaded}
    <div class="empty">Erre a címre nincs szállítási adat a következő hetekben.</div>
  {/if}
</div>

<style>
  .mohu {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    padding: 7px 9px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .hd { font-size: 13px; font-weight: 600; color: var(--txt-dim); flex: 0 0 auto; }
  /* a sorok kitöltik a rendelkezésre álló helyet (2 típus = fél-fél), többnél a
     min-height tartja a méretet és a lista görgethető; a pan-y kell, mert a
     body touch-action: none. A görgetősáv rejtve: a panelen csak helyet venne
     el, érintéssel úgyis húzható. */
  .mlist {
    flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 3px;
    touch-action: pan-y; scrollbar-width: none;
  }
  .mlist::-webkit-scrollbar { display: none; }
  .mrow { flex: 1 1 auto; min-height: 40px; display: flex; align-items: center; gap: 10px; }
  .badge {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    padding: 0 10px;
    border-radius: 10px;
  }
  .mic { display: inline-flex; }
  .mic :global(svg) { display: block; }
  .mname { flex: 1; min-width: 0; font-size: 17px; color: var(--txt-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* a margin-left:auto akkor is jobbra tolja, ha a típusnév (a rugalmas kitöltő
     elem) el van hagyva */
  .mwhen { flex: 0 0 auto; margin-left: auto; display: flex; align-items: baseline; gap: 4px; }
  .mfirst { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; }
  /* ma / holnap: szó áll a szám helyén, ezért egy fokozattal kisebb. A szín a
     BKK-hoz hasonlóan fehér marad — a típust a jelvény színe hordozza. */
  .mfirst.soon { font-size: 21px; letter-spacing: 0.02em; }
  .munit { font-size: 14px; color: var(--txt-mute); }
  .mrest { font-size: 19px; color: var(--txt-mute); }
  .empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--txt-mute); font-size: 13px; text-align: center; line-height: 1.45; padding: 0 8px; }
</style>
