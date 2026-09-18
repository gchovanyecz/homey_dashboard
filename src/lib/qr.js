/* QR-kód rajzolás SVG-be (offline: a generátor a bundle része, nincs hálózati hívás).

   A kódolást a qrcode-generator végzi (MIT, függőség nélküli). A csomag
   alapértelmezett bájtosítója Latin-1 (charCode & 0xff), ami az ékezetes SSID-t
   és jelszót elrontaná — az UTF-8-as változatot viszont az `exports` mezője nem
   engedi külön behúzni, ezért magunk cseréljük ki a függvényt. */
import qrcode from 'qrcode-generator'

const utf8 = (s) =>
  typeof TextEncoder !== 'undefined'
    ? Array.from(new TextEncoder().encode(s))
    : // tartalék a régi WebView-khoz: kézi UTF-8 kódolás
      Array.from(unescape(encodeURIComponent(String(s))), (c) => c.charCodeAt(0))
qrcode.stringToBytes = utf8

/* A WIFI: sémában a  \ ; , : "  karaktereket visszaperjellel kell védeni,
   különben a telefon a mezőhatárnak nézné őket (pl. „pass;word"). */
const esc = (s) => String(s ?? '').replace(/([\\;,:"])/g, '\\$1')

/** Wi-Fi csatlakozás payload (a telefonok kamerája ezt ismeri fel). */
export function wifiPayload({ ssid = '', password = '', security = 'WPA', hidden = false } = {}) {
  const type = security === 'none' ? 'nopass' : security
  const pass = security === 'none' ? '' : `P:${esc(password)};`
  return `WIFI:T:${type};S:${esc(ssid)};${pass}${hidden ? 'H:true;' : ''};`
}

/** A widget tartalma → QR-szöveg (Wi-Fi payload vagy szabad szöveg/URL). */
export function qrTextOf(w) {
  return (w?.mode ?? 'wifi') === 'wifi' ? wifiPayload(w?.wifi ?? {}) : String(w?.text ?? '')
}

/** QR-mátrix → SVG. A sötét modulokat SORONKÉNTI FUTAMOKKÉNT rajzoljuk (egy
    path, kevés csomóponttal) — a panel régi WebView-jában ez mérhetően gyorsabb,
    mint modulonként egy-egy <rect>. */
export function qrSVG(text, { size = 320, margin = 2, ecc = 'M', dark = '#0b0b0f', light = '#fff' } = {}) {
  const q = qrcode(0, ecc) // 0 = a verziót a tartalom hossza dönti el
  q.addData(String(text ?? ''))
  q.make()
  const n = q.getModuleCount()
  const total = n + margin * 2
  let d = ''
  for (let r = 0; r < n; r++) {
    let c = 0
    while (c < n) {
      if (!q.isDark(r, c)) {
        c++
        continue
      }
      let len = 1
      while (c + len < n && q.isDark(r, c + len)) len++
      d += `M${c + margin} ${r + margin}h${len}v1h-${len}z`
      c += len
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="QR-kód">` +
    `<rect width="${total}" height="${total}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`
  )
}
