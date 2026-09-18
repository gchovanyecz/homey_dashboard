/**
 * Dashboard konfiguráció — deklaratív oldal- és widget-leírás.
 *
 * Widget mezők:
 *   - type: 'weather' | 'thermostat' | 'button' | 'sliderGroup' | 'chart'
 *   - size: { w, h }   — cella-span a 4×4 rácson
 *   - pos:  { x, y }   — 1-alapú kezdő oszlop/sor
 *   - típusfüggő adat (label, items, data, …)
 *
 * M3: Homey-kötés. Ha egy widgethez megadsz `deviceId`-t, élő adatot használ
 * és élőben ír; ha nincs deviceId, MOCK adattal működik (offline is).
 *
 * Kötés-példák (a deviceId-ket a Homey adja — csatlakozás után lásd
 * `window.homeyDevices` a böngésző konzolban):
 *   { type:'button', ..., deviceId:'abcd', capability:'onoff' }
 *   { type:'button', ..., kind:'flow', flowId:'efgh' }          // + advanced:true haladó flow-hoz
 *   { type:'thermostat', ..., deviceId:'ijkl' }                  // measure_/target_temperature
 *   { type:'sliderGroup', variant:'light', items:[ { label:'Nappali', deviceId:'mnop', value:80 } ] }
 *      // a capability a variant-ból jön (light→dim, speaker→volume_set, shade→windowcoverings_set),
 *      // vagy item-enként felülírható: { ..., capability:'dim' }
 *
 * Grafikon élő adat (Insights):
 *   // torta/fánk élő measure_power összevetés:
 *   { type:'chart', chart:'donut', data:{ title:'Fogyasztás', full:true,
 *       sources:[ {deviceId:'a', label:'Nappali'}, {deviceId:'b', label:'Konyha'} ], unit:' W' } }
 *   // vonal élő Insights idősorból:
 *   { type:'chart', chart:'line', data:{ title:'7 nap', legend:true, labels:['Nappali'],
 *       insights:[ {deviceId:'a', capability:'measure_power', resolution:'last7Days'} ] } }
 *   // sources/insights nélkül a data.vals / data.series MOCK értékek jelennek meg.
 */
export default {
  weather: { lat: 47.4979, lon: 19.0402, days: 7, name: 'Budapest' },
  pages: [
    {
      title: 'Áttekintés',
      widgets: [
        { type: 'weather', size: { w: 4, h: 2 }, pos: { x: 1, y: 1 } },
        { type: 'thermostat', size: { w: 2, h: 2 }, pos: { x: 1, y: 3 }, label: 'Nappali', current: 21.5, target: 22 },
        { type: 'button', size: { w: 2, h: 1 }, pos: { x: 3, y: 3 }, label: 'Nappali lámpa', icon: 'bulb', accent: 'amber', state: 'on' },
        { type: 'button', size: { w: 2, h: 1 }, pos: { x: 3, y: 4 }, label: 'TV', icon: 'tv', accent: 'blue', state: 'off' },
      ],
    },
    {
      title: 'Vezérlők',
      widgets: [
        {
          type: 'sliderGroup', size: { w: 4, h: 2 }, pos: { x: 1, y: 1 }, variant: 'light',
          items: [ { label: 'Nappali', value: 80 }, { label: 'Konyha', value: 35 }, { label: 'Étkező', value: 60 } ],
        },
        {
          type: 'sliderGroup', size: { w: 4, h: 2 }, pos: { x: 1, y: 3 }, variant: 'shade',
          items: [ { label: 'Nappali redőny', value: 60 }, { label: 'Háló redőny', value: 40 } ],
        },
      ],
    },
    {
      title: 'Gyorsvezérlők',
      widgets: [
        {
          type: 'sliderGroup', size: { w: 4, h: 4 }, pos: { x: 1, y: 1 }, variant: 'vertical', label: 'Gyorsvezérlők',
          items: [
            { label: 'Hangerő', value: 45, accent: 'teal', icon: 'speaker-sm', mode: 'live' },
            { label: 'Nappali', value: 80, accent: 'amber', icon: 'bulb-sm', mode: 'live' },
            { label: 'Dolgozó', value: 100, accent: 'amber', icon: 'bulb-sm', mode: 'live' },
            { label: 'Konyha', value: 60, accent: 'amber', icon: 'bulb-sm', mode: 'live' },
            { label: 'Háló', value: 40, accent: 'blue', icon: 'blind-sm', mode: 'release' },
            { label: 'Redőny', value: 20, accent: 'blue', icon: 'blind-sm', mode: 'release' },
          ],
        },
      ],
    },
    {
      title: 'Gombok & Flow-k',
      widgets: [
        { type: 'button', size: { w: 4, h: 1 }, pos: { x: 1, y: 1 }, label: 'Összes lámpa', icon: 'bulb', accent: 'amber', state: 'on', subOn: 'Bekapcsolva' },
        { type: 'button', size: { w: 1, h: 1 }, pos: { x: 1, y: 2 }, label: 'Vent.', icon: 'fan', state: 'off' },
        { type: 'button', size: { w: 3, h: 1 }, pos: { x: 2, y: 2 }, kind: 'flow', label: 'Jó éjt', icon: 'flow' },
        { type: 'button', size: { w: 2, h: 2 }, pos: { x: 1, y: 3 }, label: 'Bejárat', icon: 'lock', accent: 'blue', state: 'on', subOn: 'Zárva' },
        { type: 'button', size: { w: 2, h: 1 }, pos: { x: 3, y: 3 }, label: 'Konnektor', icon: 'power', accent: 'blue', state: 'on', subOn: 'Be' },
        { type: 'button', size: { w: 2, h: 1 }, pos: { x: 3, y: 4 }, kind: 'flow', label: 'Távozás', icon: 'away' },
      ],
    },
    {
      title: 'Grafikonok',
      widgets: [
        { type: 'chart', chart: 'donut', size: { w: 2, h: 2 }, pos: { x: 1, y: 1 }, data: { title: 'Helyiségek · össz', vals: [18, 12, 10, 8], center: '48 kWh', highlight: 1 } },
        { type: 'chart', chart: 'pie', size: { w: 2, h: 2 }, pos: { x: 3, y: 1 }, data: { title: 'Eszközök', vals: [35, 25, 20, 12, 8], highlight: 0 } },
        {
          type: 'chart', chart: 'line', size: { w: 4, h: 2 }, pos: { x: 1, y: 3 },
          data: { title: 'Heti fogyasztás — Nappali vs Konyha', series: [[8, 10, 7, 12, 9, 14, 11], [5, 6, 5, 7, 8, 6, 7]], labels: ['Nappali', 'Konyha'], legend: true },
        },
      ],
    },
  ],
}
