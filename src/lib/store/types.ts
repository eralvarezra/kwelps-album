// Prices
export const PACK_PRICE = 5.00
export const SINGLE_PRICE = 2.00

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export type PullResult = {
  id: string
  url: string
  thumbnailUrl: string | null
  rarity: Rarity
  isNew: boolean
}

export type PackResult = {
  photos: PullResult[]
  totalCost: number
}

export type CollectionInfo = {
  id: string
  name: string
  totalPhotos: number
  rarityCount: Record<Rarity, number>
}

export type StoreInfo = {
  balance: number
  collections: CollectionInfo[]
  pity: {
    current: number
    remaining: number
    isGuaranteed: boolean
  } | null
  prices: {
    pack: number
    single: number
  }
}