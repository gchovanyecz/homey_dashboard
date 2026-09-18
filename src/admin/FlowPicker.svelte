<script>
  import { flows, connection } from '../lib/stores.js'
  import Select from './Select.svelte'

  // onchange(id, flow) — a flow objektummal együtt, hogy a hívó eltárolhassa,
  // hogy Advanced Flow-e (más végpont indítja: triggerAdvancedFlow).
  let { value = null, onchange } = $props()
  const connected = $derived($connection.status === 'connected')

  const label = (f) =>
    f.name + (f.advanced ? ' · Advanced' : '') + (f.enabled === false ? ' · letiltva' : '')

  const options = $derived([
    { value: '', label: '— nincs —' },
    ...$flows.map((f) => ({ value: f.id, label: label(f) })),
  ])
  const pick = (v) => onchange(v || null, $flows.find((f) => f.id === v) ?? null)
</script>

{#if connected && $flows.length}
  <Select value={value ?? ''} {options} placeholder="Válassz flow-t" onchange={pick} />
  <div class="cnt">
    {$flows.filter((f) => !f.advanced).length} normál · {$flows.filter((f) => f.advanced).length} advanced
  </div>
{:else}
  <input
    type="text"
    placeholder="flowId (csatlakozz a Homey-hoz)"
    value={value ?? ''}
    oninput={(e) => onchange(e.target.value || null, null)}
  />
{/if}

<style>
  input { width: 100%; height: 36px; border-radius: 10px; border: 1px solid var(--line); background: var(--card-2); color: var(--txt); padding: 0 10px; font: inherit; font-size: 13px; }
  input:focus { outline: none; border-color: var(--blue); }
  .cnt { font-size: 11px; color: var(--txt-mute); }
</style>
