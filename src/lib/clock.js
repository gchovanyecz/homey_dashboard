import { readable } from 'svelte/store'
import { dayKey } from './mohu.js'

function hhmm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Élő óra — percenként (15 mp-enként) frissül.
export const clock = readable(hhmm(new Date()), (set) => {
  const tick = () => set(hhmm(new Date()))
  tick()
  const id = setInterval(tick, 15000)
  return () => clearInterval(id)
})

/* Mai nap (YYYY-MM-DD). A panel napokig fut, ezért az „ma / holnap / N nap"
   típusú levezetéseknek éjfélkor maguktól át kell fordulniuk — ez a store csak
   NAPVÁLTÁSKOR értesít, tehát nem okoz fölösleges újrarajzolást. */
export const today = readable(dayKey(), (set) => {
  let cur = dayKey()
  const id = setInterval(() => {
    const k = dayKey()
    if (k !== cur) set((cur = k))
  }, 60000)
  return () => clearInterval(id)
})
