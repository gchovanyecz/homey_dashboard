<script>
  import { icon } from '../../lib/icons.js'
  import { devices, connection } from '../../lib/stores.js'
  import { setCapability, triggerFlow, subscribe } from '../../lib/homey.js'
  import { stateColor } from '../../lib/colors.js'

  let { w } = $props()

  const kind = w.kind ?? 'device' // 'device' | 'flow'
  const showLabel = !!w.label && w.showLabel !== false
  const cap = w.capability ?? 'onoff'
  const bound = kind === 'device' && !!w.deviceId

  let mockOn = $state(w.state === 'on')
  let flashing = $state(false)

  // Az akció-capability lehet boolean vagy kétértékű enum (pl. fan_mode.powerful: off/on).
  function enumOnOff(vals) {
    if (!Array.isArray(vals) || vals.length !== 2) return null
    const offRe = /^(off|false|0|no|closed|idle|stop|disabled)$/i
    const off = vals.find((v) => offRe.test(v.id)) ?? vals[0]
    const onv = vals.find((v) => v.id !== off.id) ?? vals[1]
    return { off: off.id, on: onv.id }
  }
  const capMeta = $derived(bound ? ($devices[w.deviceId]?.capsMeta?.[cap] ?? null) : null)
  const oo = $derived(capMeta?.type === 'enum' ? enumOnOff(capMeta.values) : null)
  const rawVal = $derived(bound ? $devices[w.deviceId]?.capabilities?.[cap] : undefined)
  const on = $derived(bound ? (oo ? rawVal === oo.on : !!rawVal) : mockOn)

  // --- indikátor (állapot vizualizáció egy capability alapján) ---
  const ind = w.indicator ?? null
  $effect(() => {
    if (bound && $connection.status === 'connected') subscribe(w.deviceId, cap)
    if (ind?.deviceId && ind?.capability && $connection.status === 'connected') subscribe(ind.deviceId, ind.capability)
  })
  const indVal = $derived(
    ind?.deviceId && ind?.capability ? $devices[ind.deviceId]?.capabilities?.[ind.capability] : undefined,
  )
  const matched = $derived(ind?.states?.find((s) => String(s.value) === String(indVal)) ?? null)

  function fmtVal(v, unit) {
    if (v === undefined || v === null) return '—'
    if (typeof v === 'boolean') return v ? 'Be' : 'Ki'
    if (typeof v === 'number') return `${v}${unit ? ' ' + unit : ''}`
    return String(v)
  }

  const mode = $derived(ind?.mode ?? null)
  /* Az állapot színe a pontra ÉS az ikonra is érvényes (állapotonként külön).
     Ha az adott állapothoz nincs szín állítva, marad a régi viselkedés: a pont
     zöld/szürke az érték szerint, az ikon pedig a semleges --txt-dim. */
  const stateHex = $derived(
    matched?.color
      ? stateColor(matched.color)
      : mode === 'dot'
        ? stateColor(indVal ? 'green' : 'grey')
        : null,
  )
  const stateIcon = $derived(mode === 'icon' ? (matched?.icon ?? 'power') : null)
  // jobb felső állapot-szöveg (value mód, vagy indikátor nélküli be/ki)
  const statusText = $derived(
    mode === 'value'
      ? fmtVal(indVal, ind.unit)
      : mode === 'dot' || mode === 'icon'
        ? (matched?.label ?? '')
        : kind === 'device'
          ? on
            ? (w.subOn ?? 'Be')
            : (w.subOff ?? 'Ki')
          : '',
  )

  function tap() {
    if (kind === 'flow') {
      flashing = true
      setTimeout(() => (flashing = false), 350)
      if (w.flowId) triggerFlow(w.flowId, !!w.advanced)
      else console.log('[flow] mock', w.label)
    } else if (bound) {
      if (oo) setCapability(w.deviceId, cap, on ? oo.off : oo.on)
      else setCapability(w.deviceId, cap, !on)
    } else {
      mockOn = !mockOn
    }
  }
</script>

<button class="btile {flashing ? 'flash' : ''}" class:nolabel={!showLabel} onclick={tap} onpointerdown={(e) => e.stopPropagation()}>
  <span class="b-icon">{@html icon(w.icon ?? 'power', { w: 34, h: 34 })}</span>

  <span class="b-status">
    {#if mode === 'dot'}
      <span class="dot" style="background:{stateHex};box-shadow:0 0 8px {stateHex}"></span>
    {:else if mode === 'icon'}
      <!-- glow: drop-shadow, nem box-shadow — az utóbbi a doboz köré rajzolna,
           a drop-shadow viszont az ikon alakját követi. Csak beállított színnél,
           a semleges ikon ne világítson. -->
      <span
        class="sic"
        class:glow={!!stateHex}
        style={stateHex ? `color:${stateHex};--glow:${stateHex}` : ''}
      >{@html icon(stateIcon, { w: 20, h: 20 })}</span>
    {/if}
    {#if statusText}<span class="st-txt">{statusText}</span>{/if}
  </span>

  {#if showLabel}<span class="b-label">{w.label}</span>{/if}
</button>

<style>
  .btile {
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
  .btile:hover { background: #202027; }

  .b-icon { position: absolute; top: 11px; left: 12px; color: var(--txt); display: inline-flex; }
  .b-icon :global(svg), .b-icon :global(img), .b-icon :global(span) { width: 34px; height: 34px; }

  .b-status {
    position: absolute;
    top: 11px;
    right: 12px;
    max-width: 62%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    font-size: 12px;
    color: var(--txt-dim);
  }
  .b-status .dot { width: 12px; height: 12px; border-radius: 50%; flex: 0 0 auto; }
  .b-status .sic { display: inline-flex; color: var(--txt-dim); }
  /* két réteg: egy szűk, erős mag és egy tágabb, halvány udvar — így a vékony
     vonalas ikonok is világítanak, nem csak elmosódnak */
  .b-status .sic.glow { filter: drop-shadow(0 0 2px var(--glow)) drop-shadow(0 0 7px var(--glow)); }
  .b-status .sic :global(svg), .b-status .sic :global(img), .b-status .sic :global(span) { width: 20px; height: 20px; }
  .b-status .st-txt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .b-label {
    position: absolute;
    bottom: 10px;
    left: 12px;
    right: 12px;
    font-size: 13px;
    font-weight: 600;
    color: var(--txt);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* címke nélkül az ikon a csempe közepére kerül */
  .btile.nolabel .b-icon {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .btile.flash { border-color: var(--blue); background: var(--blue-soft); }
</style>
