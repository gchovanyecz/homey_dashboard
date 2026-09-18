/* Inline SVG ikonkészlet (offline-barát, nincs CDN). currentColor-t használ. */
export const ICONS = {
  bulb: `<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2H14.5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3Z"/>`,
  'bulb-sm': `<path d="M9.5 18.5h5M10.5 21h3"/><path d="M12 4a5 5 0 0 0-3 9c.5.4.8 1 .9 1.6h4.2c.1-.6.4-1.2.9-1.6A5 5 0 0 0 12 4Z"/>`,
  tv: `<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>`,
  speaker: `<rect x="7" y="3" width="10" height="18" rx="2.5"/><circle cx="12" cy="14" r="3"/><circle cx="12" cy="7" r="1"/>`,
  'speaker-sm': `<rect x="8" y="4" width="8" height="16" rx="2"/><circle cx="12" cy="13" r="2.4"/><circle cx="12" cy="7.5" r=".9"/>`,
  blind: `<rect x="4" y="4" width="16" height="4" rx="1"/><path d="M6 8v8M18 8v8M12 8v6M8 12h8M8 16h8"/>`,
  'blind-sm': `<rect x="5" y="4" width="14" height="3.5" rx="1"/><path d="M12 8v6M7.5 12h9M7.5 15.5h9"/>`,
  flow: `<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 6H14a3 3 0 0 1 3 3v6.5"/>`,
  movie: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M8 6l-2 4M13 6l-2 4M18 6l-2 4"/>`,
  lock: `<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`,
  fan: `<circle cx="12" cy="12" r="1.6"/><path d="M12 10.4c0-3 .4-5.4-1.5-6.2C8.2 3.3 7 6 8.5 8.2M13.6 12c3 0 5.4.4 6.2-1.5.9-2.3-1.8-3.5-4-2M12 13.6c0 3-.4 5.4 1.5 6.2 2.3.9 3.5-1.8 2-4"/>`,
  coffee: `<path d="M5 9h11v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5Z"/><path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2M8 3v2M11 3v2"/>`,
  away: `<path d="M14 21V5a2 2 0 0 0-2-2H6v18M14 12h6M17 9l3 3-3 3"/>`,
  power: `<path d="M12 4v7M7.5 7a7 7 0 1 0 9 0"/>`,
  sliders: `<path d="M5 6h9M18 6h1M5 12h1M10 12h9M5 18h5M14 18h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="12" cy="18" r="2"/>`,
  // időjárás-részletek
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>`,
  droplet: `<path d="M12 3.5s5.5 6 5.5 10a5.5 5.5 0 0 1-11 0c0-4 5.5-10 5.5-10Z"/>`,
  wind: `<path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5M3 12h15a2.5 2.5 0 1 1-2.5 2.5M3 16h8a2.5 2.5 0 1 1-2.5 2.5"/>`,
  umbrella: `<path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5H3.5A8.5 8.5 0 0 1 12 3.5ZM12 12v6.5a2 2 0 0 0 4 0"/>`,
  gauge: `<path d="M4 19a8 8 0 1 1 16 0"/><path d="M12 14l3.5-3.5"/>`,
  sunrise: `<path d="M12 3v5M9 6l3-3 3 3M4.5 12H3M21 12h-1.5M6 15a6 6 0 0 1 12 0M3 19h18"/>`,
  // paletta / egyéb
  weather: `<circle cx="8" cy="8" r="3"/><path d="M8 2.5V4M2.8 8H4.3M3.9 3.9l1 1M12.1 3.9l-1 1"/><path d="M7 19h9a3.2 3.2 0 0 0 0-6.4 4.4 4.4 0 0 0-8.4-1.2A3.2 3.2 0 0 0 7 19Z"/>`,
  thermo: `<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"/><path d="M12 9v5.5"/>`,
  chart: `<rect x="4" y="12" width="3.4" height="8" rx="1"/><rect x="10.3" y="7" width="3.4" height="13" rx="1"/><rect x="16.6" y="4" width="3.4" height="16" rx="1"/>`,
  grip: `<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>`,
  mood: `<path d="M11 3l1.6 4.5L17 9l-4.4 1.5L11 15l-1.6-4.5L5 9l4.4-1.5L11 3Z"/><path d="M18 13.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"/>`,
  // ---- világítás ----
  'bulb-filament': `<path d="M9 18h6M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3Z"/><path d="M10.2 11.8 11 8.8l1 2 1-2 .8 3"/>`,
  'lamp-table': `<path d="M5.5 12 8.5 5h7l3 7Z"/><path d="M12 12v6M8 18.5h8"/>`,
  'lamp-floor': `<path d="M7.5 9 9.8 3h4.4L16.5 9Z"/><path d="M12 9v10M9 21l3-2 3 2"/>`,
  'lamp-ceiling': `<path d="M12 3v3.5"/><path d="M4 15 8 6.5h8l4 8.5Z"/>`,
  spot: `<path d="M2.5 4.5h19"/><rect x="9.5" y="4.5" width="5" height="3.5" rx="1"/><path d="M10 8 6 19.5M14 8l4 11.5M6 19.5h12"/>`,
  'light-strip': `<rect x="2.5" y="8.5" width="19" height="4" rx="2"/><path d="M6 16v.01M10 17.2v.01M14 16v.01M18 17.2v.01"/>`,
  'string-lights': `<path d="M2.5 5.5c5 2.5 14 2.5 19 0"/><path d="M6.5 7.6v2.4M12 8.2v2.4M17.5 7.6v2.4"/><circle cx="6.5" cy="12" r="1.8"/><circle cx="12" cy="12.6" r="1.8"/><circle cx="17.5" cy="12" r="1.8"/>`,
  'garden-light': `<path d="M12 4.5 15.5 8h-7Z"/><path d="M9 8h6v6.5H9Z"/><path d="M12 14.5v5M9.5 20h5"/>`,

  // ---- kapcsoló, konnektor, energia ----
  socket: `<rect x="3" y="3" width="18" height="18" rx="4.5"/><circle cx="12" cy="12" r="6"/><circle cx="9.5" cy="12" r="1.1"/><circle cx="14.5" cy="12" r="1.1"/>`,
  plug: `<path d="M9 3.5v3M15 3.5v3"/><path d="M6.5 6.5h11v3a5.5 5.5 0 0 1-11 0Z"/><path d="M12 15v5.5"/>`,
  'power-strip': `<rect x="2.5" y="8.5" width="19" height="7" rx="2.5"/><circle cx="9" cy="12" r="1.3"/><circle cx="13.5" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/><path d="M5.4 10.6v2.8"/>`,
  'switch-wall': `<rect x="4" y="3" width="16" height="18" rx="3"/><rect x="8.5" y="7" width="7" height="10" rx="1.5"/><path d="M8.5 12h7"/>`,
  'switch-toggle': `<rect x="2.5" y="7.5" width="19" height="9" rx="4.5"/><circle cx="16.8" cy="12" r="2.7"/>`,
  button: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.4"/>`,
  remote: `<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><circle cx="12" cy="6.8" r="1.6"/><path d="M9.6 11.5h4.8M9.6 14.5h4.8M9.6 17.5h4.8"/>`,
  battery: `<rect x="2.5" y="7.5" width="17" height="9" rx="2.5"/><path d="M21.5 10.5v3"/><path d="M6.5 11v2M10.5 11v2M14.5 11v2"/>`,
  bolt: `<path d="M13 2.5 6 13.5H11L10 21.5 18 10H13Z"/>`,
  solar: `<path d="M3.5 15.5 6.5 6h11l3 9.5Z"/><path d="M5.2 11h13.6M12 6v9.5"/><path d="M12 15.5v3.5M8.5 19h7"/>`,

  // ---- nyílászáró ----
  door: `<path d="M5.5 20.5V4.5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v16"/><path d="M4 20.5h16"/><circle cx="15" cy="12.5" r="1.1"/>`,
  'door-open': `<path d="M3 20.5h18"/><path d="M6 20.5V4h5"/><path d="M11 2.5 18.5 5.5v15H11Z"/><circle cx="13.4" cy="13" r="1"/>`,
  garage: `<path d="M3 10.5 12 5l9 5.5V20.5H3Z"/><path d="M6.5 14h11M6.5 17h11M6.5 20.5h11"/>`,
  gate: `<path d="M2.5 6.5v13M21.5 6.5v13"/><path d="M2.5 9.5h19M2.5 16.5h19"/><path d="M7 8v10M12 8v10M17 8v10"/>`,
  window: `<rect x="4" y="3.5" width="16" height="14" rx="1.5"/><path d="M12 3.5v14M4 10.5h16"/><path d="M3 20.5h18"/>`,
  curtain: `<path d="M2.5 4.5h19"/><path d="M4.5 4.5v11c0 2.5 1.6 4 3.5 4s3.5-1.5 3.5-4v-11"/><path d="M13 4.5v11c0 2.5 1.6 4 3.5 4s3.5-1.5 3.5-4v-11"/>`,
  unlock: `<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7"/>`,

  // ---- okoszár, beléptetés ----
  'smart-lock': `<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/><path d="M9.4 15.4a3.7 3.7 0 0 1 5.2 0"/><path d="M11 17.4a1.4 1.4 0 0 1 2 0"/><path d="M12 19.2v.01"/>`,
  'lock-keypad': `<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/><path d="M9.4 14.7v.01M12 14.7v.01M14.6 14.7v.01M9.4 17.6v.01M12 17.6v.01M14.6 17.6v.01"/>`,
  'lock-check': `<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/><path d="m9.2 15.6 2.2 2.3 4-4.2"/>`,
  keypad: `<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M9.4 7.5v.01M12 7.5v.01M14.6 7.5v.01M9.4 11v.01M12 11v.01M14.6 11v.01M9.4 14.5v.01M12 14.5v.01M14.6 14.5v.01M12 18v.01"/>`,
  key: `<circle cx="8.2" cy="8.2" r="4"/><path d="M11.1 11.1 19.8 19.8"/><path d="m15.3 15.3 2.3-2.3M17.6 17.6l1.8-1.8"/>`,
  'key-card': `<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><rect x="5.5" y="9" width="5.5" height="4.5" rx="1.2"/><path d="M14.6 10a4 4 0 0 1 0 4M17.2 8a7 7 0 0 1 0 8"/>`,
  fingerprint: `<path d="M12 12v5.8"/><path d="M8.9 12.1a3.1 3.1 0 0 1 6.2 0c0 2.3-.3 4.3-.9 6.1"/><path d="M5.8 12.2a6.2 6.2 0 0 1 12.4 0c0 1.7-.2 3.3-.5 4.9"/><path d="M9 18.9c.6-1.6.9-3.3.9-5.1"/><path d="M4.8 8.5A8 8 0 0 1 12 4a8 8 0 0 1 5.4 2.1"/>`,
  'door-lock': `<path d="M5.5 20.5V4.5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v16"/><path d="M4 20.5h16"/><circle cx="14.6" cy="12.4" r="2.5"/><path d="M14.6 14.9v2.3"/>`,

  // ---- háztartási eszközök ----
  washer: `<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M4 8.5h16"/><path d="M7 5.7v.01M10 5.7v.01"/><circle cx="12" cy="14.5" r="4.2"/>`,
  dryer: `<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M4 8.5h16"/><path d="M7 5.7v.01M10 5.7v.01"/><path d="M8.5 13.2c1.2-1.3 2.3-1.3 3.5 0s2.3 1.3 3.5 0M8.5 17.2c1.2-1.3 2.3-1.3 3.5 0s2.3 1.3 3.5 0"/>`,
  dishwasher: `<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M4 8.5h16M7 5.7h3.5"/><path d="M12 11.5s2.2 2.6 2.2 4a2.2 2.2 0 0 1-4.4 0c0-1.4 2.2-4 2.2-4Z"/>`,
  fridge: `<rect x="5.5" y="2.5" width="13" height="19" rx="2.5"/><path d="M5.5 9.5h13"/><path d="M8.5 5.5v2M8.5 12v3"/>`,
  oven: `<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M3.5 9h17"/><path d="M6.8 6.5v.01M9.8 6.5v.01"/><rect x="6.5" y="11.5" width="11" height="6" rx="1.5"/>`,
  stove: `<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="8.6" cy="8.6" r="2.2"/><circle cx="15.4" cy="8.6" r="2.2"/><circle cx="8.6" cy="15.4" r="2.2"/><circle cx="15.4" cy="15.4" r="2.2"/>`,
  microwave: `<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M16 6v12"/><path d="M18.8 9.5v.01M18.8 12v.01"/><rect x="5.5" y="9" width="7.5" height="6" rx="1.5"/>`,
  kettle: `<path d="M7.5 10h8.5l1 10.5H6.5Z"/><path d="M7.6 10.2 4.6 7"/><path d="M17 12.2c2 .9 2 3.4 0 4.3"/><path d="M10.2 10V8h3.2v2"/>`,
  vacuum: `<path d="M2.5 16.5c0-4.6 4.3-8.2 9.5-8.2s9.5 3.6 9.5 8.2Z"/><path d="M2.5 16.5h19"/><circle cx="7.5" cy="19" r="1.7"/><circle cx="16.5" cy="19" r="1.7"/>`,
  boiler: `<rect x="6" y="3" width="12" height="15" rx="4"/><path d="M9.5 18v2.5M14.5 18v2.5"/><path d="M12 7.5s1.9 2.3 1.9 3.7a1.9 1.9 0 0 1-3.8 0c0-1.4 1.9-3.7 1.9-3.7Z"/>`,
  radiator: `<rect x="3.5" y="5.5" width="17" height="11" rx="2"/><path d="M7.7 5.5v11M12 5.5v11M16.3 5.5v11"/><path d="M6.5 16.5v3M17.5 16.5v3"/>`,
  ac: `<rect x="2.5" y="4.5" width="19" height="8" rx="2.5"/><path d="M6 9.5h12"/><path d="M8 16c1.1-1.3 2.2-1.3 3.3 0s2.2 1.3 3.3 0M8 19.5c1.1-1.3 2.2-1.3 3.3 0s2.2 1.3 3.3 0"/>`,
  pump: `<circle cx="11.5" cy="14" r="5.5"/><circle cx="11.5" cy="14" r="1.6"/><path d="M11.5 8.5V5h5.5"/><path d="M6 14H2.5"/><path d="M7.5 19.8h8"/>`,

  // ---- biztonság, érzékelők ----
  camera: `<rect x="3" y="7" width="12" height="10" rx="2.5"/><circle cx="9" cy="12" r="2.6"/><path d="M15 11 20.5 8v8L15 13Z"/>`,
  motion: `<path d="M6 9.5a6 6 0 0 1 12 0Z"/><path d="M4.5 9.5h15"/><path d="M9 13c1.8 1.6 4.2 1.6 6 0M6.8 16.5c3.2 2.8 7.2 2.8 10.4 0"/>`,
  contact: `<rect x="3.5" y="7" width="7" height="10" rx="1.5"/><rect x="13.5" y="7" width="7" height="10" rx="1.5"/><path d="M11.3 12h1.4"/>`,
  smoke: `<circle cx="12" cy="7" r="4"/><path d="M12 7v.01"/><path d="M5.5 14c1.2-1.3 2.4-1.3 3.6 0s2.4 1.3 3.6 0 2.4-1.3 3.6 0M6.5 18c1.2-1.3 2.4-1.3 3.6 0s2.4 1.3 3.6 0 2.4-1.3 3.6 0"/>`,
  leak: `<path d="M12 3s4.3 5 4.3 8.2a4.3 4.3 0 0 1-8.6 0C7.7 8 12 3 12 3Z"/><path d="M4 18.5c1.3-1.3 2.7-1.3 4 0s2.7 1.3 4 0 2.7-1.3 4 0 2.7 1.3 4 0"/>`,
  bell: `<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5"/><path d="M4.5 16.5h15"/><path d="M9.8 19.5a2.3 2.3 0 0 0 4.4 0"/><path d="M12 5.5V3.5"/>`,
  doorbell: `<circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="1.2"/><path d="M18.6 6.4a8 8 0 0 1 0 11.2M5.4 6.4a8 8 0 0 0 0 11.2"/>`,
  person: `<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>`,
  shield: `<path d="M12 3.5 5 6v6c0 4.4 3 7.4 7 8.5 4-1.1 7-4.1 7-8.5V6Z"/>`,

  // ---- média, technika ----
  pc: `<rect x="2.5" y="4.5" width="19" height="12" rx="2"/><path d="M8 20.5h8M12 16.5v4"/>`,
  wifi: `<path d="M3.5 9.5a13 13 0 0 1 17 0M6.5 13a8.5 8.5 0 0 1 11 0M9.5 16.5a4 4 0 0 1 5 0"/><path d="M12 20v.01"/>`,
  // QR: három pozíció-négyzet + néhány adatmodul, a vonalas stílushoz igazítva
  qr: `<rect x="3.4" y="3.4" width="6.6" height="6.6" rx="1.3"/><rect x="14" y="3.4" width="6.6" height="6.6" rx="1.3"/><rect x="3.4" y="14" width="6.6" height="6.6" rx="1.3"/><path d="M6.7 6.7v.01M17.3 6.7v.01M6.7 17.3v.01"/><path d="M14.3 14.3v.01M17.3 14.3v.01M20.3 14.3v.01M14.3 17.3v.01M20.3 17.3v.01M14.3 20.3v.01M17.3 20.3v.01M20.3 20.3v.01"/>`,
  router: `<rect x="3" y="12.5" width="18" height="7" rx="2"/><path d="M7 15.5v1.2M10.5 15.5v1.2"/><path d="M8 12.5 5.5 6M16 12.5 18.5 6"/>`,
  car: `<path d="M4 16v-4l2-4.5h12l2 4.5v4"/><path d="M4 12h16"/><circle cx="7.5" cy="16.2" r="1.8"/><circle cx="16.5" cy="16.2" r="1.8"/>`,

  // ---- klíma, idő ----
  flame: `<path d="M12 21a6 6 0 0 0 6-6c0-5-4.5-7-5-12-2.5 2-4 5-4 7.5 0-1.2-.8-2.2-1.8-2.8C6 9.5 6 12.5 6 15a6 6 0 0 0 6 6Z"/>`,
  /* Hópehely: hat ág, ágankét EGY kifelé álló tüske-párral, 60°-os forgatással.
     A két tüske-páros (referencia-hű) változat a panel méreteinél (21px a
     scene-listán) sűrű foltba futott, ezért egy pár maradt, kijjebb tolva —
     így a hat ág és a közép is tisztán látszik. */
  snowflake: `<path d="M12 12 12 2.00"/><path d="M12 5.60 9.74 3.34"/><path d="M12 5.60 14.26 3.34"/><g transform="rotate(60 12 12)"><path d="M12 12 12 2.00"/><path d="M12 5.60 9.74 3.34"/><path d="M12 5.60 14.26 3.34"/></g><g transform="rotate(120 12 12)"><path d="M12 12 12 2.00"/><path d="M12 5.60 9.74 3.34"/><path d="M12 5.60 14.26 3.34"/></g><g transform="rotate(180 12 12)"><path d="M12 12 12 2.00"/><path d="M12 5.60 9.74 3.34"/><path d="M12 5.60 14.26 3.34"/></g><g transform="rotate(240 12 12)"><path d="M12 12 12 2.00"/><path d="M12 5.60 9.74 3.34"/><path d="M12 5.60 14.26 3.34"/></g><g transform="rotate(300 12 12)"><path d="M12 12 12 2.00"/><path d="M12 5.60 9.74 3.34"/><path d="M12 5.60 14.26 3.34"/></g>`,
  moon: `<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>`,
  clock: `<circle cx="12" cy="12.5" r="8"/><path d="M12 8v4.7l3.2 2"/>`,

  suitcase: `<rect x="3" y="7.5" width="18" height="12.5" rx="2.5"/><path d="M9 7.5V5.8a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 5.8v1.7"/><path d="M8 7.5v12.5M16 7.5v12.5"/>`,

  // ---- hulladék ----
  trash: `<path d="M4 7h16"/><path d="M9.5 7V5.2a1.2 1.2 0 0 1 1.2-1.2h2.6a1.2 1.2 0 0 1 1.2 1.2V7"/><path d="M6.3 7l.9 12.1a1.8 1.8 0 0 0 1.8 1.7h6a1.8 1.8 0 0 0 1.8-1.7L17.7 7"/><path d="M10.3 11v6M13.7 11v6"/>`,
  /* Szelektív: a klasszikus Möbius-hurok (univerzális újrahasznosítási jel, közkincs)
     geometriája 24×24-re méretezve. Tömör kitöltés: vonalasan rajzolva a panel 18–26px-es
     méreteinél összefolyik, és épp a jellegzetes alak veszne el. */
  recycle: `<path fill="currentColor" stroke="none" d="M12.44 17.69L14.59 13.82L14.6 15.24L19.14 15.23C19.95 15.14 20.66 14.81 21.18 14.19C19.53 17.55 19.06 19.93 15.65 19.93L14.6 19.93L14.59 21.5ZM7.24 19.97C4.82 19.23 3.68 16.24 2.58 14.13C3.08 14.6 4.04 15.26 4.59 15.26C5.65 15.26 6.71 15.26 7.77 15.26L10.98 15.26L10.97 19.95L10.96 19.97ZM2.4 12.91L3.95 9.75L2.44 8.92L6.97 8.92L9.16 12.89L7.67 12.0C7.2 13.01 6.72 14.02 6.24 15.02C5.7 15.01 5.15 15.0 4.6 14.99C3.53 14.74 2.79 13.9 2.4 12.91ZM17.54 14.97L15.54 11.28L19.58 8.83L21.54 12.76C21.6 13.7 20.08 15.0 19.14 14.99ZM5.7 6.34L7.76 3.24C9.77 2.5 10.93 4.11 11.66 5.12L9.72 8.86ZM13.53 8.01C13.11 7.03 12.56 5.91 11.86 4.93C11.24 4.06 10.49 3.3 9.92 2.96L15.15 2.95C16.09 3.03 16.54 3.58 17.04 4.33L17.79 5.65L18.95 4.91L16.77 8.8L12.05 8.81Z"/>`,
  leaf: `<path d="M4.5 19.5c0-8 5-13 15-13 0 9.5-5.5 13.5-11 13.5a4 4 0 0 1-4-.5Z"/><path d="M8 19c1.5-4.5 4.5-7.5 8.5-9.5"/>`,

  // ---- otthon, kert ----
  home: `<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M9.5 21v-6h5v6"/>`,
  plant: `<path d="M12 20.5V11.5"/><path d="M12 11.5C12 8 10 6 6.5 6c0 3.5 2 5.5 5.5 5.5Z"/><path d="M12 11.5C12 8 14 6 17.5 6c0 3.5-2 5.5-5.5 5.5Z"/><path d="M8.5 20.5h7"/>`,
  bed: `<path d="M3 20v-8"/><path d="M3 15.5h18V20"/><path d="M21 15.5v-2.8a1.7 1.7 0 0 0-1.7-1.7H11v4.5"/><circle cx="7" cy="12.7" r="2.1"/>`,

  // BKK járattípusok
  bus: `<rect x="5" y="4" width="14" height="13" rx="2"/><path d="M5 9h14M8 17v2M16 17v2"/><circle cx="8.5" cy="13.5" r="1"/><circle cx="15.5" cy="13.5" r="1"/>`,
  tram: `<rect x="6" y="4" width="12" height="12" rx="2"/><path d="M6 9h12M12 4V2M9 20l3-4 3 4M8.5 16h.01M15.5 16h.01"/>`,
  metro: `<path d="M12 4c-4 0-7 .8-7 4v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8c0-3.2-3-4-7-4Z"/><path d="M5 12h14M9 20l-1.5 2M15 20l1.5 2"/><circle cx="8.5" cy="15.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/>`,
  trolley: `<rect x="5" y="6" width="14" height="11" rx="2"/><path d="M5 11h14M8 17v2M16 17v2M10 6l-2-3M14 6l2-3"/>`,
  rail: `<rect x="6" y="3" width="12" height="13" rx="2"/><path d="M6 10h12M9 20l3-4 3 4M7 20h10"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>`,
  ferry: `<path d="M4 15l1.5 5h13L20 15M6 15V8h12v7M9 8V5h6v3M12 3v2"/>`,
}

// Választható beépített ikonok az admin ikon-pickerben, témák szerint.
// (A '-sm' változatok és a 'grip' szándékosan nincsenek itt: azokat a widgetek használják belsőleg.)
export const PICK_GROUPS = [
  { label: 'Világítás', icons: ['bulb', 'bulb-filament', 'lamp-table', 'lamp-floor', 'lamp-ceiling', 'spot', 'light-strip', 'string-lights', 'garden-light'] },
  { label: 'Kapcsoló, konnektor', icons: ['power', 'switch-wall', 'switch-toggle', 'button', 'socket', 'plug', 'power-strip', 'remote', 'sliders', 'battery', 'bolt', 'solar'] },
  { label: 'Nyílászáró', icons: ['door', 'door-open', 'garage', 'gate', 'window', 'curtain', 'blind'] },
  { label: 'Zárak, beléptetés', icons: ['lock', 'unlock', 'smart-lock', 'lock-keypad', 'lock-check', 'door-lock', 'keypad', 'key', 'key-card', 'fingerprint'] },
  { label: 'Háztartás', icons: ['washer', 'dryer', 'dishwasher', 'fridge', 'oven', 'stove', 'microwave', 'kettle', 'coffee', 'vacuum', 'boiler', 'radiator', 'ac', 'fan', 'pump'] },
  { label: 'Biztonság, érzékelő', icons: ['camera', 'motion', 'contact', 'smoke', 'leak', 'bell', 'doorbell', 'person', 'shield'] },
  { label: 'Média, technika', icons: ['tv', 'speaker', 'movie', 'pc', 'wifi', 'router', 'qr', 'car'] },
  { label: 'Klíma, időjárás', icons: ['thermo', 'flame', 'snowflake', 'weather', 'sun', 'droplet', 'wind', 'umbrella', 'gauge', 'sunrise', 'moon'] },
  { label: 'Otthon, kert', icons: ['home', 'plant', 'bed', 'clock', 'suitcase'] },
  { label: 'Hulladék', icons: ['trash', 'recycle', 'leaf'] },
  { label: 'Jelenet, egyéb', icons: ['mood', 'flow', 'away', 'chart'] },
  { label: 'BKK járatok', icons: ['bus', 'tram', 'metro', 'trolley', 'rail', 'ferry'] },
]

// Lapított lista (visszafelé kompatibilitás + kereséshez)
export const PICK_ICONS = [...new Set(PICK_GROUPS.flatMap((g) => g.icons))]

export function icon(name, { w = 24, h = 24, sw = 1.8 } = {}) {
  // Homey-ba feltöltött (URL-es) ikon → CSS mask, currentColor kitöltéssel,
  // hogy ugyanúgy színeződjön, mint a beépített (stroke=currentColor) ikonok.
  if (typeof name === 'string' && (name.startsWith('http') || name.startsWith('/'))) {
    const m = `url('${name}') center / contain no-repeat`
    return `<span style="display:block;width:${w}px;height:${h}px;background-color:currentColor;-webkit-mask:${m};mask:${m}"></span>`
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`
}

/* Kétszínű, kondíció szerint SZÍNES időjárás-ikonok */
const WX_SUN = '#ffce3a',
  WX_CLOUD = '#9fb0c0',
  WX_RAIN = '#4f9dff',
  WX_SNOW = '#bfe6ff',
  WX_BOLT = '#b39cff'

export const WX_COND = {
  sun: `<g stroke="${WX_SUN}"><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4"/></g>`,
  partly: `<g stroke="${WX_SUN}"><circle cx="9" cy="9" r="3.1"/><path d="M9 2.6V4M2.6 9H4M4.4 4.4l1 1M13.6 4.4l-1 1"/></g><path d="M8 18h9a3 3 0 0 0 0-6 4.2 4.2 0 0 0-8-1.2" stroke="${WX_CLOUD}"/>`,
  cloud: `<path d="M7 18h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.3A3.5 3.5 0 0 0 7 18Z" stroke="${WX_CLOUD}"/>`,
  rain: `<path d="M7 14h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.3A3.5 3.5 0 0 0 7 14Z" stroke="${WX_CLOUD}"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" stroke="${WX_RAIN}"/>`,
  snow: `<path d="M7 14h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.3A3.5 3.5 0 0 0 7 14Z" stroke="${WX_CLOUD}"/><path d="M9 18v.01M12 19v.01M15 18v.01M10.5 21v.01M13.5 21v.01" stroke="${WX_SNOW}"/>`,
  storm: `<path d="M7 13h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.3A3.5 3.5 0 0 0 7 13Z" stroke="${WX_CLOUD}"/><path d="M13 14l-3 4h3l-2 3" stroke="${WX_BOLT}"/>`,
}

export function wxIcon(cond, size = 26) {
  const inner = WX_COND[cond] || WX_COND.cloud
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
}
