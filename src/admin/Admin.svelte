<script>
  import { onMount } from 'svelte'
  import Editor from '../components/editor/Editor.svelte'
  import SettingsPanel from './SettingsPanel.svelte'
  import { connection } from '../lib/stores.js'
  /* A dashboard-lista és -beállítások a szerkesztőben élnek (bal oldali lista,
     jobb oldali beállító panel), ezért a fejlécben már nincs választó. */
  import { initSync, startPoll } from '../lib/dashboards.js'
  import { connect, loadCreds } from '../lib/homey.js'

  let tab = $state('editor')

  onMount(() => {
    initSync().then(() => {
      if (loadCreds()) connect()
    })
    return startPoll(4000)
  })

  const dot = $derived($connection.status)
</script>

<div class="admin">
  <header>
    <strong class="brand">🛠️ Homey — Vezérlőpult</strong>

    <nav class="tabs">
      <button class:active={tab === 'editor'} onclick={() => (tab = 'editor')}>Szerkesztő</button>
      <button class:active={tab === 'settings'} onclick={() => (tab = 'settings')}>Beállítások</button>
    </nav>

    <span class="spacer"></span>

    <span class="conn status-{dot}" title="Homey kapcsolat">
      <i></i>{dot === 'connected' ? 'Csatlakozva' : dot === 'connecting' ? 'Csatlakozás…' : dot === 'error' ? 'Hiba' : 'Nincs kapcsolat'}
    </span>
    <a class="link" href="./index.html" target="_blank" rel="noopener">Megjelenítő ↗</a>
  </header>

  <div class="main">
    {#if tab === 'editor'}
      <Editor />
    {:else}
      <SettingsPanel />
    {/if}
  </div>
</div>

<style>
  .admin {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: #0b0b0f;
    color: var(--txt);
    user-select: none;
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--line);
    background:
      radial-gradient(600px 120px at 0% 0%, rgba(55, 211, 176, 0.18), transparent 70%),
      radial-gradient(600px 120px at 100% 0%, rgba(76, 141, 255, 0.18), transparent 70%),
      #101015;
  }
  .brand {
    font-size: 16px;
    font-weight: 800;
    background: linear-gradient(90deg, var(--teal), var(--blue));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .spacer { flex: 1; }
  button {
    font: inherit; color: var(--txt); background: var(--card-2);
    border: 1px solid var(--line); border-radius: 9px; padding: 7px 10px; cursor: pointer;
  }
  button:hover { background: #2c2c33; }

  .tabs { display: flex; gap: 4px; background: #05130f; border: 1px solid var(--line); border-radius: 11px; padding: 3px; }
  .tabs button { border: none; background: transparent; padding: 7px 16px; border-radius: 8px; font-weight: 600; }
  .tabs button.active { background: linear-gradient(135deg, var(--teal), var(--blue)); color: #05130f; }

  .conn { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--txt-dim); padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--card-2); }
  .conn i { width: 9px; height: 9px; border-radius: 50%; background: #6c6c76; box-shadow: 0 0 8px currentColor; }
  .conn.status-connected i { background: var(--teal); color: var(--teal); }
  .conn.status-connecting i { background: var(--amber); color: var(--amber); }
  .conn.status-error i { background: #ff7a89; color: #ff7a89; }

  .link { color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 10px; background: linear-gradient(135deg, var(--teal), var(--blue)); }
  .link:hover { filter: brightness(1.08); }

  .main { flex: 1; min-height: 0; display: flex; }
  .main > :global(*) { flex: 1; min-width: 0; }
</style>
