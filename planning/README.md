# Planning — Homey Dashboard (NSPanel Pro)

Ez a mappa a tervezési anyagokat tartalmazza. A teljes terv:
`~/.claude/plans/szeretn-k-egy-f-ggetlen-helyen-tingly-quill.md`.

## M0 — Look & feel mockup

Statikus, mock-adatos HTML mockup a végleges Homey-stílusú vizuállal, 480×480-ra kalibrálva.

- **Forrás:** [`mockups/dashboard.html`](mockups/dashboard.html) — önálló, offline (inline CSS + SVG ikonok),
  4 oldal vízszintes swipe-pal, alul oldal-pöttyök (kattinthatók).
- **Lapozás:** transzformáció-alapú, húzás-követő lapozó. Elengedéskor **csak konkrét oldalon áll meg**
  (küszöb ~86px + irány dönt; alatta visszaugrik) — nincs köztes állapot. Szél gumis, `←/→` billentyű is lapoz.
- **Screenshotok** (Playwright, 480×480, device scale):

| Oldal | Tartalom | Kép |
|------|----------|-----|
| 1. Áttekintés | Időjárás (jelenlegi + 4 napos, **kondíció szerint színes előrejelzés-ikonokkal**: nap=arany, felhő=szürkéskék, eső=kék, hó=világoskék, vihar=lila) + teljes szélességű termosztát: rovátkás (tick-scale) tárcsa, kiemelt dupla fehér cél-vonás, **középen nagy = mért hőmérséklet, alatta kisebb = célhőmérséklet**, lent ív-követő ⌄/⌃ gombsáv | [`screenshots/page1-overview.png`](screenshots/page1-overview.png) |
| 2. Vezérlők | **Vízszintes csúszka-csoportok**: több azonos típusú, vékony csúszka egy kártyában — „Világítás" és „Hangerő" (húzás közben küld), „Árnyékolás" (csak elengedéskor) | [`screenshots/page2-controls.png`](screenshots/page2-controls.png) |
| 3. Gyorsvezérlők | Önálló oldal egy **vertikális csúszka-csoporttal** — 6 keskeny csúszka egymás mellett (hangerő, világítások, árnyékolások) | [`screenshots/page3-quickcontrols.png`](screenshots/page3-quickcontrols.png) |
| 4. Gombok & Flow-k | Eszköz- és flow-gombok különböző állapotokban (be/ki, zárás, flow) | [`screenshots/page4-buttons.png`](screenshots/page4-buttons.png) |

### Színkód (accentek)
- **Amber** = világítás (aktív = meleg sárga glow)
- **Teal** = hangszóró / hangerő
- **Kék** = árnyékolás, zárak, kapcsolt eszközök; flow-k kék ikonnal
- **Termosztát** = fehér rovátkás skála sötét háttéren, kiemelt fehér cél-vonás (referencia-stílus)

### Csúszka viselkedés (a mockupon feliratozva)
- Világítás (`dim`) / hangszóró (`volume_set`) → **húzás közben** küld (throttle).
- Árnyékolás (`windowcoverings_set`) → **csak elengedéskor** küld.

## M0b — 4×4 rács & widget-méretek

Minden oldal egy **4×4-es rács** (mátrix). A widgetek több méretben (oszlop×sor span) helyezhetők el.
Katalógus: [`mockups/grid-sizes.html`](mockups/grid-sizes.html) — 11 oldal, oldalanként a 4×4 rácsvonalakkal
és méret-badge-ekkel.

| Widget | Elérhető méretek (oszlop×sor) | Megjegyzés | Kép |
|--------|-------------------------------|------------|-----|
| Időjárás | **2×2**, **4×2**, **4×4** | mind mutat előrejelzést (2×2 → 3 nap, 4×2/4×4 → 7 nap) függőlegesen egymás alá rendezve; részletes adatok **ikonokkal** (eső esély, szél, pára, légnyomás, UV, napkelte). Színes kondíció-ikonok | [2×2 & 4×2](screenshots/sizes-01-weather-2x2-4x2.png) · [4×4](screenshots/sizes-02-weather-4x4.png) |
| Termosztát | **2×2**, **4×4** | tick-scale tárcsa kitölti a helyet; **középen nagy = aktuális, alatta kisebb = cél**; van eszköz-label | [2×2](screenshots/sizes-03-thermostat-2x2.png) · [4×4](screenshots/sizes-04-thermostat-4x4.png) |
| Vízszintes csúszka | **4×1, 4×2, 4×3, 4×4** | sűrű elrendezés — kényelmesen több eszköz is kifér (magasság = eszközszám) | [4×1 & 4×3](screenshots/sizes-05-hslider-4x1-4x3.png) · [4×2](screenshots/sizes-06-hslider-4x2.png) · [4×4](screenshots/sizes-07-hslider-4x4.png) |
| Függőleges csúszka | **1×4, 2×4, 3×4, 4×4** | keskeny csúszkák — több is kényelmesen elfér egy kártyán (szélesség = eszközszám) | [1×4 & 3×4](screenshots/sizes-08-vslider-1x4-3x4.png) · [2×4](screenshots/sizes-09-vslider-2x4.png) · [4×4](screenshots/sizes-10-vslider-4x4.png) |
| Gomb | **1×1, 2×1, 3×1, 4×1, 2×2** | egy oldalon mind | [gombok](screenshots/sizes-11-buttons.png) |
| Grafikon (Insight) | **2×2, 4×2, 4×4** | torta / fánk / vonal — **könnyű inline-SVG, nincs külső lib** (gyenge eszközön is gyors). **Torta/fánk design:** zöld, átlósan sraffozott szegmensek résekkel, egy szegmens élénkzölddel kiemelve, halvány külső gyűrű; a nagy fánk közepén a kiemelt elem címke+értéke és a `total`. Több eszköz/helyiség fogyasztásának összehasonlítására. Vonal: idősoros Insight több sorozattal + tengelyrács. **Reszponzív — a diagram kitölti a cellát a maximális láthatóságért** (fix viewBox + `width/height:100%`) | [2×2](screenshots/sizes-12-chart-2x2.png) · [4×2](screenshots/sizes-13-chart-4x2.png) · [4×4 fánk](screenshots/sizes-14-chart-4x4-donut.png) · [4×4 vonal](screenshots/sizes-15-chart-4x4-line.png) |

A csúszka-méretek automatikusan a csoportba tett eszközök számából adódnak (több eszköz → nagyobb widget),
és a sűrű elrendezésnek köszönhetően egy adott méret is kényelmesen több eszközt fogad.
A vízszintes és függőleges csúszkák **vastagsága egységes (18px)**.

### Rács-méret döntés

A **4×4-es rács** marad: 480×480-on ez ~100px-es, ujjbarát cellát ad, és minden kért méret jól kijön.
Egy finomabb rács (pl. 8×8) ~46px-es cellái túl kicsik lennének gombokhoz/tapintáshoz, és csak
átnevezné a méreteket (2×2 → 4×4 stb.) valódi előny nélkül. A nem-négyzetes span-ek (4×1, 1×4) már most
megadják a szükséges rugalmasságot.

## Mockup újrarenderelése / screenshotolása

```bash
cd planning/mockups && python3 -m http.server 8899
# böngészőben: http://localhost:8899/dashboard.html  (ablak 480×480)
```

A screenshotok Playwright-tal, 480×480 viewporton, oldalanként elemre célzott capture-rel készültek.
