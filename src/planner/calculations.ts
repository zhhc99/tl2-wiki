import {
  allText,
  ngLabel,
  type DbEquipment as PlannerEquipment,
  type DisplayEffect as PlannerEffect,
} from '../domain'
import { pick } from '../i18n'
import type { Lang } from '../types'
import {
  activeGemEffects,
  chance,
  classBases,
  classDamageReduction,
  fixedEffectValue,
  isClassCompatible,
  itemFitsSlot,
  rangeTotal,
  slots,
  statEffectTypes,
  statNames,
  buildSocketCount,
  type Slot,
  type SocketLoadout,
  type Stat,
} from './model'

export interface EquippedRow {
  slot: Slot
  item: PlannerEquipment
}

export interface ActiveSocketRow {
  slot: Slot
  index: number
  item: PlannerEquipment
  gem: PlannerEquipment
  effects: PlannerEffect[]
}

export interface RequirementRow {
  slot: Slot
  item: PlannerEquipment
  ok: boolean
  classOk: boolean
  levelOk: boolean
  statsOk: boolean
}

export interface EffectSummary {
  key: string
  label: string
  count: number
  aggregated: boolean
}

export interface PlannerSnapshot {
  equipped: EquippedRow[]
  activeSocketRows: ActiveSocketRow[]
  effectSummary: EffectSummary[]
  gearStats: Record<Stat, number>
  stats: Record<Stat, number>
  spent: number
  available: number
  armor: [number, number]
  damage: [number, number]
  weaponDamageBonus: number
  armorBonus: number
  criticalChance: number
  criticalDamage: number
  addedHealth: number
  addedHealthPercent: number
  dodgeChance: number
  addedMana: number
  addedManaPercent: number
  focusDamageBonus: number
  blockChance: number | null
  executeChance: number
  allDamage: number
  allDamageReduction: number
  requirements: RequirementRow[]
  requirementsBySlot: Map<Slot, RequirementRow>
}

export interface PreviewRequirement {
  stat: Stat
  value: number
  ok: boolean
}

export interface PreviewSocket {
  index: number
  gem: PlannerEquipment | null
  effects: PlannerEffect[]
}

export interface PreviewSnapshot {
  damage: [number, number]
  armor: [number, number]
  requirements: PreviewRequirement[]
  sockets: PreviewSocket[]
}

const numberToken = /[+-]?(?:\d+(?:\.\d+)?|\.\d+)/g
const nonStackingEffect = /^(?:ADD TRIGGERABLE|CAST SKILL(?:\s|$)|MISSILE REFLECT$)/

interface NumberTemplate {
  before: string
  after: string
  factor: number
  explicitPlus: boolean
}

interface NumberTemplates {
  en: NumberTemplate
  zhCN: NumberTemplate
  zhTW: NumberTemplate
}

const numberTemplate = (text: string, value: number): NumberTemplate | null => {
  const matches = [...text.matchAll(numberToken)]
  if (matches.length !== 1 || value === 0) return null
  const match = matches[0]
  const rendered = Number(match[0])
  if (!Number.isFinite(rendered) || Math.abs(Math.abs(rendered) - Math.abs(value)) > 1e-4)
    return null
  const start = match.index as number
  return {
    before: text.slice(0, start),
    after: text.slice(start + match[0].length),
    factor: rendered / value,
    explicitPlus: match[0].startsWith('+'),
  }
}

const localTemplates = (effect: PlannerEffect) =>
  effect.text && effect.min != null
    ? {
        en: numberTemplate(effect.text.en, effect.min),
        zhCN: numberTemplate(effect.text.zhCN, effect.min),
        zhTW: numberTemplate(effect.text.zhTW, effect.min),
      }
    : null

const formatEffectValue = (value: number, explicitPlus: boolean) => {
  const rounded = Number(value.toFixed(4))
  return `${explicitPlus && rounded > 0 ? '+' : ''}${rounded}`
}

const summarizeEffects = (effects: PlannerEffect[], lang: Lang): EffectSummary[] => {
  type StackableRow = { key: string; templates: NumberTemplates; total: number; count: number }
  type RepeatedRow = { key: string; label: string; count: number }
  const rows = new Map<string, StackableRow | RepeatedRow>()
  effects.forEach((effect) => {
    const value = fixedEffectValue(effect)
    const templates =
      effect.activation === 'PASSIVE' && !nonStackingEffect.test(effect.type)
        ? localTemplates(effect)
        : null
    if (value && templates?.en && templates.zhCN && templates.zhTW) {
      const templateKey = JSON.stringify([
        effect.type,
        effect.damageType,
        templates.en,
        templates.zhCN,
        templates.zhTW,
      ])
      const key = `sum:${templateKey}`
      const current = rows.get(key) as StackableRow | undefined
      if (current) {
        current.total += value
        current.count += 1
      } else
        rows.set(key, {
          key,
          templates: { en: templates.en, zhCN: templates.zhCN, zhTW: templates.zhTW },
          total: value,
          count: 1,
        })
      return
    }
    const rawValue =
      effect.min == null && effect.max == null
        ? ''
        : effect.min === effect.max
          ? `${effect.min}`
          : `${effect.min}–${effect.max}`
    const label = effect.text
      ? pick(effect.text, lang)
      : `${effect.type.toLowerCase()}${rawValue ? ` ${rawValue}` : ''}`
    const key = `raw:${label}`
    const current = rows.get(key) as RepeatedRow | undefined
    if (current) current.count += 1
    else rows.set(key, { key, label, count: 1 })
  })
  return [...rows.values()].map((row) => {
    if ('templates' in row) {
      const template =
        lang === 'en'
          ? row.templates.en
          : lang === 'zh-TW'
            ? row.templates.zhTW
            : row.templates.zhCN
      const rendered = row.total * template.factor
      return {
        key: row.key,
        label: `${template.before}${formatEffectValue(rendered, template.explicitPlus)}${template.after}`,
        count: row.count,
        aggregated: row.count > 1,
      }
    }
    return { ...row, aggregated: false }
  })
}

const sumEffectStats = (effects: PlannerEffect[]) =>
  effects.reduce(
    (total, effect) => {
      const stat = statEffectTypes[effect.type]
      if (stat) total[stat] += fixedEffectValue(effect)
      return total
    },
    { str: 0, dex: 0, foc: 0, vit: 0 } as Record<Stat, number>,
  )

export function calculatePlannerSnapshot(args: {
  classId: string
  level: number
  allocated: Record<Stat, number>
  loadout: Record<Slot, string | null>
  socketLoadout: SocketLoadout
  byId: Map<string, PlannerEquipment>
  lang: Lang
}): PlannerSnapshot {
  const { classId, level, allocated, loadout, socketLoadout, byId, lang } = args
  const equipped = slotsFromLoadout(loadout, byId)
  const setCounts = equipped.reduce((map, { item }) => {
    if (item.set && item.setInternalName)
      map.set(item.setInternalName, (map.get(item.setInternalName) || 0) + 1)
    return map
  }, new Map<string, number>())
  const activeSetEffects = [...setCounts.entries()].flatMap(([setId, count]) => {
    const representative = equipped.find((row) => row.item.setInternalName === setId)?.item
    return (representative?.setBonuses || []).filter((effect) => effect.pieces <= count)
  })
  const activeSocketRows = equipped.flatMap(({ slot, item }) =>
    (socketLoadout[slot] || []).slice(0, buildSocketCount(item)).flatMap((gemId, index) => {
      const gem = gemId ? byId.get(gemId) : null
      if (!gem || gem.category !== 'socketable') return []
      const effects = activeGemEffects(gem, item)
      return effects.length ? [{ slot, index, item, gem, effects }] : []
    }),
  )
  const equipmentEffects = [
    ...equipped.flatMap((row) => row.item.effects),
    ...activeSetEffects,
    ...activeSocketRows.flatMap((row) => row.effects),
  ]
  const effectSummary = summarizeEffects(equipmentEffects, lang)
  const gearStats = sumEffectStats(equipmentEffects)
  const stats = Object.fromEntries(
    (Object.keys(statNames) as Stat[]).map((stat) => [
      stat,
      classBases[classId][stat] + allocated[stat] + gearStats[stat],
    ]),
  ) as Record<Stat, number>
  const spent = Object.values(allocated).reduce((sum, value) => sum + value, 0)
  const available = (level - 1) * 5
  const armor = equipped.reduce<[number, number]>(
    (sum, { item }) => {
      const value = rangeTotal(item.armor)
      return [sum[0] + value[0], sum[1] + value[1]]
    },
    [0, 0],
  )
  const weaponRows = equipped.filter(
    ({ slot, item }) => (slot === 'main' || slot === 'off') && item.category === 'weapon',
  )
  const damage = weaponRows.reduce<[number, number]>(
    (sum, { item }) => {
      const value = rangeTotal(item.damage)
      return [sum[0] + value[0], sum[1] + value[1]]
    },
    [0, 0],
  )
  const shield = equipped.find(
    ({ slot, item }) => slot === 'off' && item.subtype === 'shield',
  )?.item
  const sumEffects = (type: string, damageType?: string) =>
    equipmentEffects.reduce(
      (sum, effect) =>
        sum +
        (effect.type === type && (!damageType || effect.damageType === damageType)
          ? fixedEffectValue(effect)
          : 0),
      0,
    )
  const mainWeapon = equipped.find(
    ({ slot, item }) => slot === 'main' && item.category === 'weapon',
  )?.item
  const weaponEffectType =
    mainWeapon && ['wand', 'staff'].includes(mainWeapon.subtype)
      ? 'PERCENT MAGIC ITEM DAMAGE BONUS'
      : mainWeapon && ['bow', 'crossbow', 'pistol', 'rifle', 'cannon'].includes(mainWeapon.subtype)
        ? 'PERCENT RANGEDDAMAGE'
        : 'PERCENT MELEEDAMAGE'
  const weaponDamageBonus = stats.str * 0.5 + sumEffects(weaponEffectType)
  const armorBonus = stats.vit * 0.25 + sumEffects('PERCENT ARMOR BONUS')
  const criticalChance = Math.min(100, chance(stats.dex) + sumEffects('CRITICAL CHANCE'))
  const criticalDamage = stats.str * 0.4 + sumEffects('PERCENT CRITICAL DAMAGE')
  const addedHealth = stats.vit * 3.6 + sumEffects('MAX HP')
  const addedHealthPercent = sumEffects('PERCENT HP')
  const dodgeChance = Math.min(75, chance(stats.dex) + sumEffects('DODGE CHANCE BONUS'))
  const addedMana = stats.foc * 0.5 + sumEffects('MAX MANA')
  const addedManaPercent = sumEffects('PERCENT MANA')
  const focusDamageBonus = stats.foc * 0.5
  const blockChance = shield
    ? Math.min(
        75,
        (shield.blockChance || 0) + chance(stats.vit) + sumEffects('PERCENT BLOCK CHANCE BASE'),
      )
    : null
  const executeChance = Math.min(
    100,
    chance(stats.foc) + sumEffects('PERCENT DUAL WIELDING ATTACK'),
  )
  const allDamage = sumEffects('PERCENT DAMAGE BONUS', 'ALL')
  const allDamageReduction =
    classDamageReduction[classId] - sumEffects('PERCENT DAMAGE TAKEN', 'ALL')
  const requirements = equipped.map(({ slot, item }) => {
    const classOk = isClassCompatible(item, classId)
    const ownEffects = [
      ...item.effects,
      ...activeSocketRows.filter((row) => row.slot === slot).flatMap((row) => row.effects),
    ]
    const ownStats = sumEffectStats(ownEffects)
    const statsOk =
      item.requirements.length > 0 &&
      item.requirements.every(
        (requirement) => stats[requirement.stat] - ownStats[requirement.stat] >= requirement.value,
      )
    return {
      slot,
      item,
      ok: classOk && (level >= item.requiredLevel || statsOk),
      classOk,
      levelOk: level >= item.requiredLevel,
      statsOk,
    }
  })
  return {
    equipped,
    activeSocketRows,
    effectSummary,
    gearStats,
    stats,
    spent,
    available,
    armor,
    damage,
    weaponDamageBonus,
    armorBonus,
    criticalChance,
    criticalDamage,
    addedHealth,
    addedHealthPercent,
    dodgeChance,
    addedMana,
    addedManaPercent,
    focusDamageBonus,
    blockChance,
    executeChance,
    allDamage,
    allDamageReduction,
    requirements,
    requirementsBySlot: new Map(requirements.map((row) => [row.slot, row])),
  }
}

const slotsFromLoadout = (
  loadout: Record<Slot, string | null>,
  byId: Map<string, PlannerEquipment>,
) =>
  slots
    .map((slot) => ({ slot, item: loadout[slot] ? byId.get(loadout[slot] as string) : undefined }))
    .filter((row) => row.item) as EquippedRow[]

export function calculatePreviewSnapshot(args: {
  preview: EquippedRow
  candidate: boolean
  socketLoadout: SocketLoadout
  byId: Map<string, PlannerEquipment>
  planner: PlannerSnapshot
}): PreviewSnapshot {
  const { preview, candidate, socketLoadout, byId, planner } = args
  const damage = rangeTotal(preview.item.damage)
  const armor = rangeTotal(preview.item.armor)
  const slotItem = planner.equipped.find((row) => row.slot === preview.slot)?.item || null
  const slotEffects = slotItem
    ? [
        ...slotItem.effects,
        ...planner.activeSocketRows
          .filter((row) => row.slot === preview.slot)
          .flatMap((row) => row.effects),
      ]
    : []
  const slotStats = sumEffectStats(slotEffects)
  const requirements = preview.item.requirements.map((requirement) => ({
    ...requirement,
    ok: planner.stats[requirement.stat] - slotStats[requirement.stat] >= requirement.value,
  }))
  const sockets = !candidate
    ? Array.from({ length: buildSocketCount(preview.item) }, (_, index) => {
        const gemId = socketLoadout[preview.slot]?.[index]
        const gem = gemId ? byId.get(gemId) || null : null
        return { index, gem, effects: gem ? activeGemEffects(gem, preview.item) : [] }
      })
    : []
  return { damage, armor, requirements, sockets }
}

export function filterEquipmentForSlot(args: {
  items: PlannerEquipment[]
  slot: Slot
  query: string
  classId: string
}): PlannerEquipment[] {
  const { items, slot, query, classId } = args
  const needle = query.trim().toLowerCase()
  return items
    .filter((item) => {
      if (item.category === 'pet' || item.category === 'socketable' || !itemFitsSlot(item, slot))
        return false
      if (!isClassCompatible(item, classId)) return false
      return (
        !needle ||
        `${allText(item.name)} ${ngLabel(item.ngTier) || ''} ${item.set ? allText(item.set) : ''} ${item.effects.map((effect) => (effect.text ? allText(effect.text) : '')).join(' ')}`
          .toLowerCase()
          .includes(needle)
      )
    })
    .sort((a, b) => b.level - a.level || a.name.en.localeCompare(b.name.en))
    .slice(0, 120)
}

export function filterGemsForItem(args: {
  items: PlannerEquipment[]
  item: PlannerEquipment
  query: string
}): PlannerEquipment[] {
  const { items, item, query } = args
  const needle = query.trim().toLowerCase()
  return items
    .filter(
      (candidate) =>
        candidate.category === 'socketable' &&
        activeGemEffects(candidate, item).length > 0 &&
        (!needle ||
          `${allText(candidate.name)} ${candidate.effects.map((effect) => (effect.text ? allText(effect.text) : '')).join(' ')}`
            .toLowerCase()
            .includes(needle)),
    )
    .sort((a, b) => b.level - a.level || a.name.en.localeCompare(b.name.en))
    .slice(0, 160)
}
