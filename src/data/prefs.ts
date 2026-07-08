/**
 * Préférences UI légères en localStorage : lecture SYNCHRONE avant le premier
 * rendu (pas de flash), contrairement à Dexie (async), qui reste la référence
 * pour les données (points, itinéraires, tuiles). try/catch : localStorage
 * peut lever en navigation privée (Safari) ou si le quota est plein.
 */
export const WELCOME_SEEN = 'survimap:welcome-seen'

export function getPref(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function setPref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Silencieux : au pire la préférence n'est pas retenue.
  }
}
