/**
 * Globális gesztus-állapot — a Pager írja, a vezérlő-widgetek olvassák.
 *
 * SZÁNDÉKOSAN nem Svelte store: a widgetek pointer-event handler közben, szinkron
 * olvassák (a reaktivitás sorrendje itt csak hibalehetőség lenne).
 *   touches: aktív ÉRINTÉS-pointerek száma (egér/pen nem számol bele)
 *   paging : fut-e épp lapozás (a Pager elvette a pointer-capture-t)
 *   epoch  : minden kétujjas gesztus INDULÁSAKOR nő. A vezérlők a lenyomáskori értéket
 *            eltárolják, és ha később eltér, tudják: közben kétujjas gesztus kezdődött,
 *            tehát a húzásuk érvénytelen — akkor is, ha közben egyetlen move sem érkezett.
 */
export const gesture = { touches: 0, paging: false, epoch: 0 }

/**
 * Attribútum-konvenció a lapozó kivételeihez:
 *   [data-drag]    — az EGYUJJAS húzás a vezérlőé (csúszka-sávok), két ujjal viszont lapozunk
 *   [data-noswipe] — modál/overlay: itt SEMMILYEN ujjszámmal nem lapozunk
 */
export const DRAG_SEL = '[data-drag]'
export const MODAL_SEL = '[data-noswipe]'
