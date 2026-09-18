<script>
  /* QR-kód csempe: a panelen csak egy ikon (és opcionálisan a neve) látszik,
     kattintásra nyílik a popup a NAGY kóddal — jellemzően a vendég-wifi
     jelszavával, hogy a telefon kamerájával rá lehessen csatlakozni.

     A popup a termosztátéval azonos mintát követi (absolute inset-0 +
     data-noswipe), mert a lapozó .pager transzformált: egy fixed pozíciójú
     réteg ahhoz tapadna, és a 2. lapról nyitva a képernyőn kívülre kerülne. */
  import { icon } from '../../lib/icons.js'
  import { qrSVG, qrTextOf } from '../../lib/qr.js'

  let { w } = $props()

  const showLabel = !!w.label && w.showLabel !== false
  const mode = $derived(w.mode ?? 'wifi')
  const wifi = $derived(w.wifi ?? {})
  const text = $derived(qrTextOf(w))
  // mit írunk a kód alá: a hálózat neve, illetve a szöveg/URL első sora
  const caption = $derived(mode === 'wifi' ? (wifi.ssid ?? '') : (w.text ?? '').trim())
  const hint = $derived(
    mode === 'wifi'
      ? wifi.ssid
        ? 'Olvasd be a telefon kamerájával a csatlakozáshoz'
        : 'Nincs beállítva hálózat — az adminban add meg az SSID-t'
      : text
        ? ''
        : 'Nincs beállítva tartalom — az adminban add meg a szöveget vagy az URL-t',
  )
  const empty = $derived(!text || (mode === 'wifi' && !wifi.ssid))
  // a kód a popup méretéhez skálázódik (a svg width/height 100%-ra van húzva)
  const svg = $derived(empty ? '' : qrSVG(text, { size: 320, margin: 2 }))

  let open = $state(false)
</script>

<button
  class="qtile"
  class:nolabel={!showLabel}
  onclick={() => (open = true)}
  onpointerdown={(e) => e.stopPropagation()}
>
  <span class="q-icon">{@html icon(w.icon ?? 'wifi', { w: 34, h: 34 })}</span>
  {#if showLabel}<span class="q-label">{w.label}</span>{/if}
</button>

{#if open}
  <div class="qpop" data-noswipe onpointerdown={(e) => { e.stopPropagation(); open = false }} role="presentation">
    <div class="qpop-card" onpointerdown={(e) => e.stopPropagation()} role="dialog" aria-label={w.label ?? 'QR-kód'}>
      <div class="qpop-head">
        <span>{w.label || (mode === 'wifi' ? 'Wi-Fi' : 'QR-kód')}</span>
        <button class="x" aria-label="Bezárás" onclick={() => (open = false)}>✕</button>
      </div>
      {#if empty}
        <div class="q-empty">{hint}</div>
      {:else}
        <div class="q-code">{@html svg}</div>
        {#if caption}<div class="q-cap">{caption}</div>{/if}
        {#if hint}<div class="q-hint">{hint}</div>{/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .qtile {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    color: var(--txt);
    font: inherit;
    padding: 0;
    text-align: left;
  }
  .qtile:hover { background: #202027; }
  .q-icon { position: absolute; top: 11px; left: 12px; color: var(--txt); display: inline-flex; }
  .q-icon :global(svg), .q-icon :global(span) { width: 34px; height: 34px; }
  .q-label {
    position: absolute; bottom: 10px; left: 12px; right: 12px;
    font-size: 13px; font-weight: 600; color: var(--txt);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  /* címke nélkül az ikon a csempe közepére kerül (ugyanúgy, mint a gombnál) */
  .qtile.nolabel .q-icon { top: 50%; left: 50%; transform: translate(-50%, -50%); }

  /* ---- popup ---- */
  .qpop {
    position: absolute; inset: 0; z-index: 60;
    background: rgba(0, 0, 0, 0.62);
    display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .qpop-card {
    width: 100%; max-width: 340px;
    background: var(--card); border: 1px solid var(--line); border-radius: 22px;
    padding: 14px; display: flex; flex-direction: column; gap: 10px;
  }
  .qpop-head { display: flex; align-items: center; justify-content: space-between; font-size: 15px; font-weight: 600; }
  .x {
    width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--line);
    background: var(--card-2); color: var(--txt-dim); font-size: 13px; cursor: pointer;
  }
  /* a kód mindig FEHÉR alapon, sötét modulokkal — a beolvasás így a
     legmegbízhatóbb, a sötét témás kártya kontrasztja nem elég */
  .q-code {
    background: #fff; border-radius: 14px; padding: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .q-code :global(svg) { width: 100%; height: auto; display: block; }
  .q-cap { text-align: center; font-size: 17px; font-weight: 700; word-break: break-all; }
  .q-hint { text-align: center; font-size: 12px; color: var(--txt-mute); line-height: 1.4; }
  .q-empty { font-size: 13px; color: var(--txt-mute); line-height: 1.5; padding: 10px 2px 6px; }
</style>
