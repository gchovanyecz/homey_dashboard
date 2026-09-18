<script>
  import { connection } from '../lib/stores.js'
  import { bkk, mohu, ui, homeyCreds, weather, setWeather } from '../lib/dashboards.js'
  import { connect, disconnect } from '../lib/homey.js'
  import Select from './Select.svelte'
  import MohuAddressPicker from './MohuAddressPicker.svelte'
  import Toggle from './Toggle.svelte'
  import { icon } from '../lib/icons.js'
  import { fetchCalendar, typesOf, isConfigured } from '../lib/mohu.js'

  let address = $state($homeyCreds?.address ?? '')
  let token = $state($homeyCreds?.token ?? '')
  let busy = $state(false)

  async function saveConn() {
    busy = true
    homeyCreds.set({ address, token })
    await connect({ address, token })
    busy = false
  }
  function forget() {
    homeyCreds.set({ address: '', token: '' })
    disconnect()
    address = ''
    token = ''
  }

  const statusText = {
    disconnected: 'Nincs csatlakozva',
    connecting: 'Csatlakozás…',
    connected: 'Csatlakozva ✓',
    error: 'Hiba',
  }

  // Időjárás: egy hely az egész rendszernek (a widget ebből dolgozik).
  const wx = $derived($weather)
  const setW = (k, v) => setWeather({ [k]: v })

  let bkkKey = $state($bkk?.apiKey ?? '')
  function saveBkk() {
    bkk.set({ ...$bkk, apiKey: bkkKey.trim() })
  }

  /* MOHU cím. Piszkozatban gyűjtjük, és csak teljes címet mentünk: a félkész
     cím a panelen fölösleges (és hibás) lekéréseket indítana. */
  let mohuDraft = $state({ ...$mohu })
  const mohuFull = $derived(!!(mohuDraft.district && mohuDraft.publicPlace && mohuDraft.houseNumber))
  const mohuSaved = $derived(
    $mohu.district ? `${$mohu.placeLabel || $mohu.publicPlace} ${$mohu.houseNumber}, ${$mohu.districtLabel || $mohu.district}` : '',
  )
  const saveMohu = () => mohu.set({ ...mohuDraft, hiddenTypes: $mohu.hiddenTypes ?? [] })

  /* Megjelenítendő típusok. A lehetséges típusokat a MENTETT címhez tartozó
     naptárból olvassuk (a MOHU címenként mást szállít), a kikapcsoltakat pedig
     kizárásos listában tároljuk — így egy később megjelenő típus (pl. szezonális
     zöldhulladék) magától látszani fog. */
  let mohuTypes = $state([])
  $effect(() => {
    const a = $mohu
    if (!isConfigured(a)) return void (mohuTypes = [])
    fetchCalendar(a)
      .then((d) => (mohuTypes = typesOf(d.entries)))
      .catch(() => (mohuTypes = []))
  })
  const isTypeOn = (k) => !($mohu.hiddenTypes ?? []).includes(k)
  function toggleType(k, on) {
    const cur = new Set($mohu.hiddenTypes ?? [])
    on ? cur.delete(k) : cur.add(k)
    mohu.set({ ...$mohu, hiddenTypes: [...cur] })
  }

  // Lapozási gesztus (kioszk). A Select szigorú === egyezéssel dolgozik → szám maradjon.
  const FINGER_OPTS = [
    { value: 2, label: 'Két ujj (multitouch)' },
    { value: 1, label: 'Egy ujj' },
  ]
  const fingers = $derived($ui?.swipeFingers === 1 ? 1 : 2)
</script>

<div class="settings">
  <p class="hint">
    Ezek a beállítások <b>minden dashboardra</b> érvényesek. Ami csak egy dashboardra szól (panel-típus,
    kezdőoldal), az a <b>Szerkesztő</b> bal oldali paneljén, a <b>Dashboard</b> blokkban van.
  </p>

  <section class="card">
    <h3>Homey kapcsolat</h3>
    <p class="muted">A dashboardok minden eszközön ezeket a kredenciálokat használják (szinkronizálva).</p>
    <label>Homey helyi cím
      <input type="text" inputmode="url" placeholder="192.168.1.123" bind:value={address} autocomplete="off" />
    </label>
    <label>Personal Access Token
      <input type="password" placeholder="hmy_…" bind:value={token} autocomplete="off" />
    </label>
    <div class="status {$connection.status}">
      {statusText[$connection.status]}
      {#if $connection.status === 'error'}<div class="err">{$connection.error}</div>{/if}
    </div>
    <div class="row">
      <button class="secondary" onclick={forget}>Elfelejt</button>
      <button class="primary" onclick={saveConn} disabled={busy}>
        {busy ? 'Csatlakozás…' : 'Mentés & csatlakozás'}
      </button>
    </div>
    <p class="muted">A token: Homey Web App → Settings → API Keys.</p>
  </section>

  <section class="card">
    <h3>Időjárás</h3>
    <p class="muted">Az <b>Időjárás</b> widget helye — minden dashboardra közös (Open-Meteo).</p>
    <div class="grid2">
      <label>Szélesség (lat)
        <input type="number" step="0.0001" value={wx.lat} oninput={(e) => setW('lat', +e.target.value)} />
      </label>
      <label>Hosszúság (lon)
        <input type="number" step="0.0001" value={wx.lon} oninput={(e) => setW('lon', +e.target.value)} />
      </label>
      <label>Helység neve
        <input type="text" value={wx.name ?? ''} oninput={(e) => setW('name', e.target.value)} />
      </label>
      <label>Előrejelzés (nap)
        <input type="number" min="1" max="16" value={wx.days ?? 7} oninput={(e) => setW('days', +e.target.value)} />
      </label>
    </div>
  </section>

  <section class="card">
    <h3>BKK FUTÁR</h3>
    <p class="muted">A BKK indulások widgethez. Ingyenes API-kulcs: opendata.bkk.hu → regisztráció → API-kulcs.</p>
    <label>BKK API-kulcs
      <input type="password" placeholder="pl. 12ab34cd-…" bind:value={bkkKey} autocomplete="off" />
    </label>
    <div class="row">
      <button class="primary" onclick={saveBkk}>Mentés</button>
    </div>
    <p class="muted attrib">Adatok forrása: BKK Zrt., CC BY 4.0</p>
  </section>

  <section class="card">
    <h3>Szemétszállítás (MOHU)</h3>
    <p class="muted">
      A <b>Szemétszállítás</b> widget címe — minden dashboardra közös. A naptárat a
      mohubudapest.hu hulladéknaptárából olvassuk, típusonként a következő szállítás dátumával.
    </p>
    <MohuAddressPicker value={mohuDraft} onchange={(v) => (mohuDraft = v)} />
    {#if mohuSaved}<p class="muted">Mentett cím: <b>{mohuSaved}</b></p>{/if}
    <div class="row">
      <button class="primary" onclick={saveMohu} disabled={!mohuFull}>Mentés</button>
    </div>

    {#if mohuTypes.length}
      <div class="sec">Megjelenített típusok</div>
      <div class="types">
        {#each mohuTypes as t (t.key)}
          <label class="trow">
            <Toggle checked={isTypeOn(t.key)} onchange={(c) => toggleType(t.key, c)} />
            <span class="tic" style="color:{t.color}">{@html icon(t.icon, { w: 18, h: 18 })}</span>
            <span>{t.label}</span>
          </label>
        {/each}
      </div>
      <p class="muted">Ami itt ki van kapcsolva, nem jelenik meg a widgetben. Új típus (pl. szezonális zöldhulladék) automatikusan látszani fog.</p>
    {:else if mohuSaved}
      <p class="muted">A típusok a mentett cím naptárából jönnek — töltés…</p>
    {/if}
    <p class="muted attrib">Adatok forrása: MOHU MOL Hulladékgazdálkodás Zrt. — mohubudapest.hu</p>
  </section>

  <section class="card">
    <h3>Kioszk — gesztusok</h3>
    <p class="muted">
      <b>Két ujj</b>: az egyujjas érintés mindig a vezérlőké (csúszka, gomb, hangulat), lapozni két ujjal
      lehet. <b>Egy ujj</b>: a régi mód, ahol a vízszintes húzás lapoz. Egérrel mindig egy pointer lapoz,
      hogy a böngészős előnézet használható maradjon; a nyílbillentyűk mindkét módban lapoznak.
    </p>
    <label>Oldal-lapozás
      <Select value={fingers} options={FINGER_OPTS} onchange={(v) => ui.set({ ...$ui, swipeFingers: v })} />
    </label>
    <p class="muted">
      Diagnosztika a panelen: nyisd meg a megjelenítőt <code>?gesture=debug</code> paraméterrel — a bal
      felső sarokban látszik az egyidejű érintések száma (<code>max</code>). Ha ez sosem lép 1 fölé, a
      panel böngészője nem ad multitouch eventet, és az <b>Egy ujj</b> módot kell választani.
    </p>
  </section>
</div>

<style>
  .settings {
    padding: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 420px));
    gap: 20px;
    align-content: start;
    overflow: auto;
    height: 100%;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h3 { font-size: 15px; font-weight: 600; }
  .muted { font-size: 12px; color: var(--txt-mute); line-height: 1.4; }
  .muted b { color: var(--txt-dim); }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  /* a rendszer/dashboard hatókör elválasztása — a kártyák fölött, teljes sorban */
  .hint {
    grid-column: 1 / -1; font-size: 12px; color: var(--txt-mute); line-height: 1.5;
    border: 1px dashed var(--line); border-radius: 12px; padding: 10px 12px;
  }
  .hint b { color: var(--txt-dim); }
  /* jogi hivatkozás: a widgetről ide került, hogy ne vegyen el helyet a kijelzőn */
  .attrib { font-size: 11px; opacity: 0.8; border-top: 1px solid var(--line); padding-top: 10px; margin-top: -2px; }
  code { font-family: ui-monospace, Menlo, monospace; color: var(--txt-dim); }
  label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--txt-dim); }
  input {
    height: 40px; border-radius: 12px; border: 1px solid var(--line);
    background: var(--card-2); color: var(--txt); padding: 0 12px; font-size: 14px;
  }
  input:focus { outline: none; border-color: var(--blue); }
  .sec { font-size: 11px; font-weight: 700; color: var(--txt-mute); text-transform: uppercase; letter-spacing: 0.4px; }
  .types { display: flex; flex-direction: column; gap: 9px; }
  /* a kártya általános `label` szabálya column irányú — itt sorba kell */
  .types .trow { display: flex; flex-direction: row; align-items: center; gap: 10px; font-size: 13px; color: var(--txt); cursor: pointer; }
  .types .tic { display: inline-flex; flex: 0 0 auto; }
  .status { font-size: 12px; color: var(--txt-dim); }
  .status.connected { color: var(--teal); }
  .status.error { color: #ff7a89; }
  .status .err { color: var(--txt-mute); margin-top: 3px; word-break: break-word; }
  .row { display: flex; gap: 10px; justify-content: flex-end; }
  button { height: 40px; border-radius: 12px; padding: 0 16px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid var(--line); }
  button.primary { background: var(--blue); color: #fff; border-color: var(--blue); }
  button.primary:disabled { opacity: 0.6; }
  button.secondary { background: var(--card-2); color: var(--txt); }
</style>
