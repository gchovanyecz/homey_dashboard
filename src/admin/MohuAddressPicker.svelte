<script>
  /* MOHU cím-választó: kerület → közterület → házszám, kaszkádolva (ahogy a
     mohubudapest.hu-n is). A listák a saját proxynkon jönnek (/api/mohu/...).

     A házszám-lista a MOHU-nál session-függő (a kerületet a cookie viszi), ezt
     a szerver oldja meg; ha mégis üresen jönne vissza, szabad szöveges beírásra
     váltunk, hogy a beállítás akkor is elvégezhető legyen. */
  import Select from './Select.svelte'
  import { fetchDistricts, fetchPlaces, fetchHouseNumbers } from '../lib/mohu.js'

  let { value = {}, onchange } = $props()

  let districts = $state([])
  let places = $state([])
  let numbers = $state([])
  let loading = $state('')
  let err = $state('')

  const labelOf = (list, v) => list.find((o) => o.value === v)?.label ?? ''

  async function run(what, fn) {
    loading = what
    err = ''
    try {
      await fn()
    } catch (e) {
      err = String(e?.message || e)
    } finally {
      loading = ''
    }
  }

  $effect(() => {
    run('kerületek', async () => (districts = await fetchDistricts()))
  })
  $effect(() => {
    const d = value?.district
    if (!d) return void (places = [])
    run('közterületek', async () => (places = await fetchPlaces(d)))
  })
  $effect(() => {
    const d = value?.district
    const p = value?.publicPlace
    if (!d || !p) return void (numbers = [])
    run('házszámok', async () => (numbers = await fetchHouseNumbers(d, p)))
  })

  // szintenként nullázzuk a lejjebbieket, hogy ne maradjon vegyes cím
  const pickDistrict = (v) =>
    onchange({ district: v, districtLabel: labelOf(districts, v), publicPlace: '', placeLabel: '', houseNumber: '' })
  const pickPlace = (v) => onchange({ ...value, publicPlace: v, placeLabel: labelOf(places, v), houseNumber: '' })
  const pickNumber = (v) => onchange({ ...value, houseNumber: v })

  // ha a szerver nem tudott házszámlistát adni, kézzel is beírható
  const manualNumbers = $derived(!!value?.publicPlace && !loading && !numbers.length)
</script>

<div class="mp">
  <label>Kerület
    <Select
      value={value?.district ?? ''}
      options={districts}
      placeholder={loading === 'kerületek' ? 'Betöltés…' : 'Válassz kerületet'}
      searchable
      onchange={pickDistrict}
    />
  </label>

  <label>Közterület
    <Select
      value={value?.publicPlace ?? ''}
      options={places}
      placeholder={!value?.district ? 'Előbb kerületet' : loading === 'közterületek' ? 'Betöltés…' : 'Válassz közterületet'}
      searchable
      disabled={!value?.district || !places.length}
      onchange={pickPlace}
    />
  </label>

  <label>Házszám
    {#if manualNumbers}
      <input
        type="text"
        placeholder="pl. 8 vagy 10/A"
        value={value?.houseNumber ?? ''}
        oninput={(e) => pickNumber(e.target.value.trim())}
      />
    {:else}
      <Select
        value={value?.houseNumber ?? ''}
        options={numbers}
        placeholder={!value?.publicPlace ? 'Előbb közterületet' : loading === 'házszámok' ? 'Betöltés…' : 'Válassz házszámot'}
        searchable
        disabled={!value?.publicPlace || !numbers.length}
        onchange={pickNumber}
      />
    {/if}
  </label>

  {#if err}
    <p class="hint err">Nem sikerült elérni a MOHU oldalt: {err}</p>
  {:else if manualNumbers}
    <p class="hint">Ehhez a közterülethez nem jött házszám-lista — írd be kézzel.</p>
  {/if}
</div>

<style>
  .mp { display: flex; flex-direction: column; gap: 10px; }
  label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--txt-dim); }
  input {
    height: 36px; border-radius: 10px; border: 1px solid var(--line);
    background: var(--card-2); color: var(--txt); padding: 0 10px; font: inherit; font-size: 13px;
  }
  input:focus { outline: none; border-color: var(--blue); }
  .hint { font-size: 11px; color: var(--txt-mute); line-height: 1.45; margin: 0; }
  .hint.err { color: #ffc2c9; }
</style>
