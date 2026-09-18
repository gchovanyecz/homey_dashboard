/**
 * Állapot-színek (gomb-indikátor). Egy forrás a szerkesztőnek és a widgetnek is —
 * korábban a WidgetConfig (COLOR_OPTS) és a ButtonWidget (COLORS) külön listát
 * tartott, így elcsúszhattak egymástól.
 *
 * A kulcs kerül a konfigba (`state.color`), a hex csak megjelenítéshez kell.
 */
export const STATE_COLORS = [
  { value: 'green', label: 'Zöld', hex: '#5fd67f' },
  { value: 'teal', label: 'Teal', hex: '#37d3b0' },
  { value: 'blue', label: 'Kék', hex: '#4c8dff' },
  { value: 'amber', label: 'Borostyán', hex: '#ffb84d' },
  { value: 'red', label: 'Piros', hex: '#ff7a89' },
  { value: 'purple', label: 'Lila', hex: '#b39cff' },
  { value: 'grey', label: 'Szürke', hex: '#6c6c76' },
]

/**
 * Állapot-szín kulcsból hex. Ismeretlen kulcsnál a nyers értéket adja vissza,
 * hogy a kézzel beírt hex (pl. '#ff0000') is működjön; `fallback` a default.
 */
export function stateColor(key, fallback = null) {
  if (!key) return fallback
  return STATE_COLORS.find((c) => c.value === key)?.hex ?? key
}
