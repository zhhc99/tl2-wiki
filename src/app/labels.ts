import { type DbClass, type Rarity } from '../domain'
import { pick } from '../i18n'
import type { Lang, LocalText } from '../types'

export const localText = (en: string, zhCN: string, zhTW = zhCN): LocalText => ({
  en,
  zhCN,
  zhTW,
})

export const titleCase = (value: string) =>
  value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())

const subtypeNames: Record<string, LocalText> = {
  axe: localText('Axe', '斧', '斧'),
  bow: localText('Bow', '弓', '弓'),
  cannon: localText('Cannon', '加农炮', '加農炮'),
  crossbow: localText('Crossbow', '弩', '弩'),
  fist: localText('Claw', '拳套', '拳套'),
  mace: localText('Mace', '单手锤', '單手錘'),
  pistol: localText('Pistol', '手枪', '手槍'),
  polearm: localText('Polearm', '长柄武器', '長柄武器'),
  rifle: localText('Shotgonne', '霰弹枪', '霰彈槍'),
  staff: localText('Staff', '法杖', '法杖'),
  sword: localText('Sword', '剑', '劍'),
  two_hand_axe: localText('Two-hand axe', '双手斧', '雙手斧'),
  two_hand_mace: localText('Two-hand mace', '双手锤', '雙手錘'),
  two_hand_sword: localText('Two-hand sword', '双手剑', '雙手劍'),
  wand: localText('Wand', '魔杖', '魔杖'),
  boots: localText('Boots', '靴子', '靴子'),
  chest_armor: localText('Chest armor', '胸甲', '胸甲'),
  gloves: localText('Gloves', '手套', '手套'),
  helmet: localText('Helmet', '头盔', '頭盔'),
  pants: localText('Pants', '腿甲', '腿甲'),
  shield: localText('Shield', '盾牌', '盾牌'),
  shoulder_armor: localText('Shoulder armor', '肩甲', '肩甲'),
  amulet: localText('Amulet', '项链', '項鍊'),
  belt: localText('Belt', '腰带', '腰帶'),
  ring: localText('Ring', '戒指', '戒指'),
  collar: localText('Pet collar', '宠物项圈', '寵物項圈'),
  tag: localText('Pet tag', '宠物饰牌', '寵物飾牌'),
  gem_or_socketable: localText('Socketable', '镶嵌物', '鑲嵌物'),
}

export const subtypeName = (subtype: string, lang: Lang) =>
  subtypeNames[subtype]
    ? pick(subtypeNames[subtype], lang)
    : titleCase(subtype.replaceAll('_', ' '))

export function rarityName(rarity: Rarity, lang: Lang): string {
  const names: Record<Rarity, LocalText> = {
    rare: localText('Rare', '稀有', '稀有'),
    unique: localText('Unique', '独特', '獨特'),
    legendary: localText('Legendary', '传奇', '傳奇'),
  }
  return pick(names[rarity], lang)
}

export const classRequirementName = (requirement: string, classes: DbClass[], lang: Lang) => {
  const aliases: Record<string, string> = {
    wanderer: 'outlander',
    arbiter: 'embermage',
    railman: 'engineer',
  }
  const id = aliases[requirement.toLowerCase()] || requirement.toLowerCase()
  return pick(classes.find((hero) => hero.id === id)!.name, lang)
}
