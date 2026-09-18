<script>
  import WeatherWidget from './widgets/WeatherWidget.svelte'
  import ThermostatWidget from './widgets/ThermostatWidget.svelte'
  import SliderGroup from './widgets/SliderGroup.svelte'
  import ButtonWidget from './widgets/ButtonWidget.svelte'
  import ChartWidget from './widgets/ChartWidget.svelte'
  import MoodWidget from './widgets/MoodWidget.svelte'
  import BkkWidget from './widgets/BkkWidget.svelte'
  import InfoWidget from './widgets/InfoWidget.svelte'
  import MohuWidget from './widgets/MohuWidget.svelte'
  import QrWidget from './widgets/QrWidget.svelte'

  let { w } = $props()

  const MAP = {
    weather: WeatherWidget,
    thermostat: ThermostatWidget,
    sliderGroup: SliderGroup,
    slider: SliderGroup,
    button: ButtonWidget,
    chart: ChartWidget,
    mood: MoodWidget,
    bkk: BkkWidget,
    info: InfoWidget,
    mohu: MohuWidget,
    qr: QrWidget,
  }
  const Comp = MAP[w.type]
</script>

{#if Comp}
  <Comp {w} />
{:else}
  <div class="unknown">{w.type}?</div>
{/if}

<style>
  .unknown {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--card);
    border: 1px dashed var(--line);
    border-radius: var(--radius);
    color: var(--txt-mute);
    font-size: 12px;
  }
</style>
