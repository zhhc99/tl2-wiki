export type Lang = 'en' | 'zh'
export type LocalText = { en: string; zh: string }
export type StatKey = 'str' | 'dex' | 'foc' | 'vit' | 'none'
export type TriggerKey = 'full' | 'partial' | 'none' | 'passive'

export interface Skill {
  id: string
  name: LocalText
  level: number
  kind: 'active' | 'passive'
  summary: LocalText
  scaling: StatKey[]
  trigger: TriggerKey
  mechanism: LocalText
}

export interface SkillTree {
  id: string
  name: LocalText
  description: LocalText
  skills: Skill[]
}

export interface ClassData {
  id: string
  name: LocalText
  epithet: LocalText
  role: LocalText
  description: LocalText
  resource: LocalText
  resourceDetail: LocalText
  accent: string
  monogram: string
  recommended: StatKey[]
  trees: SkillTree[]
}

export type ItemCategory = 'weapon' | 'armor' | 'trinket' | 'pet' | 'socketable'
export interface PhaseBeast {
  id: string
  name: LocalText
  region: LocalText
  act: number
  environment: LocalText
  description: LocalText
  challenge: LocalText
  reward: LocalText
  mark: string
}
