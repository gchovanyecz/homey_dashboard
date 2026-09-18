<script>
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import Pager from './components/Pager.svelte'
  import Page from './components/Page.svelte'
  import { connection } from './lib/stores.js'
  import { connect, loadCreds, healthCheck } from './lib/homey.js'
  import { activeDashboard, homeyCreds, initSync, startPoll, panel } from './lib/dashboards.js'
  import { MODAL_SEL } from './lib/gesture.js'

  let index = $state(0)
  const pages = $derived($activeDashboard?.pages ?? [])

  /* Panel-profil: a keret mérete és a rács a dashboardból jön. A viewport metát
     is ÁT KELL ÍRNI, különben a panel böngészője továbbra is 480×480-ra
     kalibrálna, és egy 480×854-es keret alul levágódna. */
  $effect(() => {
    const p = $panel
    const m = document.querySelector('meta[name="viewport"]')
    if (m) m.setAttribute('content', `width=${p.w}, height=${p.h}, initial-scale=1, maximum-scale=1, user-scalable=no`)
  })

  /* Kezdőoldal: a dashboardon beállított oldallal indulunk (startPageId, null =
     első). Nem minden állapot-frissítésnél ugrunk vissza — csak amikor a
     dashboard vagy maga a beállítás változik: így a panel indulás/kioszk-
     újraindítás után a jó oldalon van, de a lapozgatást nem szakítjuk félbe. */
  const startIndex = $derived.by(() => {
    const d = $activeDashboard
    if (!d?.pages?.length) return 0
    const i = d.pages.findIndex((p) => p.id === d.startPageId)
    return i >= 0 ? i : 0
  })
  let startKey = null
  $effect(() => {
    const d = $activeDashboard
    if (!d?.pages?.length) return
    const key = `${d.id}|${d.startPageId ?? ''}`
    if (key === startKey) return
    startKey = key
    index = startIndex
  })

  /* Tétlenség után vissza a kezdőoldalra (idleReturnSec, 0 = soha). Az órát
     minden felhasználói esemény nullázza; CAPTURE fázisban figyelünk, mert a
     widgetek stopPropagation-je elnyelné a buborékolást. A visszalépés csak
     akkor történik meg, ha közben nem nyílt modál (pl. termosztát-popup) —
     ne rántsuk ki a felhasználó alól. */
  const idleSec = $derived($activeDashboard?.idleReturnSec ?? 0)
  $effect(() => {
    const sec = idleSec
    if (!sec) return
    let t
    const fire = () => {
      if (document.querySelector(MODAL_SEL)) return void arm() // modál nyitva: később
      if (index !== startIndex) index = startIndex
    }
    const arm = () => {
      clearTimeout(t)
      t = setTimeout(fire, sec * 1000)
    }
    const opts = { capture: true, passive: true }
    const EV = ['pointerdown', 'pointermove', 'pointerup', 'keydown', 'wheel', 'touchstart']
    for (const e of EV) window.addEventListener(e, arm, opts)
    arm()
    return () => {
      clearTimeout(t)
      for (const e of EV) window.removeEventListener(e, arm, opts)
    }
  })

  // tartsuk érvényes tartományban az indexet, ha az oldalak változnak (admin szerkeszti)
  $effect(() => {
    if (index > pages.length - 1) index = Math.max(0, pages.length - 1)
  })

  // csatlakozás, amikor a (szinkronizált) kredenciálok elérhetővé válnak / változnak
  let lastCredsKey = ''
  $effect(() => {
    const c = $homeyCreds
    const key = `${c?.address ?? ''}|${c?.token ?? ''}`
    if (key !== lastCredsKey && c?.address && c?.token) {
      lastCredsKey = key
      connect(c)
    }
  })

  onMount(() => {
    initSync() // szerverről tölt (ha van), majd a poll követi az admin-változásokat
    const stop = startPoll(4000)
    // A korábbi verzió csak akkor kapcsolódott újra, ha a státusz MÁR nem
    // 'connected' volt — a némán elhalt socketnél viszont az marad, ezért a
    // panel csak lapújratöltéssel éledt fel. Most a healthCheck dönt: aktívan
    // megnézi a REST-et és a socketet, és ha kell, újrakapcsol.
    const wake = () => {
      if (!loadCreds()) return
      if (get(connection).status === 'disconnected') connect()
      else healthCheck({ force: true })
    }
    const onVis = () => document.visibilityState === 'visible' && wake()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', wake)
    window.addEventListener('pageshow', wake) // kioszk visszatérés a lap-cache-ből
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', wake)
      window.removeEventListener('pageshow', wake)
    }
  })
</script>

<div
  class="frame"
  style="--panel-w:{$panel.w}px;--panel-h:{$panel.h}px;--grid-cols:{$panel.cols};--grid-rows:{$panel.rows}"
>
  {#if pages.length}
    <Pager count={pages.length} bind:index>
      {#each pages as page (page.id)}
        <Page {page} />
      {/each}
    </Pager>
  {:else}
    <div class="empty">Nincs oldal.<br />Hozz létre a vezérlőpulton: <code>/admin.html</code></div>
  {/if}
</div>

<style>
  .empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-align: center;
    color: var(--txt-mute);
    font-size: 13px;
    line-height: 1.6;
  }
  code {
    color: var(--txt-dim);
    font-family: ui-monospace, Menlo, monospace;
  }
</style>
