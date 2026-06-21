// Mini bus de notifications « toast » : permet d'émettre un message depuis
// n'importe où (hooks, data, composants feuilles) sans threader des props.
// Le composant <ToastHost /> écoute l'événement et affiche les messages.

export type ToastKind = 'info' | 'error' | 'success'

export interface ToastDetail {
  text: string
  kind: ToastKind
}

export const TOAST_EVENT = 'survival-toast'

/** Émet un toast. `kind` pilote la couleur (info / error / success). */
export function toast(text: string, kind: ToastKind = 'info'): void {
  window.dispatchEvent(
    new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { text, kind } }),
  )
}
