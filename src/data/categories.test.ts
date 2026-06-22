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

  it('range téléphone/prises publiques en « prises »', () => {
    expect(categoryForTags({ amenity: 'device_charging_station' })?.id).toBe('power')
    expect(categoryForTags({ power: 'outlet' })?.id).toBe('power')
  })

  it('garde une borne de recharge vélo mais exclut le pur-voiture', () => {
    expect(categoryForTags({ amenity: 'charging_station', bicycle: 'yes' })?.id).toBe('power')
    expect(
      categoryForTags({ amenity: 'charging_station', bicycle: 'designated' })?.id,
    ).toBe('power')
    expect(categoryForTags({ amenity: 'charging_station' })).toBeNull()
    expect(categoryForTags({ amenity: 'charging_station', motorcar: 'yes' })).toBeNull()
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
