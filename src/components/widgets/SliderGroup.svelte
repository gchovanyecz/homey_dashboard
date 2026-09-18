<script>
  import { icon } from '../../lib/icons.js'
  import Slider from './Slider.svelte'

  let { w } = $props()

  const VARIANTS = {
    light: { orientation: 'horizontal', accent: 'amber', mode: 'live', icon: 'bulb-sm', cap: 'dim', hint: 'húzás közben küld', title: 'Világítás' },
    speaker: { orientation: 'horizontal', accent: 'teal', mode: 'live', icon: 'speaker-sm', cap: 'volume_set', hint: 'húzás közben küld', title: 'Hangerő' },
    shade: { orientation: 'horizontal', accent: 'blue', mode: 'release', icon: 'blind-sm', cap: 'windowcoverings_set', hint: 'csak elengedéskor küld', title: 'Árnyékolás' },
    vertical: { orientation: 'vertical', title: w.label ?? 'Gyorsvezérlők' },
  }
  const CAP_STYLE = {
    dim: { accent: 'amber', icon: 'bulb-sm', mode: 'live' },
    volume_set: { accent: 'teal', icon: 'speaker-sm', mode: 'live' },
    windowcoverings_set: { accent: 'blue', icon: 'blind-sm', mode: 'release' },
  }
  const v = VARIANTS[w.variant] ?? VARIANTS.light
  const orientation = v.orientation
  const title = w.label ?? v.title
  const hint = w.hint ?? v.hint
  const showLabel = w.showLabel !== false

  // items: [{ label, value, accent?, mode?, icon? }]
  const items = w.items ?? []
</script>

<div class="widget group" class:vertical={orientation === 'vertical'}>
  {#if orientation !== 'vertical' && showLabel}
    <div class="ghead">
      <div class="gtitle">
        {#if v.icon}<span class="gi {v.accent ?? 'teal'}">{@html icon(v.icon)}</span>{/if}
        {title}
      </div>
      {#if hint}<div class="ghint">{hint}</div>{/if}
    </div>
  {/if}

  {#if orientation === 'vertical'}
    <div class="vlist">
      {#each items as it}
        {@const st = CAP_STYLE[it.capability] ?? { accent: 'teal', icon: 'speaker-sm', mode: 'live' }}
        <Slider
          orientation="vertical"
          value={it.value}
          accent={it.accent ?? st.accent}
          mode={it.mode ?? st.mode}
          label={it.label}
          iconName={it.icon ?? st.icon}
          deviceId={it.deviceId ?? null}
          capability={it.capability ?? null}
          invert={!!it.invert}
        />
      {/each}
    </div>
  {:else}
    <div class="slist">
      {#each items as it}
        <Slider
          orientation="horizontal"
          value={it.value}
          accent={it.accent ?? v.accent}
          mode={it.mode ?? v.mode}
          label={it.label}
          deviceId={it.deviceId ?? null}
          capability={it.capability ?? v.cap}
          invert={!!it.invert}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .widget {
    width: 100%;
    height: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    padding: 9px 13px 10px;
    display: flex;
    flex-direction: column;
  }
  .widget.vertical {
    padding: 9px 11px 9px;
  }
  .ghead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 7px;
    padding-right: 46px;
  }
  .widget.vertical .ghead {
    padding-right: 0;
  }
  .gtitle {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 14px;
    font-weight: 600;
  }
  .gtitle .gi {
    display: inline-flex;
  }
  .gtitle .gi :global(svg) {
    width: 18px;
    height: 18px;
  }
  .gi.amber { color: var(--amber); }
  .gi.teal { color: var(--teal); }
  .gi.blue { color: var(--blue); }
  .ghint {
    font-size: 11px;
    color: var(--txt-mute);
  }
  .slist {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    flex: 1;
    gap: 4px;
  }
  .vlist {
    display: flex;
    gap: 7px;
    flex: 1;
    margin-top: 2px;
  }
</style>
