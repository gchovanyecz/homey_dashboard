<script>
  import { devices, connection } from '../lib/stores.js'
  import Select from './Select.svelte'

  let { value = null, caps = [], onchange } = $props()

  const hasCap = (d, c) =>
    d.capabilities && Object.keys(d.capabilities).some((k) => k === c || k.startsWith(c + '.'))
  const options = $derived([
    { value: '', label: '— nincs kötve —' },
    ...Object.values($devices)
      .filter((d) => caps.length === 0 || caps.some((c) => hasCap(d, c)))
      .map((d) => ({ value: d.id, label: d.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ])
  const connected = $derived($connection.status === 'connected')
</script>

{#if connected && options.length > 1}
  <Select value={value ?? ''} {options} placeholder="Válassz eszközt" onchange={(v) => onchange(v || null)} />
{:else}
  <input
    type="text"
    placeholder="deviceId (csatlakozz a Homey-hoz)"
    value={value ?? ''}
    oninput={(e) => onchange(e.target.value || null)}
  />
{/if}

<style>
  input { width: 100%; height: 36px; border-radius: 10px; border: 1px solid var(--line); background: var(--card-2); color: var(--txt); padding: 0 10px; font: inherit; font-size: 13px; }
  input:focus { outline: none; border-color: var(--blue); }
</style>
