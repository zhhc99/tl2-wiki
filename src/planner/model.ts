import {
  type DbEquipment as PlannerEquipment,
  type DisplayEffect as PlannerEffect,
} from '../domain'
import { copy } from '../i18n'
import type { Lang, LocalText, StatKey } from '../types'

export type Stat = Exclude<StatKey, 'none'>

export type Slot =
  | 'main'
  | 'off'
  | 'helmet'
  | 'chest'
  | 'shoulders'
  | 'gloves'
  | 'belt'
  | 'pants'
  | 'boots'
  | 'amulet'
  | 'ring1'
  | 'ring2'

export type SocketLoadout = Partial<Record<Slot, (string | null)[]>>

export interface BuildState {
  classId: string
  level: number
  allocated: Record<Stat, number>
  loadout: Record<Slot, string | null>
  socketLoadout: SocketLoadout
}

export const classBases: Record<string, Record<Stat, number>> = {
  berserker: { str: 15, dex: 15, foc: 5, vit: 5 },
  outlander: { str: 10, dex: 15, foc: 10, vit: 5 },
  embermage: { str: 5, dex: 10, foc: 15, vit: 10 },
  engineer: { str: 15, dex: 5, foc: 5, vit: 15 },
}

const classUnits: Record<string, string[]> = {
  berserker: ['BERSERKER'],
  outlander: ['OUTLANDER', 'WANDERER'],
  embermage: ['EMBERMAGE', 'ARBITER'],
  engineer: ['ENGINEER', 'RAILMAN'],
}

export const classDamageReduction: Record<string, number> = {
  berserker: 25,
  outlander: 0,
  embermage: 0,
  engineer: 25,
}

export const statNames: Record<Stat, LocalText> = {
  str: { en: 'Strength', zhCN: '力量', zhTW: '力量' },
  dex: { en: 'Dexterity', zhCN: '敏捷', zhTW: '敏捷' },
  foc: { en: 'Focus', zhCN: '专注', zhTW: '專注' },
  vit: { en: 'Vitality', zhCN: '体力', zhTW: '體力' },
}

export const statEffectTypes: Record<string, Stat> = {
  'STRENGTH BONUS': 'str',
  'DEXTERITY BONUS': 'dex',
  MAGIC: 'foc',
  DEFENSE: 'vit',
}

export const twoHanded = new Set([
  'two_hand_axe',
  'two_hand_mace',
  'two_hand_sword',
  'polearm',
  'bow',
  'crossbow',
  'rifle',
  'cannon',
  'staff',
])

export const slots: Slot[] = [
  'main',
  'off',
  'helmet',
  'shoulders',
  'chest',
  'gloves',
  'belt',
  'pants',
  'boots',
  'amulet',
  'ring1',
  'ring2',
]

export const slotSubtype: Partial<Record<Slot, string>> = {
  helmet: 'helmet',
  chest: 'chest_armor',
  shoulders: 'shoulder_armor',
  gloves: 'gloves',
  belt: 'belt',
  pants: 'pants',
  boots: 'boots',
  amulet: 'amulet',
  ring1: 'ring',
  ring2: 'ring',
}

export const slotName = (slot: Slot, lang: Lang) => {
  const names: Record<Slot, [string, string, string]> = {
    main: ['主手', 'Main hand', '主手'],
    off: ['副手', 'Off hand', '副手'],
    helmet: ['头盔', 'Helmet', '頭盔'],
    chest: ['胸甲', 'Chest armor', '胸甲'],
    shoulders: ['肩甲', 'Shoulders', '肩甲'],
    gloves: ['手套', 'Gloves', '手套'],
    belt: ['腰带', 'Belt', '腰帶'],
    pants: ['腿甲', 'Pants', '腿甲'],
    boots: ['靴子', 'Boots', '靴子'],
    amulet: ['项链', 'Amulet', '項鍊'],
    ring1: ['戒指 1', 'Ring 1', '戒指 1'],
    ring2: ['戒指 2', 'Ring 2', '戒指 2'],
  }
  return copy(lang, ...names[slot])
}

export const emptyLoadout = () =>
  Object.fromEntries(slots.map((slot) => [slot, null])) as Record<Slot, string | null>

export const itemFitsSlot = (item: PlannerEquipment, slot: Slot) => {
  if (slot === 'main') return item.category === 'weapon'
  if (slot === 'off')
    return (item.category === 'weapon' || item.subtype === 'shield') && !twoHanded.has(item.subtype)
  return slotSubtype[slot] === item.subtype
}

export const chance = (value: number) => Math.min(50, value * (0.2002 - 0.0002 * value))

export const rangeTotal = (values: Record<string, [number, number]>): [number, number] => {
  const ranges = Object.values(values)
  return ranges.reduce((sum, value) => [sum[0] + value[0], sum[1] + value[1]], [0, 0] as [
    number,
    number,
  ])
}

export const isClassCompatible = (item: PlannerEquipment, classId: string) =>
  !item.classRequirement || classUnits[classId].includes(item.classRequirement.toUpperCase())

export const fixedEffectValue = (effect: PlannerEffect) =>
  effect.activation === 'PASSIVE' && effect.min != null && effect.min === effect.max
    ? effect.min
    : 0

export const socketTargetFor = (item: PlannerEquipment): 'weapon' | 'armor' =>
  item.category === 'weapon' ? 'weapon' : 'armor'

export const activeGemEffects = (gem: PlannerEquipment, item: PlannerEquipment) =>
  gem.effects.filter((effect) => effect.socketTargets?.includes(socketTargetFor(item)))

export const buildSocketCount = (item: PlannerEquipment) => {
  const rarityMinimum =
    item.rarity === 'rare'
      ? item.category === 'weapon'
        ? 4
        : 2
      : item.rarity === 'unique' || item.rarity === 'legendary'
        ? 2
        : 0
  return Math.max(rarityMinimum, item.sockets)
}
