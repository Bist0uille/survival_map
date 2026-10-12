import { CATEGORIES } from './categories'

/** Guide links select existing categories, without requesting location. */
export function mapEntry(search: string) {
  const params = new URLSearchParams(search)
  const allowed = new Set(CATEGORIES.map((category) => category.id))
  const active = new Set((params.get('filters') ?? '').split(',').filter((id) => allowed.has(id)))
  return { active, trails: params.get('trails') === '1', protected: params.get('protected') === '1' }
}
