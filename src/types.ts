export type Lang = 'en' | 'zh-CN' | 'zh-TW'
export type LocalText = { en: string; zhCN: string; zhTW: string }
export type StatKey = 'str' | 'dex' | 'foc' | 'vit' | 'none'

export interface SkillTree {
  id: string
  name: LocalText
}

export interface ClassData {
  id: string
  name: LocalText
  description: LocalText
  accent: string
  monogram: string
  trees: SkillTree[]
}

export type ItemCategory = 'weapon' | 'armor' | 'trinket' | 'pet' | 'socketable'
