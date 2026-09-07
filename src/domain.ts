import type { ItemCategory, LocalText, StatKey } from './types'

export type Rarity = 'rare' | 'unique' | 'legendary'
export type SkillKind = 'active' | 'passive'
export type SkillMetricKind =
  | 'weaponDamagePct'
  | 'chargeScalePct'
  | 'manaCost'
  | 'manaPerSecond'
  | 'maxTargets'
  | 'projectiles'

export interface DisplayEffect {
  type: string
  name: string
  activation: string
  damageType: string
  duration: number | null
  min: number | null
  max: number | null
  text?: LocalText
  template?: LocalText
  displayName?: LocalText | null
  values?: Record<string, number | null>
  precision?: number
  scalingGraph?: string | null
  socketTargets?: ('weapon' | 'armor')[]
}

export interface SetBonus extends DisplayEffect {
  pieces: number
}

export interface DbEquipment {
  id: string
  name: LocalText
  category: ItemCategory
  subtype: string
  rarity: Rarity
  rarityValue: number | null
  value: number
  level: number
  requiredLevel: number
  requirements: { stat: Exclude<StatKey, 'none'>; value: number }[]
  sockets: number
  speed: number | null
  damagePerSecond: [number, number] | null
  blockChance: number | null
  minimumDropLevel: number | null
  maximumDropLevel: number | null
  classRequirement: string | null
  set: LocalText | null
  setInternalName: string | null
  description: LocalText | null
  iconPath: string | null
  armor: Record<string, [number, number]>
  damage: Record<string, [number, number]>
  effects: DisplayEffect[]
  setBonuses: SetBonus[]
  ngTier: number
  ngVariantOf: string | null
}

export interface DbSpellBook {
  id: string
  name: LocalText
  family: LocalText
  tier: number
  level: number
  requiredLevel: number
  description: LocalText
  iconPath: string | null
}

export interface DbClassSkillTree {
  id: number
  index: number
  name: LocalText
}

export interface DbClass {
  id: string
  name: LocalText
  description: LocalText
  trees: DbClassSkillTree[]
}

export interface DbSkillRank {
  rank: number
  requiredLevel: number
  description: LocalText | null
  metrics: { kind: SkillMetricKind; value: number; scalingGraph: string | null }[]
  effects: DisplayEffect[]
}

export interface DbClassSkill {
  id: string
  classId: string
  treeId: number
  position: number
  name: LocalText
  description: LocalText
  requirement: LocalText | null
  level: number
  kind: SkillKind
  maxRank: number
  iconPath: string | null
  tiers: { rank: number; text: LocalText }[]
  ranks: DbSkillRank[]
}

export interface DbPhaseChallenge {
  id: string
  name: LocalText
}
export interface DbPhaseBeast {
  id: string
  act: number
  region: LocalText
  challenges: DbPhaseChallenge[]
  undocumented: number
}

export interface DbMeta {
  version: number
  counts: {
    equipment: number
    itemEffects: number
    spellBooks: number
    classes: number
    skillTrees: number
    classSkills: number
    skillRanks: number
    phaseRooms: number
    phaseChallenges: number
  }
}

export interface SkillGraph {
  inferPastEnd: boolean
  points: [number, number][]
}
export type SkillGraphs = Record<string, SkillGraph>

export interface SiteData {
  equipment: DbEquipment[]
  spellBooks: DbSpellBook[]
  classes: DbClass[]
  classSkills: DbClassSkill[]
  skillGraphs: SkillGraphs
  phaseBeasts: DbPhaseBeast[]
  meta: DbMeta
}

export const asset = (path: string | null) => (path ? `${import.meta.env.BASE_URL}${path}` : '')
export const allText = (value: LocalText) => `${value.en} ${value.zhCN} ${value.zhTW}`
export const ngLabel = (tier: number) => (tier === 1 ? 'NG+' : tier > 1 ? `NG+${tier}` : null)
