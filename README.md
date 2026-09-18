# Homey Dashboard — NSPanel Pro

Önállóan hostolható, statikus **Homey** dashboard, a Sonoff **NSPanel Pro** 480×480-as
kijelzőjére optimalizálva. Több oldal, **swipe-lapozás**, és config-vezérelt widgetek egy
**4×4-es rácson**. Dashboardonként választható panel-profil: NSPanel Pro 86 / Gen2 (480×480,
4×4), NSPanel Pro 120 álló (480×854, 4×7) és fekvő (854×480, 7×4), vagy egyedi méret. Nincs
backend: a statikus build bármilyen szerverről kiszolgálható, és a panel böngészőjéből
(pl. Fully Kiosk) megnyitható.

- **Stack:** Svelte 5 + Vite. Kis bundle (~29 kB gzip kezdeti; a `homey-api` külön, lusta chunk).
- **Homey:** lokális Web API + Personal Access Token (nincs felhő/OAuth).
- **Időjárás:** Open-Meteo (ingyenes, kulcs nélkül), ~15 perc cache.
- **Szemétszállítás:** mohubudapest.hu hulladéknaptár, szerveroldali proxy + parszolás (`server/mohu.js`), 6 órás cache. A címet (kerület, közterület, házszám) a Beállítások fülön kell megadni.
- **Grafikonok:** saját, könnyű inline-SVG (torta/fánk/vonal) — nincs nehéz chart-lib.
- **QR-kód:** offline generálás a bundle-ből (`qrcode-generator`), SVG-ként rajzolva — jellemzően a vendég-wifi megosztására.

## Widgetek

| Widget | Méretek (oszlop×sor) | Leírás |
|---|---|---|
| **Időjárás** | 2×2, 4×2, 4×4 | aktuális + előrejelzés (2×2→3 nap, 4×2/4×4→7 nap), színes kondíció-ikonok, részletek |
| **Termosztát** | 2×2, 4×4 | rovátkás tárcsa, ív-gombok (±), nagy = mért, kicsi = cél |
| **Csúszka-csoport** | vízszintes 4×1…4×4 / vertikális 1×4…4×4 | világítás/hangerő = húzás közben küld, árnyékolás = csak elengedéskor |
| **Gomb** | 1×1, 2×1, 3×1, 4×1, 2×2 | eszköz be/ki vagy flow-indítás, állapotszínek |
| **Grafikon** | 2×2, 4×2, 4×4 | torta/fánk (eszköz/helyiség összevetés), vonal (Insights idősor) |
| **Infografika** | 1×1-től 4×4-ig | akárhány eszköz-capability olvasható értéke csempékben, saját ikonnal és színnel |
| **BKK indulások** | 2×1-től 4×4-ig | a beállított megálló-járat párok következő indulásai (BKK FUTÁR, API-kulcs kell) |
| **Szemétszállítás** | 2×1-től 4×4-ig | hulladék-típusonként a következő szállítás (MOHU hulladéknaptár), „ma"/„holnap" kiemeléssel |
| **QR-kód** | 1×1-től | a csempén csak ikon (+ opcionális címke), kattintásra popupban a nagy kód: Wi-Fi csatlakozás (SSID/jelszó) vagy szabad szöveg/URL |

A tervezési anyagok és a mockupok a [`planning/`](planning/) mappában találhatók.

## Két felület

- **Megjelenítő** (`/`) — a panelen fut (480×480), csak megjelenít és vezérel. Nincs szerkesztés.
- **Vezérlőpult / admin** (`/admin.html`) — asztali böngészőben nyisd meg; itt hozol létre több
  dashboardot, oldalakat, widgeteket, és itt állítod a Homey-kapcsolatot + időjárást. Élő előnézettel.

A közös állapot (dashboardok + beállítások) egy pici szerveren, a **`/api/state`** végponton
tárolódik (`data/state.json`). Így az admin-változások **több eszközön is** megjelennek: a panel
néhány másodpercenként lekérdezi és élőben frissül. Szerver nélkül (tisztán statikus hosting) a
tárolás localStorage-ra esik vissza (egy eszközön belül működik).

## Első lépések

```bash
npm install
npm run dev                 # dev (LAN, /api/state is működik): http://<gép-ip>:5173/  + /admin.html
npm run build               # statikus build → dist/
npm run serve               # build + pici Node szerver (dist + /api/state): PORT vagy 8090
# vagy külön:  npm run build && npm start
```

- **Megjelenítő a panelen:** `http://<gép-ip>:8090/`
- **Admin az asztali gépen:** `http://<gép-ip>:8090/admin.html`

Fontos: **HTTP-n** szolgáld ki (ne HTTPS), különben a panel böngészője *mixed-content* miatt
blokkolná a Homey HTTP API-t. A gép és a panel legyen ugyanazon a hálózaton.

## Homey-kapcsolat

1. Az **adminban** (`/admin.html`) → *Beállítások* fül → add meg a Homey **helyi IP-jét** és egy
   **Personal Access Token**-t (Homey Web App → *Settings → API Keys*), majd *Mentés & csatlakozás*.
2. A fejlécben lévő pötty jelzi az állapotot (szürke/sárga/**teal**/piros).
3. Csatlakozás után a böngésző-konzolban a **`window.homeyDevices`** kilistázza az
   eszköz-ID-ket és capability-ket (ezeket teszed a widget-configba).

A kredenciálok a közös állapotban (`/api/state`) tárolódnak, így a **panel is** ezekkel csatlakozik.
A panel auto-csatlakozik indításkor és felébredéskor.

## Vezérlőpult (`/admin.html`)

Nagy, asztali felület — **Szerkesztő** és **Beállítások** fülekkel.

**Szerkesztő:**
- **Több dashboard** létrehozása / átnevezése / törlése, váltás közöttük (fejléc).
- **Oldalak** hozzáadása / átnevezése / sorrend (↑/↓) / törlése.
- **Színes widget-paletta**: egy kattintással hozzáadja a widgetet a legelső szabad helyre.
- **Drag & drop vászon** (on-the-fly preview): a widgeteket **húzással mozgatod** a 4×4 rácson,
  a jobb-alsó sarkuknál **átméretezed** (rácsra pattan).
- **Űrlapos config** (nem JSON): típusonként megfelelő mezők — címke, ikon, szín, variant, csúszka-tételek stb.
- **Homey eszközválasztó**: a widgeteken legördülőből választod a Homey-ban felvett eszközt/flow-t
  (capability szerint szűrve). Ehhez előbb csatlakozz a *Beállítások* fülön; kapcsolat nélkül
  kézzel is beírható a `deviceId`.

**Beállítások:** Homey kapcsolat (cím + token) és az aktív dashboard időjárás-koordinátái.

A módosítások azonnal mentődnek a `/api/state`-re; a panel a következő poll-nál átveszi (élő frissülés).
Első indításkor a `src/config/dashboard.js` a kezdő tartalom (seed).

## Konfiguráció — kód (`src/config/dashboard.js`, seed)

Deklaratív oldal/widget leírás. Minden widget: `type`, `size:{w,h}`, `pos:{x,y}` (1-alapú a
4×4 rácson) + típusfüggő adat. **Ha nincs `deviceId`, a widget MOCK adattal működik (offline is).**

```js
// gomb (eszköz) / flow
{ type:'button', size:{w:2,h:1}, pos:{x:3,y:3}, label:'Nappali', icon:'bulb', accent:'amber', deviceId:'abcd', capability:'onoff' }
{ type:'button', size:{w:3,h:1}, pos:{x:2,y:2}, kind:'flow', label:'Jó éjt', icon:'flow', flowId:'efgh' }

// termosztát (measure_/target_temperature)
{ type:'thermostat', size:{w:2,h:2}, pos:{x:1,y:3}, label:'Nappali', deviceId:'ijkl' }

// csúszka-csoport (variant adja a capability-t: light→dim, speaker→volume_set, shade→windowcoverings_set)
{ type:'sliderGroup', size:{w:4,h:2}, pos:{x:1,y:1}, variant:'light',
  items:[ { label:'Nappali', deviceId:'mnop', value:80 }, { label:'Konyha', deviceId:'qrst', value:35 } ] }

// grafikon — élő measure_power összevetés (fánk) / Insights idősor (vonal)
{ type:'chart', chart:'donut', size:{w:4,h:4}, pos:{x:1,y:1},
  data:{ title:'Fogyasztás', full:true, unit:' W',
    sources:[ {deviceId:'a', label:'Nappali'}, {deviceId:'b', label:'Konyha'} ] } }
{ type:'chart', chart:'line', size:{w:4,h:2}, pos:{x:1,y:3},
  data:{ title:'7 nap', legend:true, labels:['Nappali'],
    insights:[ {logId:'homey:device:a:energy_power', resolution:'last7Days', color:'teal', fill:true} ] } }

// infografika — akárhány olvasható capability; a mértékegység, a tizedesek és a
// kitöltés-sáv a Homey capability-adataiból jön (units, decimals, min/max)
{ type:'info', size:{w:4,h:2}, pos:{x:1,y:1}, label:'Otthon', variant:'grid',
  items:[ {deviceId:'a', capability:'measure_temperature', icon:'thermo', color:'red'},
          {deviceId:'b', capability:'measure_humidity', icon:'droplet', color:'blue'},
          {deviceId:'c', capability:'energy_power', icon:'bolt', color:'amber', label:'Fogyasztás'} ] }
```

Az infografika `variant`-ja `grid` (egyenlő csempék) vagy `hero` (az első érték a teljes első
sort kapja, kiemelt méretben). Az `icon`, `color` és `label` elemenként opcionális; szín nélkül a
sorszám szerinti paletta-szín jár. Boolean → *Be/Ki*, enum → a Homey fordított címkéje, szám →
mértékegységgel, és ha a capability-nek van tartománya (pl. `dim`, `%`), akkor kitöltés-sávval.

Ikonok: `bulb`, `tv`, `speaker`, `blind`, `flow`, `lock`, `fan`, `power`, `away`, `coffee`, `movie`
(lásd `src/lib/icons.js`).

### Időjárás beállítása

```js
weather: { lat: 47.4979, lon: 19.0402, days: 7, name: 'Budapest' }
```

## NSPanel Pro / Fully Kiosk beállítás

- A panel és a kiszolgáló gép legyen **ugyanazon a hálózaton**.
- **Fully Kiosk Browser** (ajánlott): *Start URL* = `http://<gép-ip>:<port>/`.
  - Web Zoom / viewport: a lap fixen 480×480-ra van kalibrálva (viewport meta), nem kell zoom.
  - *Keep screen on*, *Auto-reload on connection lost* opciók ajánlottak.
- A beépített böngészővel is működik; állítsd a kezdőoldalt a fenti URL-re.

## Hibaelhárítás

- **Nem csatlakozik a Homey-hoz:** ellenőrizd az IP-t és a tokent; a panel és a Homey egy hálón
  legyen; a dashboard **HTTP-n** fusson (mixed-content). A hibaüzenet a Beállítások panelen látszik.
- **macOS tűzfal (dev):** engedélyezd a Node/Python bejövő kapcsolatát, vagy kapcsold ki átmenetileg.
- **Nincs időjárás:** az Open-Meteo eléréséhez internet kell; hiba esetén a widget mock adatra vált.
- **Megállt a Homey-szinkron (nem frissülnek az eszközállapotok):** ezt egy watchdog kezeli
  (`src/lib/homey.js`), nem kell lapot újratölteni. 30 s-onként HTTP-n ellenőrzi a kapcsolatot,
  2 percenként újraolvassa az összes eszközértéket, és ha a realtime socket elhalt vagy zombi
  (él, de nem hoz eseményt), újrakapcsolódik és újraépíti a feliratkozásokat. A lap előtérbe
  kerülése, a hálózat visszatérése és a `pageshow` azonnali ellenőrzést indít.
  Diagnosztika a böngésző konzoljából: `homeyConn.info()` (mit lát a watchdog),
  `homeyConn.check()` (azonnali ellenőrzés), `homeyConn.reconnect()` (kényszerített újrakapcsolás).

## Projektstruktúra

```
src/
├─ main.js, App.svelte
├─ config/dashboard.js          # oldalak + widgetek (config)
├─ styles/theme.css             # design tokenek
├─ lib/
│  ├─ homey.js                  # lokális Web API + realtime + Insights
│  ├─ stores.js                 # connection + devices store
│  ├─ weather.js                # Open-Meteo + cache
│  ├─ icons.js, charts.js, clock.js
└─ components/
   ├─ Pager.svelte              # pointer-alapú lapozó (csak konkrét oldalon áll meg)
   ├─ Page.svelte               # 4×4 CSS Grid
   ├─ Settings.svelte           # Homey kapcsolat űrlap
   ├─ Widget.svelte             # típus → komponens dispatcher
   └─ widgets/                  # Weather, Thermostat, SliderGroup, Slider, Button, Chart
```

