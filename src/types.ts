export type Lang = 'en' | 'zh'
export type LocalText = { en: string; zh: string }
export type StatKey = 'str' | 'dex' | 'foc' | 'vit' | 'none'

export interface Skill {
  id: string
  name: LocalText
  level: number
  kind: 'active' | 'passive'
  summary: LocalText
}

export interface SkillTree {
  id: string
  name: LocalText
  skills: Skill[]
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

export interface PhaseChallenge {
  name: LocalText
  detail: LocalText
  reward: LocalText
}

export interface PhaseBeast {
  id: string
  region: LocalText
  act: number
  challenges: PhaseChallenge[]
}
