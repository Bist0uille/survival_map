import { describe, it, expect } from 'vitest'
import { categoryForTags, getCategory, CUSTOM_CATEGORY } from './categories'

describe('categoryForTags', () => {
  it('classe une fontaine en « eau »', () => {
    expect(categoryForTags({ amenity: 'drinking_water' })?.id).toBe('water')
    expect(categoryForTags({ amenity: 'fountain' })?.id).toBe('water')
  })

  it('classe un sommet en « peak »', () => {
    expect(categoryForTags({ natural: 'peak' })?.id).toBe('peak')
  })

  it('reconnaît les deux variantes de refuge', () => {
    expect(categoryForTags({ tourism: 'alpine_hut' })?.id).toBe('refuge')
    expect(categoryForTags({ tourism: 'wilderness_hut' })?.id).toBe('refuge')
  })

  it('renvoie null pour des tags inconnus', () => {
    expect(categoryForTags({ amenity: 'bank' })).toBeNull()
    expect(categoryForTags({})).toBeNull()
  })

  it('ignore une valeur de tag qui ne correspond pas', () => {
    expect(categoryForTags({ natural: 'tree' })).toBeNull()
  })
})

describe('getCategory', () => {
  it('retrouve une catégorie connue par id', () => {
    expect(getCategory('water').label).toBe('Eau')
  })

  it('retombe sur la catégorie perso pour un id inconnu', () => {
    expect(getCategory('inexistant')).toBe(CUSTOM_CATEGORY)
  })
})
