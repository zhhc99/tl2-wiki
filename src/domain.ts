import type { ItemCategory, LocalText, StatKey } from './types'

export type Rarity = 'normal' | 'rare' | 'unique' | 'legendary'
export type SkillKind = 'active' | 'passive'
export type SkillMetricKind = 'weaponDamagePct' | 'chargeScalePct' | 'manaCost' | 'manaPerSecond' | 'maxTargets' | 'projectiles'

export interface RawEffect {
  type: string
  name: string
  activation: string
  damageType: string
  duration: number | null
  chance: number | null
  min: number | null
  max: number | null
  useOwnerLevel: boolean
  template?: LocalText | null
  displayName?: LocalText | null
  values?: Record<string, number | null>
  precision?: number
  precisionMax?: number | null
  scalingGraph?: string | null
  text?: LocalText | null
  renderStatus?: string
  valueSemantic?: string
  roundingMode?: string
  socketTargets?: ('weapon' | 'armor')[]
}

export interface DbRawSetBonus extends RawEffect { pieces: number }

export interface DbEquipment {
  id: string
  slug: string
  name: LocalText
  internalName: string
  category: ItemCategory
  subtype: string
  unitType: string
  rarity: Rarity
  rarityValue: number | null
  level: number
  requiredLevel: number
  requirements: { stat: Exclude<StatKey, 'none'>; value: number }[]
  sockets: number
  speed: number | null
  damagePerSecond: [number, number] | null
  set: LocalText | null
  description: LocalText | null
  iconPath: string | null
  setInternalName: string | null
  maxSockets: number | null
  blockChance: number | null
  minimumDropLevel: number | null
  maximumDropLevel: number | null
  classRequirement: string | null
  armor: Record<string, [number, number]>
  damage: Record<string, [number, number]>
  effects: RawEffect[]
  rawSetBonuses: DbRawSetBonus[]
  ngTier: number
  ngVariantOf: string | null
  panelFormulaVersion: string
  sourceFile: string
}

export interface DbSpellBook {
  id: string
  name: LocalText
  family: LocalText
  tier: number
  school: 'offense' | 'defense' | 'summon' | 'utility'
  level: number
  requiredLevel: number
  description: LocalText
  iconPath: string | null
  sourceFile: string
  unobtainable?: true
}

export interface DbSkillRank {
  rank: number
  requiredLevel: number
  metrics: { kind: SkillMetricKind; value: number; scalingGraph?: string | null }[]
  effects: RawEffect[]
}

export interface DbClassSkill {
  id: string
  slug: string
  name: LocalText
  description: LocalText
  requirement: LocalText | null
  level: number
  kind: SkillKind
  maxRank: number
  iconPath: string | null
  cooldownMs: number | null
  range: number | null
  tiers: { rank: number; text: LocalText }[]
  ranks: DbSkillRank[]
}

export interface DbClassGroup {
  classId: string
  trees: { treeId: string; skills: DbClassSkill[] }[]
}

export interface DbPhaseChallenge { id: string; name: LocalText }
export interface DbPhaseBeast { id: string; act: number; region: LocalText; challenges: DbPhaseChallenge[] }

export interface DbMeta {
  schemaVersion: number
  sourceFingerprint: string
  counts: {
    equipment: number
    ngVariantGroups: number
    ngVariantRecords: number
    itemEffects: number
    spellBooks: number
    localizedSpellBooks: number
    classSkills: number
    skillRanks: number
    phaseChallenges: number
    icons: number
  }
  gaps: Record<string, number>
}

export type SkillGraphs = Record<string, [number, number][]>

export interface SiteData {
  equipment: DbEquipment[]
  spellBooks: DbSpellBook[]
  classSkills: DbClassGroup[]
  skillGraphs: SkillGraphs
  phaseBeasts: DbPhaseBeast[]
  meta: DbMeta
}

export const asset = (path: string | null) => path ? `${import.meta.env.BASE_URL}${path}` : ''
export const allText = (value: LocalText) => `${value.en} ${value.zhCN} ${value.zhTW}`
export const ngLabel = (tier: number) => tier === 1 ? 'NG+' : tier > 1 ? `NG+${tier}` : null
